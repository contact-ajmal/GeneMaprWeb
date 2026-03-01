"""
Authentication API endpoints: register, login, profile management.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    TokenResponse,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.
    Returns a JWT token so the user is logged in immediately after registration.
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Create user
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role="researcher",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate token
    token = create_access_token(user_id=user.id, role=user.role)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with email and password. Returns JWT token.
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact your administrator.",
        )

    # Update last login timestamp
    user.last_login = datetime.utcnow()
    await db.commit()

    token = create_access_token(user_id=user.id, role=user.role)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Get the current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile (name and/or password)."""
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.password is not None:
        current_user.hashed_password = hash_password(data.password)

    await db.commit()
    await db.refresh(current_user)

    return UserResponse.model_validate(current_user)
