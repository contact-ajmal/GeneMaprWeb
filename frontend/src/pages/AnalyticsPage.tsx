import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import DashboardAnalytics from '../components/DashboardAnalytics'
import PageTransition from '../components/PageTransition'
import DecodeText from '../components/ui/DecodeText'
import { useActiveSample } from '../contexts/ActiveSampleContext'
import { getAdvancedVariantStats } from '../api/variants'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  const { primarySampleId, activeSamples } = useActiveSample()
  const sampleName = activeSamples?.[0]?.name

  const { data: stats } = useQuery({
    queryKey: ['advancedVariantStats', primarySampleId],
    queryFn: () => getAdvancedVariantStats(primarySampleId),
    staleTime: 1000 * 60,
  })

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <motion.h1
              className="text-xl md:text-2xl font-headline font-bold text-slate-100 flex items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <BarChart3 className="w-6 h-6 text-dna-cyan" />
              <DecodeText text="Variant Analytics" speed={20} />
              {sampleName && (
                <span className="ml-2 text-xs font-body font-normal px-2.5 py-1 rounded-full bg-dna-cyan/10 text-dna-cyan border border-dna-cyan/20">
                  {sampleName}
                </span>
              )}
            </motion.h1>
            <motion.p
              className="text-sm text-slate-400 font-body mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {stats ? (
                <span className="font-mono text-xs">
                  {stats.summary.total_variants.toLocaleString()} variants across {stats.summary.total_genes_affected} genes
                  <span className="text-slate-600 mx-2">|</span>
                  Analysis: {stats.summary.analysis_date}
                </span>
              ) : (
                'Loading analytics data...'
              )}
            </motion.p>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <DashboardAnalytics />
        </motion.div>
      </div>
    </PageTransition>
  )
}
