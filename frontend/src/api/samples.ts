import apiClient from './client'
import type {
  Sample,
  SampleDetail,
  SampleListResponse,
  SampleUpdate,
  DeleteResponse,
  BulkDeleteResponse,
  StorageStats,
  ComparisonResult,
  UploadWithSampleResponse,
} from '../types/variant'

export interface SampleListParams {
  search?: string
  status?: string
  sample_type?: string
  sort_by?: string
  sort_order?: string
  page?: number
  page_size?: number
}

export const getSamples = async (params: SampleListParams = {}): Promise<SampleListResponse> => {
  const response = await apiClient.get<SampleListResponse>('/samples', { params })
  return response.data
}

export const getSample = async (sampleId: string): Promise<SampleDetail> => {
  const response = await apiClient.get<SampleDetail>(`/samples/${sampleId}`)
  return response.data
}

export const updateSample = async (sampleId: string, update: SampleUpdate): Promise<Sample> => {
  const response = await apiClient.put<Sample>(`/samples/${sampleId}`, update)
  return response.data
}

export const deleteSample = async (sampleId: string): Promise<DeleteResponse> => {
  const response = await apiClient.delete<DeleteResponse>(`/samples/${sampleId}`)
  return response.data
}

export const bulkDeleteSamples = async (sampleIds: string[]): Promise<BulkDeleteResponse> => {
  const response = await apiClient.delete<BulkDeleteResponse>('/samples/bulk', {
    data: { sample_ids: sampleIds },
  })
  return response.data
}

export const archiveSample = async (sampleId: string): Promise<Sample> => {
  const response = await apiClient.post<Sample>(`/samples/${sampleId}/archive`)
  return response.data
}

export const unarchiveSample = async (sampleId: string): Promise<Sample> => {
  const response = await apiClient.post<Sample>(`/samples/${sampleId}/unarchive`)
  return response.data
}

export const rescoreSample = async (
  sampleId: string,
  scoringProfileId?: string,
): Promise<{ status: string; sample_id: string }> => {
  const params = scoringProfileId ? { scoring_profile_id: scoringProfileId } : {}
  const response = await apiClient.post(`/samples/${sampleId}/rescore`, null, { params })
  return response.data
}

export const reannotateSample = async (
  sampleId: string,
): Promise<{ status: string; sample_id: string }> => {
  const response = await apiClient.post(`/samples/${sampleId}/reannotate`)
  return response.data
}

export const exportSampleCSV = async (sampleId: string): Promise<Blob> => {
  const response = await apiClient.get(`/samples/${sampleId}/export`, {
    responseType: 'blob',
  })
  return response.data
}

export const getStorageStats = async (): Promise<StorageStats> => {
  const response = await apiClient.get<StorageStats>('/samples/storage-stats')
  return response.data
}

export const uploadVCFWithSample = async (
  file: File,
  sampleName: string,
  relationshipType?: string,
  description?: string,
  sampleType?: string,
): Promise<UploadWithSampleResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('sample_name', sampleName)
  if (relationshipType) formData.append('relationship_type', relationshipType)
  if (description) formData.append('description', description)
  if (sampleType) formData.append('sample_type', sampleType)

  const response = await apiClient.post<UploadWithSampleResponse>(
    '/samples/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return response.data
}

export const compareSamples = async (sampleIds: string[]): Promise<ComparisonResult> => {
  const response = await apiClient.get<ComparisonResult>('/samples/compare', {
    params: { sample_ids: sampleIds.join(',') },
  })
  return response.data
}
