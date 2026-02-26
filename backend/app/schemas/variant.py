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
