import apiClient from './client'
import type { PharmacogenomicsData } from '../types/pharmacogenomics'

export const getPharmacogenomics = async (sampleId?: string | null): Promise<PharmacogenomicsData> => {
  const params: Record<string, any> = {}
  if (sampleId) params.sample_id = sampleId
  const response = await apiClient.get<PharmacogenomicsData>('/pharmacogenomics', { params })
  return response.data
}
