import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Stethoscope,
  FlaskConical,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import GlassCard from './ui/GlassCard'
import AnimatedButton from './ui/AnimatedButton'
import GlowBadge from './ui/GlowBadge'
import { generateReport, getReportStatus, downloadReport, listReports } from '../api/reports'
import type { ReportListItem } from '../types/report'

interface ReportGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  variantCount: number
}

const ALL_SECTIONS = [
  { key: 'executive_summary', label: 'Executive Summary', description: 'AI-generated overview of findings' },
  { key: 'methodology', label: 'Methodology', description: 'Pipeline and annotation source details' },
  { key: 'results_summary', label: 'Results Summary', description: 'Statistics, pie chart, bar chart' },
  { key: 'pathogenic_variants', label: 'Pathogenic Variants', description: 'Detailed pathogenic variant table' },
  { key: 'vus_variants', label: 'VUS Variants', description: 'Variants of uncertain significance' },
  { key: 'pharmacogenomic', label: 'Pharmacogenomic', description: 'Drug-gene interaction findings' },
  { key: 'full_variant_list', label: 'Full Variant List', description: 'Compact table of all variants' },
]

const REPORT_TYPES = [
  {
    value: 'clinical' as const,
    label: 'Clinical',
    icon: Stethoscope,
    description: 'Professional clinical genetics terminology',
    color: 'text-dna-cyan',
    border: 'border-dna-cyan/40',
    bg: 'bg-dna-cyan/10',
  },
  {
    value: 'research' as const,
    label: 'Research',
    icon: FlaskConical,
    description: 'Full technical details and raw data',
    color: 'text-dna-amber',
    border: 'border-dna-amber/40',
    bg: 'bg-dna-amber/10',
  },
  {
    value: 'patient' as const,
    label: 'Patient-Friendly',
    icon: Heart,
    description: 'Simplified language, larger font, no raw data',
    color: 'text-dna-green',
    border: 'border-dna-green/40',
    bg: 'bg-dna-green/10',
  },
]

type GenerationState = 'idle' | 'generating' | 'complete' | 'failed'

export default function ReportGeneratorModal({
  isOpen,
  onClose,
  variantCount,
}: ReportGeneratorModalProps) {
  const [reportType, setReportType] = useState<'clinical' | 'research' | 'patient'>('clinical')
  const [selectedSections, setSelectedSections] = useState<string[]>(
    ALL_SECTIONS.map((s) => s.key)
  )
  const [variantScope, setVariantScope] = useState<'all' | 'pathogenic'>('all')
  const [analystName, setAnalystName] = useState('')
  const [generationState, setGenerationState] = useState<GenerationState>('idle')
  const [currentReportId, setCurrentReportId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Fetch report history
  const { data: reportHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['reportHistory'],
    queryFn: listReports,
    enabled: isOpen,
    staleTime: 1000 * 30,
  })

  // Poll report status when generating
  useEffect(() => {
    if (generationState !== 'generating' || !currentReportId) return

    const interval = setInterval(async () => {
      try {
        const status = await getReportStatus(currentReportId)
        if (status.status === 'complete') {
          setGenerationState('complete')
          refetchHistory()
          clearInterval(interval)
        } else if (status.status === 'failed') {
          setGenerationState('failed')
          clearInterval(interval)
        }
      } catch {
        // Keep polling on transient errors
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [generationState, currentReportId, refetchHistory])

  const toggleSection = (key: string) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }

  const handleGenerate = async () => {
    try {
      setGenerationState('generating')
      const result = await generateReport({
        variant_ids: variantScope === 'pathogenic' ? 'all' : 'all', // Backend filters internally
        report_type: reportType,
        include_sections: selectedSections,
        analyst_name: analystName || undefined,
      })
      setCurrentReportId(result.report_id)
    } catch {
      setGenerationState('failed')
    }
  }

  const handleDownload = useCallback(async (reportId: string) => {
    try {
      await downloadReport(reportId)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }, [])

  const handleReset = () => {
    setGenerationState('idle')
    setCurrentReportId(null)
  }

  // Close with escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <GlassCard
              variant="elevated"
              className="p-0 border border-dna-cyan/20 overflow-hidden"
              initial={false}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-dna-cyan/10 border border-dna-cyan/30">
                    <FileText className="w-5 h-5 text-dna-cyan" />
                  </div>
                  <div>
                    <h2 className="text-lg font-headline font-bold text-slate-100">
                      Generate Report
                    </h2>
                    <p className="text-xs text-slate-400 font-body">
                      {variantCount.toLocaleString()} variants available
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Generation State Overlay */}
                {generationState !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {generationState === 'generating' && (
                      <div className="flex flex-col items-center py-8 space-y-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 className="w-12 h-12 text-dna-cyan" />
                        </motion.div>
                        <div className="text-center">
                          <p className="text-slate-200 font-headline font-semibold">
                            Generating Report...
                          </p>
                          <p className="text-sm text-slate-400 font-body mt-1">
                            Building PDF with AI analysis. This may take a moment.
                          </p>
                        </div>
                        {/* Animated progress dots */}
                        <div className="flex space-x-1.5">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 rounded-full bg-dna-cyan"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: i * 0.3,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {generationState === 'complete' && currentReportId && (
                      <div className="flex flex-col items-center py-8 space-y-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <CheckCircle2 className="w-14 h-14 text-dna-green" />
                        </motion.div>
                        <div className="text-center">
                          <p className="text-slate-200 font-headline font-semibold">
                            Report Ready
                          </p>
                          <p className="text-sm text-slate-400 font-body mt-1">
                            ID: {currentReportId}
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <AnimatedButton
                            variant="primary"
                            onClick={() => handleDownload(currentReportId)}
                            className="flex items-center space-x-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download PDF</span>
                          </AnimatedButton>
                          <AnimatedButton variant="ghost" onClick={handleReset}>
                            Generate Another
                          </AnimatedButton>
                        </div>
                      </div>
                    )}

                    {generationState === 'failed' && (
                      <div className="flex flex-col items-center py-8 space-y-4">
                        <AlertCircle className="w-14 h-14 text-dna-magenta" />
                        <div className="text-center">
                          <p className="text-slate-200 font-headline font-semibold">
                            Generation Failed
                          </p>
                          <p className="text-sm text-slate-400 font-body mt-1">
                            Something went wrong. Please try again.
                          </p>
                        </div>
                        <AnimatedButton variant="danger" onClick={handleReset}>
                          Try Again
                        </AnimatedButton>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Configuration Form — only when idle */}
                {generationState === 'idle' && (
                  <>
                    {/* Report Type Selector */}
                    <div>
                      <label className="block text-sm font-body font-medium text-slate-300 mb-3">
                        Report Type
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {REPORT_TYPES.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setReportType(type.value)}
                            className={`
                              p-3 rounded-xl border transition-all duration-200 text-left
                              ${
                                reportType === type.value
                                  ? `${type.bg} ${type.border} ${type.color} shadow-lg`
                                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5'
                              }
                            `}
                          >
                            <type.icon
                              className={`w-5 h-5 mb-2 ${
                                reportType === type.value ? type.color : 'text-slate-500'
                              }`}
                            />
                            <p className="text-sm font-semibold font-headline">{type.label}</p>
                            <p className="text-xs mt-0.5 opacity-70 font-body">
                              {type.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Variant Scope */}
                    <div>
                      <label className="block text-sm font-body font-medium text-slate-300 mb-3">
                        Variant Scope
                      </label>
                      <div className="flex space-x-3">
                        {[
                          { value: 'all' as const, label: 'All Variants' },
                          { value: 'pathogenic' as const, label: 'Pathogenic Only' },
                        ].map((scope) => (
                          <button
                            key={scope.value}
                            onClick={() => setVariantScope(scope.value)}
                            className={`
                              px-4 py-2 rounded-lg border text-sm font-body transition-all duration-200
                              ${
                                variantScope === scope.value
                                  ? 'border-dna-cyan/40 bg-dna-cyan/10 text-dna-cyan'
                                  : 'border-white/10 text-slate-400 hover:border-white/20'
                              }
                            `}
                          >
                            {scope.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section Checkboxes */}
                    <div>
                      <label className="block text-sm font-body font-medium text-slate-300 mb-3">
                        Sections
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_SECTIONS.map((section) => (
                          <label
                            key={section.key}
                            className={`
                              flex items-start space-x-2.5 p-2.5 rounded-lg cursor-pointer
                              border transition-all duration-200
                              ${
                                selectedSections.includes(section.key)
                                  ? 'border-dna-cyan/30 bg-dna-cyan/5'
                                  : 'border-transparent hover:bg-white/5'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSections.includes(section.key)}
                              onChange={() => toggleSection(section.key)}
                              className="mt-0.5 rounded border-slate-600 bg-transparent text-dna-cyan focus:ring-dna-cyan/50 focus:ring-offset-0"
                            />
                            <div>
                              <p className="text-sm text-slate-200 font-body">{section.label}</p>
                              <p className="text-xs text-slate-500 font-body">{section.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Analyst Name */}
                    <div>
                      <label className="block text-sm font-body font-medium text-slate-300 mb-2">
                        Analyst Name <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={analystName}
                        onChange={(e) => setAnalystName(e.target.value)}
                        placeholder="Dr. Jane Smith"
                        className="w-full px-4 py-2.5 rounded-lg bg-transparent border border-white/10 text-slate-200 placeholder-slate-600 font-body text-sm
                                   focus:border-dna-cyan/50 focus:ring-1 focus:ring-dna-cyan/30 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Generate Button */}
                    <AnimatedButton
                      variant="primary"
                      onClick={handleGenerate}
                      disabled={selectedSections.length === 0 || variantCount === 0}
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Generate Report</span>
                    </AnimatedButton>
                  </>
                )}

                {/* Report History */}
                {reportHistory && reportHistory.length > 0 && (
                  <div className="border-t border-white/5 pt-4">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center justify-between w-full text-sm text-slate-400 hover:text-slate-200 transition-colors font-body"
                    >
                      <span className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Recent Reports ({reportHistory.length})</span>
                      </span>
                      {showHistory ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                            {reportHistory.map((report: ReportListItem) => (
                              <div
                                key={report.report_id}
                                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                              >
                                <div className="flex items-center space-x-3">
                                  <FileText className="w-4 h-4 text-slate-500" />
                                  <div>
                                    <p className="text-xs font-mono-variant text-slate-300">
                                      {report.report_id}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-0.5">
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
                                      <span className="text-[10px] text-slate-500 font-body">
                                        {report.variant_count} variants
                                      </span>
                                      {report.created_at && (
                                        <span className="text-[10px] text-slate-600 font-body">
                                          {formatDate(report.created_at)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {report.status === 'complete' && (
                                  <button
                                    onClick={() => handleDownload(report.report_id)}
                                    className="p-1.5 rounded-lg hover:bg-dna-cyan/10 text-dna-cyan transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                {report.status === 'generating' && (
                                  <Loader2 className="w-4 h-4 text-dna-amber animate-spin" />
                                )}
                                {report.status === 'failed' && (
                                  <AlertCircle className="w-4 h-4 text-dna-magenta" />
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
