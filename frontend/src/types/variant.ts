export interface Variant {
  id: string
  chrom: string
  pos: number
  ref: string
  alt: string
  qual: number | null
  filter_status: string | null
  rs_id: string | null
  depth: number | null
  allele_freq: number | null
  normalized_variant: string
  gene_symbol: string | null
  transcript_id: string | null
  consequence: string | null
  protein_change: string | null
  clinvar_significance: string | null
  clinvar_review_status: string | null
  clinvar_condition: string | null
  gnomad_af: number | null
  gnomad_ac: number | null
  gnomad_an: number | null
  annotation_status: string
  annotated_at: string | null
  risk_score: number | null
  ai_summary: string | null
  upload_id: string
  created_at: string
}

export interface VariantFilters {
  gene?: string
  clinvar_significance?: string
  af_min?: number
  af_max?: number
  consequence?: string[]
  risk_score_min?: number
  risk_score_max?: number
}

export interface PaginatedVariants {
  variants: Variant[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface UploadResponse {
  message: string
  variants_parsed: number
}

export interface TopGene {
  gene: string
  count: number
  max_risk: number
}

export interface DistributionItem {
  name: string
  count: number
}

export interface VariantStats {
  total_variants: number
  pathogenic_count: number
  likely_pathogenic_count: number
  vus_count: number
  benign_count: number
  high_risk_count: number
  mean_risk_score: number
  mean_allele_frequency: number
  unique_genes: number
  top_genes: TopGene[]
  consequence_distribution: DistributionItem[]
  clinvar_distribution: DistributionItem[]
  risk_score_distribution: DistributionItem[]
  af_distribution: DistributionItem[]
}
