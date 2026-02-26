from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class VariantBase(BaseModel):
    chrom: str
    pos: int
    ref: str
    alt: str
    qual: float | None = None
    filter_status: str | None = None
    rs_id: str | None = None
    depth: int | None = None
    allele_freq: float | None = None


class VariantCreate(VariantBase):
    normalized_variant: str
    upload_id: str | None = None


class VariantResponse(VariantBase):
    id: UUID
    normalized_variant: str
    upload_id: str | None
    created_at: datetime

    # Annotation fields - Ensembl
    gene_symbol: str | None = None
    transcript_id: str | None = None
    consequence: str | None = None
    protein_change: str | None = None

    # Annotation fields - ClinVar
    clinvar_significance: str | None = None
    clinvar_review_status: str | None = None
    clinvar_condition: str | None = None

    # Annotation fields - gnomAD
    gnomad_af: float | None = None
    gnomad_ac: int | None = None
    gnomad_an: int | None = None

    # Annotation metadata
    annotation_status: str | None = None
    annotated_at: datetime | None = None

    # Scoring and AI summary
    risk_score: int | None = None
    ai_summary: str | None = None

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    status: str
    variant_count: int
    upload_id: str
    message: str


class VariantListResponse(BaseModel):
    variants: list[VariantResponse]
    total: int
    page: int
    page_size: int
