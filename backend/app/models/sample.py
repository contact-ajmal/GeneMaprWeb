import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Sample(Base):
    __tablename__ = "samples"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    relationship_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # proband, mother, father, sibling, unrelated, control
    sample_type: Mapped[str] = mapped_column(
        String(50), default="germline", nullable=False
    )  # germline, somatic, control
    status: Mapped[str] = mapped_column(
        String(50), default="processing", nullable=False
    )  # processing, annotating, complete, failed, archived

    # Stats (populated after processing)
    total_variants: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pathogenic_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    likely_pathogenic_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    vus_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    benign_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    high_risk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mean_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    unique_genes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # File metadata
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    genome_assembly: Mapped[str] = mapped_column(String(20), default="GRCh38", nullable=False)
    vcf_version: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False
    )
    processing_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Legacy upload_id for annotation pipeline compatibility
    upload_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Scoring profile used
    scoring_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    scoring_profile_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # User ownership
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    user = relationship("User", back_populates="samples")

    # Relationship to variants
    variants = relationship("Variant", back_populates="sample", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Sample {self.name} ({self.sample_type}/{self.status})>"
