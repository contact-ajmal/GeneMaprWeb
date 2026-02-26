import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Variant(Base):
    __tablename__ = "variants"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # VCF fields
    chrom: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    pos: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    ref: Mapped[str] = mapped_column(String(1000), nullable=False)
    alt: Mapped[str] = mapped_column(String(1000), nullable=False)
    qual: Mapped[float] = mapped_column(Float, nullable=True)
    filter_status: Mapped[str] = mapped_column(String(100), nullable=True)
    rs_id: Mapped[str] = mapped_column(String(50), nullable=True, index=True)

    # INFO fields
    depth: Mapped[int] = mapped_column(Integer, nullable=True)
    allele_freq: Mapped[float] = mapped_column(Float, nullable=True)

    # Normalized variant representation
    normalized_variant: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        index=True,
        unique=True
    )

    # Annotation fields - Ensembl
    gene_symbol: Mapped[str] = mapped_column(String(100), nullable=True)
    transcript_id: Mapped[str] = mapped_column(String(100), nullable=True)
    consequence: Mapped[str] = mapped_column(String(200), nullable=True)
    protein_change: Mapped[str] = mapped_column(String(200), nullable=True)

    # Annotation fields - ClinVar
    clinvar_significance: Mapped[str] = mapped_column(String(200), nullable=True)
    clinvar_review_status: Mapped[str] = mapped_column(String(200), nullable=True)
    clinvar_condition: Mapped[str] = mapped_column(Text, nullable=True)

    # Annotation fields - gnomAD
    gnomad_af: Mapped[float] = mapped_column(Float, nullable=True)
    gnomad_ac: Mapped[int] = mapped_column(Integer, nullable=True)
    gnomad_an: Mapped[int] = mapped_column(Integer, nullable=True)

    # Annotation metadata
    annotation_status: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        default="pending"
    )
    annotated_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Scoring and AI summary
    risk_score: Mapped[int] = mapped_column(Integer, nullable=True, index=True)
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)

    # Metadata
    upload_id: Mapped[str] = mapped_column(String(100), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def __repr__(self):
        return f"<Variant {self.chrom}:{self.pos} {self.ref}>{self.alt}>"
