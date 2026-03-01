import apiClient from './client'
import type { PaginatedVariants, VariantFilters, UploadResponse, VariantStats, GenomeViewData, VariantDetail } from '../types/variant'

export const uploadVCF = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<UploadResponse>('/variants/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export const getVariants = async (
  page: number = 1,
  pageSize: number = 50,
  filters?: VariantFilters,
  sampleId?: string | null,
): Promise<PaginatedVariants> => {
  const params: Record<string, any> = {
    skip: (page - 1) * pageSize,
    limit: pageSize,
    _t: Date.now(),
  }

  if (sampleId) params.sample_id = sampleId

  if (filters) {
    if (filters.gene) params.gene = filters.gene
    if (filters.clinvar_significance) params.clinvar_significance = filters.clinvar_significance
    if (filters.af_min !== undefined) params.af_min = filters.af_min
    if (filters.af_max !== undefined) params.af_max = filters.af_max
    if (filters.consequence && filters.consequence.length > 0) {
      params.consequence = filters.consequence.join(',')
    }
    if (filters.risk_score_min !== undefined) params.risk_score_min = filters.risk_score_min
    if (filters.risk_score_max !== undefined) params.risk_score_max = filters.risk_score_max
  }

  const response = await apiClient.get<PaginatedVariants>('/variants', { params })
  return response.data
}

export const exportVariantsCSV = async (filters?: VariantFilters, sampleId?: string | null): Promise<Blob> => {
  const params: Record<string, any> = {}

  if (sampleId) params.sample_id = sampleId

  if (filters) {
    if (filters.gene) params.gene = filters.gene
    if (filters.clinvar_significance) params.clinvar_significance = filters.clinvar_significance
    if (filters.af_min !== undefined) params.af_min = filters.af_min
    if (filters.af_max !== undefined) params.af_max = filters.af_max
    if (filters.consequence && filters.consequence.length > 0) {
      params.consequence = filters.consequence.join(',')
    }
    if (filters.risk_score_min !== undefined) params.risk_score_min = filters.risk_score_min
    if (filters.risk_score_max !== undefined) params.risk_score_max = filters.risk_score_max
  }

  const response = await apiClient.get('/variants/export/csv', {
    params,
    responseType: 'blob',
  })

  return response.data
}

export const getVariantStats = async (sampleId?: string | null): Promise<VariantStats> => {
  const params: Record<string, any> = {}
  if (sampleId) params.sample_id = sampleId
  const response = await apiClient.get<VariantStats>('/variants/stats', { params })
  return response.data
}

export const getGenomeView = async (filters?: VariantFilters, sampleId?: string | null): Promise<GenomeViewData> => {
  const params: Record<string, any> = {}

  if (sampleId) params.sample_id = sampleId

  if (filters) {
    if (filters.gene) params.gene = filters.gene
    if (filters.clinvar_significance) params.significance = filters.clinvar_significance
    if (filters.af_max !== undefined) params.af_max = filters.af_max
    if (filters.consequence && filters.consequence.length > 0) {
      params.consequence = filters.consequence.join(',')
    }
    if (filters.risk_score_min !== undefined) params.min_score = filters.risk_score_min
    if (filters.risk_score_max !== undefined) params.max_score = filters.risk_score_max
  }

  const response = await apiClient.get<GenomeViewData>('/variants/genome-view', { params })
  return response.data
}

export const getVariantDetail = async (variantId: string): Promise<VariantDetail> => {
  const response = await apiClient.get<VariantDetail>(`/variants/${variantId}`)
  return response.data
}
