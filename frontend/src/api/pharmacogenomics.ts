import apiClient from './client'
import type { PharmacogenomicsData } from '../types/pharmacogenomics'

export const getPharmacogenomics = async (): Promise<PharmacogenomicsData> => {
  const response = await apiClient.get<PharmacogenomicsData>('/pharmacogenomics')
  return response.data
}
