from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.variant import VariantResponse, TopGene, DistributionItem


# --- Sample CRUD Schemas ---

class SampleCreate(BaseModel):
    name: str
    description: str | None = None
    relationship_type: str | None = None
    sample_type: str = "germline"


class SampleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    relationship_type: str | None = None
    sample_type: str | None = None


class SampleResponse(BaseModel):
    id: UUID
    name: str
    original_filename: str
    description: str | None = None
    relationship_type: str | None = None
    sample_type: str = "germline"
    status: str = "processing"

    # Stats
    total_variants: int = 0
    pathogenic_count: int = 0
    likely_pathogenic_count: int = 0
    vus_count: int = 0
    benign_count: int = 0
    high_risk_count: int = 0
    mean_risk_score: float | None = None
    unique_genes: int = 0

    # File metadata
    file_size_bytes: int = 0
    genome_assembly: str = "GRCh38"
    vcf_version: str | None = None

    # Timestamps
    uploaded_at: datetime
    processing_completed_at: datetime | None = None
    last_accessed_at: datetime | None = None

    upload_id: str
    scoring_profile_id: UUID | None = None
    scoring_profile_name: str | None = None

    # Computed: top genes (populated by list endpoint)
    top_genes: list[TopGene] = []

    model_config = {"from_attributes": True}


class SampleDetailResponse(SampleResponse):
    """Extended sample response with variant preview and distributions."""
    top_variants: list[VariantResponse] = []
    chromosome_distribution: dict[str, int] = {}
    top_affected_genes: list[TopGene] = []
    clinvar_distribution: list[DistributionItem] = []
    consequence_distribution: list[DistributionItem] = []


class SampleListSummary(BaseModel):
    total_samples: int
    total_variants_all: int
    total_pathogenic_all: int
    storage_used_bytes: int


class SampleListResponse(BaseModel):
    samples: list[SampleResponse]
    total: int
    page: int
    page_size: int
    summary: SampleListSummary


class DeleteResponse(BaseModel):
    deleted_variants: int
    sample_name: str


class BulkDeleteRequest(BaseModel):
    sample_ids: list[UUID]


class BulkDeleteResponse(BaseModel):
    deleted_samples: int
    deleted_variants: int


class StorageStatsResponse(BaseModel):
    total_samples: int
    total_variants: int
    storage_used_mb: float
    samples_by_status: dict[str, int]
    samples_by_type: dict[str, int]
    oldest_sample: dict | None = None
    newest_sample: dict | None = None


# --- Comparison Schemas (kept from previous) ---

class SampleStats(BaseModel):
    sample_id: str
    name: str
    total: int
    pathogenic_count: int
    likely_pathogenic_count: int
    vus_count: int
    mean_risk: float


class SharedVariant(BaseModel):
    variant: VariantResponse
    present_in: list[str]


class InheritancePattern(BaseModel):
    variant_id: str
    gene: str | None
    chrom: str
    pos: int
    ref: str
    alt: str
    clinvar_significance: str | None
    risk_score: int | None
    proband: bool
    mother: bool
    father: bool
    inheritance: str


class CompoundHet(BaseModel):
    gene: str
    variant_a: VariantResponse
    variant_b: VariantResponse
    source_a: str
    source_b: str


class ComparisonResponse(BaseModel):
    shared_variants: list[SharedVariant]
    unique_variants: dict[str, list[VariantResponse]]
    sample_stats: list[SampleStats]
    inheritance_patterns: list[InheritancePattern]
    compound_hets: list[CompoundHet]
    ai_summary: str | None = None


class UploadWithSampleResponse(BaseModel):
    status: str
    variant_count: int
    upload_id: str
    sample_id: str
    sample_name: str
    message: str
