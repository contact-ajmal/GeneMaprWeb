"""
Admin API endpoints for user management and role management.
Only accessible to users with the 'admin' role.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_current_user, get_admin_user
from app.models.user import User
from app.models.custom_role import CustomRole
from app.schemas.auth import UserResponse
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserUpdate,
    UserListResponse,
    RolePermissions,
    RoleCreate,
    RoleResponse,
    Permission,
    ROLE_PERMISSIONS,
    PERMISSION_MAP,
    ALL_PERMISSIONS,
)
from app.services.auth_service import hash_password

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)],
)


# ═══════════════════════════════════════════════════════
# USER MANAGEMENT
# ═══════════════════════════════════════════════════════

@router.get("/users", response_model=UserListResponse)
async def list_users(
    search: str | None = Query(None, description="Search by name or email"),
    role: str | None = Query(None, description="Filter by role"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all users with optional filtering and pagination."""
    query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        pattern = f"%{search}%"
        filter_cond = User.full_name.ilike(pattern) | User.email.ilike(pattern)
        query = query.where(filter_cond)
        count_query = count_query.where(filter_cond)

    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user with admin-specified role."""
    # Validate email uniqueness
    result = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Validate role exists (system or custom)
    system_roles = {"admin", "researcher", "viewer"}
    if data.role not in system_roles:
        custom = await db.execute(
            select(CustomRole).where(CustomRole.name == data.role)
        )
        if custom.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role '{data.role}'. Must be one of {sorted(system_roles)} or a custom role.",
            )

    user = User(
        email=data.email.lower().strip(),
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: AdminUserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role, active status, or name. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and data.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    if user.id == current_user.id and data.role and data.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot change your own role")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password is not None:
        user.hashed_password = hash_password(data.password)

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user. Admins cannot delete themselves."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()


# ═══════════════════════════════════════════════════════
# ROLE MANAGEMENT
# ═══════════════════════════════════════════════════════

@router.get("/roles", response_model=list[RolePermissions])
async def get_roles(db: AsyncSession = Depends(get_db)):
    """Get all roles (system + custom) and their permissions."""
    roles = list(ROLE_PERMISSIONS)

    # Add custom roles from DB
    result = await db.execute(select(CustomRole).order_by(CustomRole.created_at))
    custom_roles = result.scalars().all()

    for cr in custom_roles:
        perms = [
            PERMISSION_MAP[key]
            for key in (cr.permissions or [])
            if key in PERMISSION_MAP
        ]
        roles.append(RolePermissions(
            role=cr.name,
            label=cr.label,
            description=cr.description,
            permissions=perms,
            is_system=False,
        ))

    return roles


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new custom role with specified permissions."""
    # Check name uniqueness (including system roles)
    system_names = {"admin", "researcher", "viewer"}
    if data.name in system_names:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot use a system role name",
        )

    result = await db.execute(select(CustomRole).where(CustomRole.name == data.name))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A role with this name already exists",
        )

    # Validate all permissions exist
    valid_keys = {p.key for p in ALL_PERMISSIONS}
    invalid = [k for k in data.permissions if k not in valid_keys]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid permission keys: {invalid}",
        )

    role = CustomRole(
        name=data.name,
        label=data.label,
        description=data.description,
        permissions=data.permissions,
        is_system=False,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return RoleResponse.model_validate(role)


@router.delete("/roles/{role_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_name: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a custom role. System roles cannot be deleted."""
    system_names = {"admin", "researcher", "viewer"}
    if role_name in system_names:
        raise HTTPException(status_code=400, detail="System roles cannot be deleted")

    result = await db.execute(select(CustomRole).where(CustomRole.name == role_name))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if any users are assigned this role
    user_count = await db.execute(
        select(func.count()).select_from(User).where(User.role == role_name)
    )
    if user_count.scalar_one() > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a role that is assigned to users. Reassign users first.",
        )

    await db.delete(role)
    await db.commit()


@router.get("/permissions", response_model=list[Permission])
async def get_all_permissions():
    """Get the full catalog of available permissions."""
    return ALL_PERMISSIONS
