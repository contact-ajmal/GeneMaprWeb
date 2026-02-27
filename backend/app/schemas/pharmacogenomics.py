"""Pydantic response models for pharmacogenomics endpoint."""
from pydantic import BaseModel, Field


class PgxVariant(BaseModel):
    variant_id: str
    chrom: str
    pos: int
    ref: str
    alt: str
    rs_id: str | None = None
    gene: str
    allele: str
    function: str
    change: str
    gene_symbol: str | None = None
    consequence: str | None = None


class DrugInteraction(BaseModel):
    drug: str
    category: str
    interaction: str
    impact: str
    metabolizer_status: str
    guideline: str


class AlleleInfo(BaseModel):
    allele: str
    function: str
    rs_id: str | None = None


class GeneSummary(BaseModel):
    metabolizer_status: str
    alleles: list[AlleleInfo]
    drug_count: int


class AlleleReference(BaseModel):
    rsid: str | None = None
    change: str
    function: str


class GeneReference(BaseModel):
    gene: str
    chromosome: str | None = None
    alleles: dict[str, AlleleReference]
    drug_count: int


class PharmacogenomicsResponse(BaseModel):
    pgx_variants: list[PgxVariant]
    drug_interactions: list[DrugInteraction]
    gene_summaries: dict[str, GeneSummary]
    summary: str
    allele_reference: list[GeneReference] = Field(default_factory=list)
