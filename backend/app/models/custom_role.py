"""
Custom Role model for user-defined roles with flexible permissions.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class CustomRole(Base):
    __tablename__ = "custom_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, index=True)
    label = Column(String(200), nullable=False)
    description = Column(String(500), nullable=False, default="")
    permissions = Column(JSON, nullable=False, default=list)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
