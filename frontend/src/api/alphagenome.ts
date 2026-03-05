import apiClient from './client'
import type {
    AlphaGenomePrediction,
    AlphaGenomeOutputType,
    AlphaGenomePredictionRow,
    AlphaGenomeStats,
    AlphaGenomeBatchStatus,
} from '../types/variant'

/**
 * Run a single AlphaGenome variant effect prediction (on-demand).
 */
export async function predictAlphaGenome(
    chrom: string,
    pos: number,
    ref: string,
    alt: string,
    outputType: AlphaGenomeOutputType = 'RNA_SEQ',
): Promise<AlphaGenomePrediction> {
    const response = await apiClient.post<AlphaGenomePrediction>(
        '/alphagenome/predict',
        {
            chrom,
            pos,
            ref,
            alt,
            output_type: outputType,
        },
    )
    return response.data
}

/**
 * Start batch predictions for all variants in a sample.
 */
export async function runBatchPredictions(
    sampleId: string,
    outputType: AlphaGenomeOutputType = 'RNA_SEQ',
): Promise<{ message: string; sample_id: string }> {
    const response = await apiClient.post(
        `/alphagenome/run-batch/${sampleId}?output_type=${outputType}`,
    )
    return response.data
}

/**
 * Get all stored predictions for a sample.
 */
export async function getPredictions(
    sampleId: string,
): Promise<{ predictions: AlphaGenomePredictionRow[]; count: number }> {
    const response = await apiClient.get(`/alphagenome/predictions/${sampleId}`)
    return response.data
}

/**
 * Get aggregate AlphaGenome stats for the dashboard.
 */
export async function getPredictionStats(
    sampleId: string,
): Promise<AlphaGenomeStats> {
    const response = await apiClient.get<AlphaGenomeStats>(
        `/alphagenome/stats/${sampleId}`,
    )
    return response.data
}

/**
 * Get batch job progress for a sample.
 */
export async function getBatchStatus(
    sampleId: string,
): Promise<AlphaGenomeBatchStatus> {
    const response = await apiClient.get<AlphaGenomeBatchStatus>(
        `/alphagenome/status/${sampleId}`,
    )
    return response.data
}
