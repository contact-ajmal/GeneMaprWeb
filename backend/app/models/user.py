import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(320), nullable=False, unique=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="researcher"
    )  # admin, researcher, viewer
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    samples = relationship("Sample", back_populates="user", lazy="selectin")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
