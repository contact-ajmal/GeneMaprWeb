export interface PgxVariant {
  variant_id: string
  chrom: string
  pos: number
  ref: string
  alt: string
  rs_id: string | null
  gene: string
  allele: string
  function: string
  change: string
  gene_symbol: string | null
  consequence: string | null
}

export interface DrugInteraction {
  drug: string
  category: string
  interaction: string
  impact: string
  metabolizer_status: string
  guideline: string
}

export interface AlleleInfo {
  allele: string
  function: string
  rs_id: string | null
}

export interface GeneSummary {
  metabolizer_status: string
  alleles: AlleleInfo[]
  drug_count: number
}

export interface AlleleReference {
  rsid: string | null
  change: string
  function: string
}

export interface GeneReference {
  gene: string
  chromosome: string | null
  alleles: Record<string, AlleleReference>
  drug_count: number
}

export interface PharmacogenomicsData {
  pgx_variants: PgxVariant[]
  drug_interactions: DrugInteraction[]
  gene_summaries: Record<string, GeneSummary>
  summary: string
  allele_reference: GeneReference[]
}
