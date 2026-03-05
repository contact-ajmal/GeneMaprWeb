import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getVariants, exportVariantsCSV, getVariantStats } from '../api/variants'
import { getPredictions } from '../api/alphagenome'
import type { Variant, VariantFilters } from '../types/variant'
import FilterPanel from '../components/FilterPanel'
import VariantTable from '../components/VariantTable'
import VariantEvidenceWorkspace from '../components/VariantEvidenceWorkspace'
import PageTransition from '../components/PageTransition'
import GlassCard from '../components/ui/GlassCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import DecodeText from '../components/ui/DecodeText'
import { SkeletonTable } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useScrollReveal, scrollRevealVariants } from '../hooks/useScrollReveal'
import ReportGeneratorModal from '../components/ReportGeneratorModal'
import ProfileSelector from '../components/ProfileSelector'
import ScoringProfileManager from '../components/ScoringProfileManager'
import { useActiveSample } from '../contexts/ActiveSampleContext'
import { Download, TrendingUp, AlertTriangle, HelpCircle, Activity, CheckCircle2, FileText } from 'lucide-react'

const PAGE_SIZE = 50

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      setCount(Math.floor(progress * value))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <>{count.toLocaleString()}</>
}

function ScrollRevealSection({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  const { ref, isVisible } = useScrollReveal()
  return (
    <motion.div
      ref={ref}
      variants={scrollRevealVariants}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      custom={index}
    >
      {children}
    </motion.div>
  )
}

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<VariantFilters>({})
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false)
  const { toast } = useToast()
  const { primarySampleId, activeSamples } = useActiveSample()

  const activeSampleName = activeSamples.length === 1 ? activeSamples[0].name : null

  // Fetch variant stats for KPI cards
  const { data: statsData } = useQuery({
    queryKey: ['variantStats', primarySampleId],
    queryFn: () => getVariantStats(primarySampleId),
    staleTime: 1000 * 60 * 5,
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['variants', page, filters, primarySampleId],
    queryFn: async () => {
      const result = await getVariants(page, PAGE_SIZE, filters, primarySampleId)
      return result
    },
    staleTime: 1000 * 60 * 5,
  })

  // Fetch AlphaGenome predictions to show scores in the table
  const { data: agData } = useQuery({
    queryKey: ['agPredictions', primarySampleId],
    queryFn: () => primarySampleId ? getPredictions(primarySampleId) : Promise.resolve({ predictions: [], count: 0 }),
    enabled: !!primarySampleId,
    staleTime: 1000 * 60 * 5,
  })

  // Build a lookup map: variant_id -> { score, status }
  const agScoreMap = new Map<string, { score: number | null; status: string }>()
  if (agData?.predictions) {
    for (const p of agData.predictions) {
      agScoreMap.set(p.variant_id, { score: p.variant_effect_score, status: p.status })
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setExportSuccess(false)
      const blob = await exportVariantsCSV(filters, primarySampleId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `variants-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setExportSuccess(true)
      toast('CSV exported successfully', 'success')
      setTimeout(() => setExportSuccess(false), 2000)
    } catch (err) {
      console.error('Export failed:', err)
      toast('Failed to export variants. Please try again.', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFiltersChange = (newFilters: VariantFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters({})
    setPage(1)
  }

  const totalPages = data?.total_pages || 1

  // KPI Card Data
  const kpiCards = [
    {
      label: 'Total Variants',
      value: statsData?.total_variants || 0,
      icon: Activity,
      color: 'cyan',
      borderColor: 'border-l-dna-cyan',
    },
    {
      label: 'Pathogenic',
      value: statsData?.pathogenic_count || 0,
      icon: AlertTriangle,
      color: 'magenta',
      borderColor: 'border-l-dna-magenta',
    },
    {
      label: 'Likely Pathogenic',
      value: statsData?.likely_pathogenic_count || 0,
      icon: TrendingUp,
      color: 'amber',
      borderColor: 'border-l-dna-amber',
    },
    {
      label: 'VUS',
      value: statsData?.vus_count || 0,
      icon: HelpCircle,
      color: 'amber',
      borderColor: 'border-l-dna-amber',
    },
    {
      label: 'High Risk',
      value: statsData?.high_risk_count || 0,
      icon: AlertTriangle,
      color: 'magenta',
      borderColor: 'border-l-dna-magenta',
    },
  ]

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="flex items-center justify-between">
          <div>
            <motion.h1
              className="text-xl md:text-2xl font-headline font-bold text-slate-100 mb-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <DecodeText text={activeSampleName ? `Dashboard — ${activeSampleName}` : 'Variant Dashboard'} speed={20} />
            </motion.h1>
            <motion.p
              className="text-sm text-slate-400 font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {data?.total
                ? `Analyzing ${data.total.toLocaleString()} genomic variant${data.total !== 1 ? 's' : ''}`
                : 'Loading variant data...'}
              {activeSamples.length > 1 && (
                <span className="text-dna-cyan ml-2">
                  (Showing combined data from {activeSamples.length} samples)
                </span>
              )}
            </motion.p>
          </div>

          {/* Toolbar Buttons */}
          <motion.div
            className="flex items-center space-x-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <ProfileSelector
              onManageProfiles={() => setIsProfileManagerOpen(true)}
              onRescored={() => refetch()}
            />
            <AnimatedButton
              onClick={() => setIsReportModalOpen(true)}
              disabled={!data?.variants.length}
              variant="primary"
              className="flex items-center space-x-2"
            >
              <FileText className="w-5 h-5" />
              <span>Generate Report</span>
            </AnimatedButton>
            <AnimatedButton
              onClick={handleExport}
              disabled={isExporting || !data?.variants.length}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              {exportSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>{isExporting ? 'Exporting...' : exportSuccess ? 'Exported!' : 'Export CSV'}</span>
            </AnimatedButton>
          </motion.div>
        </div>

        {/* Stats Bar - KPI Cards */}
        {statsData && (
          <ScrollRevealSection>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {kpiCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                >
                  <GlassCard
                    variant="interactive"
                    className={`relative p-6 border-l-4 ${card.borderColor} overflow-hidden group hover:scale-105 transition-transform`}
                  >
                    {/* Background Icon */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <card.icon className={`w-16 h-16 text-dna-${card.color}`} />
                    </div>

                    <div className="relative z-10">
                      <p className="text-sm font-body text-slate-400 mb-2">{card.label}</p>
                      <p className={`text-xl font-headline font-bold text-dna-${card.color}`}>
                        <AnimatedCounter value={card.value} />
                      </p>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </ScrollRevealSection>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filter Sidebar */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />
          </motion.div>

          {/* Table Section */}
          <motion.div
            className="lg:col-span-3 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            {isLoading ? (
              <SkeletonTable rows={10} />
            ) : error ? (
              <GlassCard variant="elevated" className="p-8 border border-dna-magenta/30 shadow-glow-magenta">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-dna-magenta mt-0.5" />
                  <div>
                    <h3 className="font-headline font-semibold text-dna-magenta text-sm">
                      Error loading variants
                    </h3>
                    <p className="text-sm text-slate-300 mt-1 font-body">
                      {error instanceof Error ? error.message : 'An unexpected error occurred'}
                    </p>
                    <AnimatedButton
                      onClick={() => refetch()}
                      variant="danger"
                      className="mt-4"
                    >
                      Try Again
                    </AnimatedButton>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <>
                <VariantTable
                  variants={data?.variants || []}
                  onRowClick={setSelectedVariant}
                  agScoreMap={agScoreMap}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <GlassCard variant="default" className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400 font-body">
                        Page <span className="text-dna-cyan font-mono-variant">{page}</span> of{' '}
                        <span className="font-mono-variant">{totalPages}</span>
                      </p>
                      <div className="flex items-center space-x-2">
                        <AnimatedButton
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          variant="ghost"
                          className="px-4 py-2"
                        >
                          Previous
                        </AnimatedButton>

                        {/* Page number pills */}
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                            const pageNum = start + i
                            if (pageNum > totalPages) return null
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-sm font-mono-variant transition-all duration-200
                                  ${pageNum === page
                                    ? 'bg-dna-cyan/20 text-dna-cyan border border-dna-cyan/40 shadow-[0_0_10px_rgba(0,212,255,0.15)]'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                  }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>

                        <AnimatedButton
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          variant="ghost"
                          className="px-4 py-2"
                        >
                          Next
                        </AnimatedButton>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Variant Evidence Workspace */}
      <VariantEvidenceWorkspace variant={selectedVariant} onClose={() => setSelectedVariant(null)} />

      {/* Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        variantCount={data?.total || 0}
      />

      {/* Scoring Profile Manager Modal */}
      <ScoringProfileManager
        isOpen={isProfileManagerOpen}
        onClose={() => setIsProfileManagerOpen(false)}
        onProfileApplied={() => refetch()}
      />
    </PageTransition>
  )
}
