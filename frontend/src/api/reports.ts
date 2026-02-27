import apiClient from './client'
import type { ReportRequest, ReportGenerateResponse, ReportStatus, ReportListItem } from '../types/report'

export const generateReport = async (request: ReportRequest): Promise<ReportGenerateResponse> => {
  const response = await apiClient.post<ReportGenerateResponse>('/reports/generate', request)
  return response.data
}

export const getReportStatus = async (reportId: string): Promise<ReportStatus> => {
  const response = await apiClient.get(`/reports/${reportId}`, {
    // Don't parse as JSON when PDF is returned
    validateStatus: (status) => status < 500,
  })

  // If we got a PDF back (blob), it means report is complete
  if (response.headers['content-type']?.includes('application/pdf')) {
    return {
      report_id: reportId,
      status: 'complete',
    }
  }

  return response.data as ReportStatus
}

export const downloadReport = async (reportId: string): Promise<void> => {
  const response = await apiClient.get(`/reports/${reportId}`, {
    responseType: 'blob',
  })

  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GeneMapr_Report_${reportId}.pdf`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export const listReports = async (): Promise<ReportListItem[]> => {
  const response = await apiClient.get<ReportListItem[]>('/reports')
  return response.data
}
