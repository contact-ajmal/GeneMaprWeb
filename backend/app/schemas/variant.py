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
    total_pages: int


class TopGene(BaseModel):
    gene: str
    count: int
    max_risk: int


class DistributionItem(BaseModel):
    name: str
    count: int


class VariantStatsResponse(BaseModel):
    total_variants: int
    pathogenic_count: int
    likely_pathogenic_count: int
    vus_count: int
    benign_count: int
    high_risk_count: int
    mean_risk_score: float
    mean_allele_frequency: float
    unique_genes: int
    top_genes: list[TopGene]
    consequence_distribution: list[DistributionItem]
    clinvar_distribution: list[DistributionItem]
    risk_score_distribution: list[DistributionItem]
    af_distribution: list[DistributionItem]


# --- Advanced Analytics Schemas ---

class SummaryMetrics(BaseModel):
    total_variants: int
    total_genes_affected: int
    samples_analyzed: int
    mean_quality_score: float
    analysis_date: str


class SignificanceDetail(BaseModel):
    count: int
    percentage: float
    genes: list[str] = []


class ClinicalSignificanceBreakdown(BaseModel):
    pathogenic: SignificanceDetail
    likely_pathogenic: SignificanceDetail
    uncertain_significance: SignificanceDetail
    likely_benign: SignificanceDetail
    benign: SignificanceDetail
    conflicting: SignificanceDetail
    not_provided: SignificanceDetail


class ConsequenceItem(BaseModel):
    type: str
    count: int
    pathogenic_pct: float


class GeneAnalysisItem(BaseModel):
    gene: str
    variant_count: int
    pathogenic_count: int
    max_risk_score: int
    mean_risk_score: float
    consequences: list[str]
    chromosomes: list[str]
    clinvar_classifications: dict[str, int]


class GeneAnalysis(BaseModel):
    top_genes: list[GeneAnalysisItem]
    genes_with_multiple_hits: int
    genes_pathogenic_only: list[str]


class AFBin(BaseModel):
    count: int
    af_range: str


class ScatterDataPoint(BaseModel):
    variant_id: str
    gene: str
    af: float
    risk_score: int
    significance: str
    consequence: str


class AlleleFrequencySpectrum(BaseModel):
    ultra_rare: AFBin
    very_rare: AFBin
    rare: AFBin
    low_frequency: AFBin
    common: AFBin
    not_found: AFBin
    scatter_data: list[ScatterDataPoint]


class RiskScoreBin(BaseModel):
    range: str
    label: str
    count: int
    color: str


class RiskScoreAnalysis(BaseModel):
    distribution: list[RiskScoreBin]
    mean: float
    median: float
    std_dev: float
    max: int
    p90: float
    p95: float


class ChromosomeDistributionItem(BaseModel):
    chromosome: str
    variant_count: int
    pathogenic_count: int
    genes: list[str]


class ACMGCriterionFrequency(BaseModel):
    criterion: str
    met_count: int
    description: str


class ACMGSummary(BaseModel):
    criteria_frequency: list[ACMGCriterionFrequency]


class ActionableSummary(BaseModel):
    total_actionable: int
    pharmacogenomic_variants: int
    cancer_predisposition: int
    carrier_status: int
    high_confidence_pathogenic: int


class AdvancedVariantStatsResponse(BaseModel):
    summary: SummaryMetrics
    clinical_significance: ClinicalSignificanceBreakdown
    consequences: list[ConsequenceItem]
    gene_analysis: GeneAnalysis
    allele_frequency_spectrum: AlleleFrequencySpectrum
    risk_scores: RiskScoreAnalysis
    chromosome_distribution: list[ChromosomeDistributionItem]
    acmg_summary: ACMGSummary
    actionable_summary: ActionableSummary
    ai_insights: list[str]


# --- ACMG Classification Schemas ---

class ACMGCriterionDetail(BaseModel):
    met: bool
    evidence: str = ""
    strength: str = ""


class ACMGClassification(BaseModel):
    criteria_met: list[str]
    criteria_details: dict[str, ACMGCriterionDetail]
    classification: str
    classification_reason: str


class PopulationFrequencies(BaseModel):
    overall: float | None = None
    african: float | None = None
    east_asian: float | None = None
    european: float | None = None
    latino: float | None = None
    south_asian: float | None = None


class ExternalLinks(BaseModel):
    clinvar: str | None = None
    gnomad: str | None = None
    ensembl: str | None = None
    pubmed: str | None = None
    uniprot: str | None = None


class VariantDetailResponse(VariantResponse):
    """Extended variant response with ACMG, population data, and external links."""
    acmg_criteria: ACMGClassification | None = None
    population_frequencies: PopulationFrequencies | None = None
    external_links: ExternalLinks | None = None


# --- Genome View Schemas ---

class GenomeAnnotation(BaseModel):
    name: str
    chr: str
    start: int
    stop: int
    risk_score: int | None = None
    clinvar_significance: str | None = None
    consequence: str | None = None
    gene: str | None = None
    allele_frequency: float | None = None
    variant_id: str


class ChromosomeSummary(BaseModel):
    count: int
    max_risk: int
    pathogenic: int


class GenomeViewResponse(BaseModel):
    annotations: list[GenomeAnnotation]
    chromosome_summary: dict[str, ChromosomeSummary]
