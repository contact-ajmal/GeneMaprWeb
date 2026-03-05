"""
AlphaGenome prediction database model.

Stores persistent variant effect predictions so they don't need
to be re-fetched from the AlphaGenome API on every page load.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    String, Integer, Float, DateTime, Text,
    ForeignKey, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AlphaGenomePrediction(Base):
    __tablename__ = "alphagenome_predictions"
    __table_args__ = (
        UniqueConstraint("variant_id", name="uq_ag_variant"),
    )

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Foreign keys
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("variants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sample_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("samples.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Prediction config
    output_type: Mapped[str] = mapped_column(String(50), nullable=False, default="RNA_SEQ")

    # Results
    variant_effect_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ref_tracks: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    alt_tracks: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Interval window used for prediction
    interval_chrom: Mapped[str | None] = mapped_column(String(50), nullable=True)
    interval_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interval_end: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Job status: pending | running | completed | failed | skipped
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Variant info (denormalised for fast dashboard queries)
    chrom: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ref: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    alt: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    gene_symbol: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    variant = relationship("Variant", backref="alphagenome_prediction", uselist=False)

    def __repr__(self):
        return (
            f"<AlphaGenomePrediction {self.chrom}:{self.pos} "
            f"score={self.variant_effect_score} status={self.status}>"
        )
