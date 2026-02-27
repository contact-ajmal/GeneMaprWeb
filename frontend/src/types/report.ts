export interface ReportRequest {
  variant_ids: string[] | 'all'
  report_type: 'clinical' | 'research' | 'patient'
  include_sections: string[]
  analyst_name?: string
}

export interface ReportGenerateResponse {
  report_id: string
  status: string
}

export interface ReportStatus {
  report_id: string
  status: 'generating' | 'complete' | 'failed'
  report_type?: string
  variant_count?: number
  created_at?: string
  download_url?: string
}

export interface ReportListItem {
  report_id: string
  status: string
  report_type: string
  variant_count: number
  created_at: string
}
