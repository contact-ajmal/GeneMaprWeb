"""
Admin-specific Pydantic schemas: user management payloads, role definitions.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.auth import UserResponse


# ── User Management Schemas ──

class AdminUserCreate(BaseModel):
    """Payload for admin creating a new user with specific role."""
    full_name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field("researcher", description="User role: admin, researcher, viewer, or custom")


class AdminUserUpdate(BaseModel):
    """Payload for admin updating any user."""
    full_name: str | None = Field(None, min_length=1, max_length=200)
    role: str | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8, max_length=128)


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    page_size: int


# ── Role & Permission Schemas ──

class Permission(BaseModel):
    key: str
    label: str
    description: str


class RolePermissions(BaseModel):
    role: str
    label: str
    description: str
    permissions: list[Permission]
    is_system: bool = True


class RoleCreate(BaseModel):
    """Payload for creating a new custom role."""
    name: str = Field(..., min_length=2, max_length=100, pattern=r'^[a-z_]+$')
    label: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=500)
    permissions: list[str] = Field(..., min_length=1)


class RoleResponse(BaseModel):
    id: UUID
    name: str
    label: str
    description: str
    permissions: list[str]
    is_system: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Available Permissions ──

ALL_PERMISSIONS: list[Permission] = [
    Permission(key="users.manage", label="Manage Users", description="Create, edit, deactivate, and delete user accounts"),
    Permission(key="roles.assign", label="Assign Roles", description="Change user roles and permissions"),
    Permission(key="samples.all", label="View All Samples", description="Access samples from all users"),
    Permission(key="samples.crud", label="Manage Samples", description="Upload, edit, and delete genomic samples"),
    Permission(key="samples.view", label="View Samples", description="View shared genomic samples (read-only)"),
    Permission(key="variants.view", label="View Variants", description="Access variant data and analysis"),
    Permission(key="reports.generate", label="Generate Reports", description="Create clinical and research reports"),
    Permission(key="reports.view", label="View Reports", description="View existing reports"),
    Permission(key="settings.manage", label="System Settings", description="Configure application settings"),
    Permission(key="chat.use", label="AI Chat", description="Access the AI genomic assistant"),
    Permission(key="pharmacogenomics.view", label="Pharmacogenomics", description="Access pharmacogenomic analysis"),
    Permission(key="genome_view.access", label="Genome View", description="Access the genome visualization tool"),
]

PERMISSION_MAP = {p.key: p for p in ALL_PERMISSIONS}


# ── System Role Definitions ──

ROLE_PERMISSIONS: list[RolePermissions] = [
    RolePermissions(
        role="admin",
        label="Administrator",
        description="Full system access, user management, and configuration",
        is_system=True,
        permissions=[p for p in ALL_PERMISSIONS],
    ),
    RolePermissions(
        role="researcher",
        label="Researcher",
        description="Upload samples, analyze variants, and generate reports for own data",
        is_system=True,
        permissions=[PERMISSION_MAP[k] for k in [
            "samples.crud", "variants.view", "reports.generate", "chat.use",
            "pharmacogenomics.view", "genome_view.access",
        ]],
    ),
    RolePermissions(
        role="viewer",
        label="Viewer",
        description="Read-only access to shared samples and reports",
        is_system=True,
        permissions=[PERMISSION_MAP[k] for k in [
            "samples.view", "variants.view", "reports.view",
        ]],
    ),
]
