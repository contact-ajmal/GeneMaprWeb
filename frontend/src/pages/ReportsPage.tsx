import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { listReports, downloadReport } from '../api/reports'
import { getVariantStats } from '../api/variants'
import type { ReportListItem } from '../types/report'
import ReportGeneratorModal from '../components/ReportGeneratorModal'
import PageTransition from '../components/PageTransition'
import GlassCard from '../components/ui/GlassCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import DecodeText from '../components/ui/DecodeText'
import GlowBadge from '../components/ui/GlowBadge'
import {
  FileText,
  Plus,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Stethoscope,
  FlaskConical,
  Heart,
} from 'lucide-react'

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  clinical: { icon: Stethoscope, color: 'text-dna-cyan', bg: 'bg-dna-cyan/10' },
  research: { icon: FlaskConical, color: 'text-dna-amber', bg: 'bg-dna-amber/10' },
  patient: { icon: Heart, color: 'text-dna-green', bg: 'bg-dna-green/10' },
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  complete: { icon: CheckCircle2, color: 'text-dna-green', label: 'Complete' },
  generating: { icon: Loader2, color: 'text-dna-amber', label: 'Generating' },
  failed: { icon: AlertCircle, color: 'text-dna-magenta', label: 'Failed' },
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export default function ReportsPage() {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['reportHistory'],
    queryFn: listReports,
    staleTime: 1000 * 30,
  })

  const { data: statsData } = useQuery({
    queryKey: ['variantStats'],
    queryFn: () => getVariantStats(),
    staleTime: 1000 * 60 * 5,
  })

  const handleDownload = useCallback(async (reportId: string) => {
    try {
      await downloadReport(reportId)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }, [])

  const variantCount = statsData?.total_variants || 0

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <motion.h1
              className="text-xl md:text-2xl font-headline font-bold text-slate-100 mb-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <DecodeText text="Reports" speed={20} />
            </motion.h1>
            <motion.p
              className="text-sm text-slate-400 font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Generate and manage clinical, research, and patient-friendly PDF reports
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <AnimatedButton
              variant="primary"
              onClick={() => setIsGeneratorOpen(true)}
              disabled={variantCount === 0}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Report</span>
            </AnimatedButton>
          </motion.div>
        </div>

        {/* Report Types Overview */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {[
            {
              type: 'clinical',
              label: 'Clinical Report',
              description: 'Professional clinical genetics terminology with ACMG classification details',
              icon: Stethoscope,
              color: 'dna-cyan',
            },
            {
              type: 'research',
              label: 'Research Report',
              description: 'Full technical details, raw annotation data, and statistical summaries',
              icon: FlaskConical,
              color: 'dna-amber',
            },
            {
              type: 'patient',
              label: 'Patient-Friendly',
              description: 'Simplified language with clear explanations for patients and families',
              icon: Heart,
              color: 'dna-green',
            },
          ].map((item, i) => (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            >
              <GlassCard
                variant="interactive"
                className="p-5 cursor-pointer"
                onClick={() => setIsGeneratorOpen(true)}
              >
                <div className={`w-10 h-10 rounded-xl bg-${item.color}/10 flex items-center justify-center mb-3 border border-${item.color}/20`}>
                  <item.icon className={`w-5 h-5 text-${item.color}`} />
                </div>
                <h3 className="text-sm font-headline font-semibold text-slate-200 mb-1">
                  {item.label}
                </h3>
                <p className="text-xs text-slate-500 font-body leading-relaxed">
                  {item.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Report History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <GlassCard variant="elevated" className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-bg-tertiary/30">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-headline font-semibold text-slate-200">
                  Report History
                </h2>
                {reports && reports.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-dna-cyan/10 text-dna-cyan text-xs font-mono">
                    {reports.length}
                  </span>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-dna-cyan/30 border-t-dna-cyan rounded-full animate-spin" />
                  <span className="text-sm text-slate-400 font-body">Loading reports...</span>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && (!reports || reports.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-dna-cyan/20 to-dna-magenta/20 rounded-full flex items-center justify-center shadow-glow-cyan">
                  <FileText className="w-8 h-8 text-dna-cyan" />
                </div>
                <p className="text-slate-300 text-sm font-headline font-semibold mb-2">
                  No reports generated yet
                </p>
                <p className="text-slate-500 text-sm font-body mb-6 max-w-sm">
                  {variantCount > 0
                    ? `You have ${variantCount.toLocaleString()} variants ready. Generate your first report to get started.`
                    : 'Upload a VCF file first, then generate a report from your variant data.'}
                </p>
                {variantCount > 0 && (
                  <AnimatedButton
                    variant="primary"
                    onClick={() => setIsGeneratorOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Generate First Report</span>
                  </AnimatedButton>
                )}
              </div>
            )}

            {/* Report List */}
            {!isLoading && reports && reports.length > 0 && (
              <div className="divide-y divide-slate-700/30">
                <AnimatePresence>
                  {reports.map((report: ReportListItem, index: number) => {
                    const type = typeConfig[report.report_type] || typeConfig.clinical
                    const status = statusConfig[report.status] || statusConfig.complete
                    const TypeIcon = type.icon
                    const StatusIcon = status.icon

                    return (
                      <motion.div
                        key={report.report_id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.3 }}
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {/* Type Icon */}
                          <div className={`w-10 h-10 flex-shrink-0 rounded-xl ${type.bg} flex items-center justify-center`}>
                            <TypeIcon className={`w-5 h-5 ${type.color}`} />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-mono text-slate-200 truncate">
                                {report.report_id}
                              </span>
                              <GlowBadge
                                variant={
                                  report.report_type === 'clinical'
                                    ? 'benign'
                                    : report.report_type === 'research'
                                      ? 'vus'
                                      : 'likely-benign'
                                }
                                className="text-[10px] px-2 py-0"
                              >
                                {report.report_type}
                              </GlowBadge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-body">
                              <span>{report.variant_count} variants</span>
                              <span className="text-slate-700">|</span>
                              <span>{formatDate(report.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status + Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className={`flex items-center gap-1.5 ${status.color}`}>
                            <StatusIcon className={`w-4 h-4 ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                            <span className="text-xs font-body">{status.label}</span>
                          </div>

                          {report.status === 'complete' && (
                            <motion.button
                              onClick={() => handleDownload(report.report_id)}
                              className="p-2 rounded-lg hover:bg-dna-cyan/10 text-slate-500 hover:text-dna-cyan transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => {
          setIsGeneratorOpen(false)
          refetch()
        }}
        variantCount={variantCount}
      />
    </PageTransition>
  )
}
