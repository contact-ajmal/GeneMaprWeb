import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getGenomeView } from '../api/variants'
import type { VariantFilters, Variant } from '../types/variant'
import GenomeVisualization from '../components/GenomeVisualization'
import VariantEvidenceWorkspace from '../components/VariantEvidenceWorkspace'
import PageTransition from '../components/PageTransition'
import GlassCard from '../components/ui/GlassCard'
import DecodeText from '../components/ui/DecodeText'
import { Dna } from 'lucide-react'
import apiClient from '../api/client'
import { useActiveSample } from '../contexts/ActiveSampleContext'

export default function GenomeViewPage() {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [filters] = useState<VariantFilters>({})
  const { primarySampleId } = useActiveSample()

  const { data: genomeData, isLoading } = useQuery({
    queryKey: ['genomeView', filters, primarySampleId],
    queryFn: () => getGenomeView(filters, primarySampleId),
    staleTime: 1000 * 60 * 5,
  })

  const handleVariantClick = async (variantId: string) => {
    try {
      const response = await apiClient.get<Variant>(`/variants/${variantId}`)
      setSelectedVariant(response.data)
    } catch {
      // Silently fail if variant not found
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <motion.h1
            className="text-xl md:text-2xl font-headline font-bold text-slate-100 mb-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <DecodeText text="Genome View" speed={20} />
          </motion.h1>
          <motion.p
            className="text-sm text-slate-400 font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Interactive cytogenetic ideogram with variant positions across all chromosomes
          </motion.p>
        </div>

        {/* Genome Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <GlassCard variant="elevated" className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-dna-cyan/10 flex items-center justify-center border border-dna-cyan/20">
                    <Dna className="w-6 h-6 text-dna-cyan animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-dna-cyan/30 border-t-dna-cyan rounded-full animate-spin" />
                    <span className="text-sm text-slate-400 font-body">Loading genome view...</span>
                  </div>
                </div>
              </div>
            ) : genomeData && genomeData.annotations.length > 0 ? (
              <GenomeVisualization
                annotations={genomeData.annotations}
                chromosomeSummary={genomeData.chromosome_summary}
                onVariantClick={handleVariantClick}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-dna-cyan/20 to-dna-magenta/20 rounded-full flex items-center justify-center shadow-glow-cyan">
                  <Dna className="w-10 h-10 text-dna-cyan" />
                </div>
                <p className="text-slate-300 text-sm font-headline font-semibold mb-2">No genome data available</p>
                <p className="text-slate-500 text-sm font-body max-w-md">
                  Upload a VCF file to visualize variant positions across the genome
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Variant Evidence Workspace */}
      <VariantEvidenceWorkspace variant={selectedVariant} onClose={() => setSelectedVariant(null)} />
    </PageTransition>
  )
}
