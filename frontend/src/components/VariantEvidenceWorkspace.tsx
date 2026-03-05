import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { getVariantDetail } from '../api/variants'
import { predictAlphaGenome } from '../api/alphagenome'
import type { Variant, VariantDetail, ACMGCriterionDetail, AlphaGenomePrediction, AlphaGenomeOutputType } from '../types/variant'
import GlowBadge from './ui/GlowBadge'
import {
  X, Activity, Zap, MapPin, Dna, FileText, Globe, Hash,
  ExternalLink, Check, Minus, AlertTriangle, Star,
  MessageSquare, Clock,
  BarChart3, Shield, StickyNote, Sparkles,
} from 'lucide-react'

interface VariantEvidenceWorkspaceProps {
  variant: Variant | null
  onClose: () => void
}

type TabId = 'overview' | 'acmg' | 'population' | 'annotations' | 'alphagenome' | 'notes'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
  { id: 'acmg', label: 'ACMG', icon: <Shield className="w-4 h-4" /> },
  { id: 'population', label: 'Population', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'annotations', label: 'Annotations', icon: <FileText className="w-4 h-4" /> },
  { id: 'alphagenome', label: 'AlphaGenome', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'notes', label: 'Notes', icon: <StickyNote className="w-4 h-4" /> },
]

// ACMG criteria ordering for grid display
const ACMG_ORDER = [
  'PVS1',
  'PS1', 'PS2', 'PS3', 'PS4',
  'PM1', 'PM2', 'PM3', 'PM4', 'PM5', 'PM6',
  'PP1', 'PP2', 'PP3', 'PP4', 'PP5',
  'BA1',
  'BS1', 'BS2', 'BS3', 'BS4',
  'BP1', 'BP2', 'BP3', 'BP4', 'BP5', 'BP6', 'BP7',
]

const ACMG_LABELS: Record<string, string> = {
  PVS1: 'Null variant in LOF gene',
  PS1: 'Same AA change as pathogenic',
  PS2: 'De novo (confirmed)',
  PS3: 'Functional studies supportive',
  PS4: 'Prevalence in affected > controls',
  PM1: 'Hotspot / functional domain',
  PM2: 'Absent/rare in population DBs',
  PM3: 'In trans with pathogenic variant',
  PM4: 'Protein length change',
  PM5: 'Novel missense at pathogenic pos',
  PM6: 'De novo (unconfirmed)',
  PP1: 'Co-segregation with disease',
  PP2: 'Missense in low benign rate gene',
  PP3: 'Computational: deleterious',
  PP4: 'Phenotype matches gene',
  PP5: 'Reputable source: pathogenic',
  BA1: 'Allele frequency > 5%',
  BS1: 'AF > expected for disorder',
  BS2: 'Observed in healthy adults',
  BS3: 'Functional studies: no effect',
  BS4: 'Lack of segregation',
  BP1: 'Missense in truncating-disease gene',
  BP2: 'In trans/cis with pathogenic',
  BP3: 'In-frame in repetitive region',
  BP4: 'Computational: no impact',
  BP5: 'Variant with alternate cause',
  BP6: 'Reputable source: benign',
  BP7: 'Synonymous, no splice impact',
}

// Review status options
const REVIEW_STATUSES = [
  'Not Reviewed',
  'Reviewed - Agree',
  'Reviewed - Disagree',
  'Flagged',
] as const

type ReviewStatus = (typeof REVIEW_STATUSES)[number]

interface NoteData {
  text: string
  reviewStatus: ReviewStatus
  lastUpdated: string | null
}

function getStoredNotes(variantId: string): NoteData {
  try {
    const raw = localStorage.getItem(`variant_notes_${variantId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* empty */ }
  return { text: '', reviewStatus: 'Not Reviewed', lastUpdated: null }
}

function saveNotes(variantId: string, data: NoteData) {
  localStorage.setItem(`variant_notes_${variantId}`, JSON.stringify(data))
}

export default function VariantEvidenceWorkspace({
  variant,
  onClose,
}: VariantEvidenceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null)

  // Fetch full variant detail when variant is selected
  const { data: detail, isLoading } = useQuery({
    queryKey: ['variantDetail', variant?.id],
    queryFn: () => getVariantDetail(variant!.id),
    enabled: !!variant,
    staleTime: 1000 * 60 * 5,
  })

  // Keyboard navigation
  useEffect(() => {
    if (!variant) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowRight') {
        const idx = TABS.findIndex((t) => t.id === activeTab)
        if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id)
      }
      if (e.key === 'ArrowLeft') {
        const idx = TABS.findIndex((t) => t.id === activeTab)
        if (idx > 0) setActiveTab(TABS[idx - 1].id)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [variant, activeTab, onClose])

  // Reset tab when variant changes
  useEffect(() => {
    setActiveTab('overview')
    setExpandedCriteria(null)
  }, [variant?.id])

  const v = detail || variant

  return (
    <AnimatePresence>
      {variant && (
        <motion.div
          className="fixed inset-0 flex items-stretch justify-end z-50"
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

          {/* Workspace panel */}
          <motion.div
            className="relative flex h-full w-full max-w-5xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left sidebar tabs */}
            <div className="flex flex-col w-14 bg-[#0a0e1a]/95 border-r border-slate-700/50 py-4 gap-1 flex-shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center gap-1 px-1 py-3 mx-1 rounded-lg transition-all duration-200 group relative
                    ${activeTab === tab.id
                      ? 'bg-dna-cyan/15 text-dna-cyan'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    }
                  `}
                  title={tab.label}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      className="absolute left-0 top-1 bottom-1 w-0.5 bg-dna-cyan rounded-r"
                      layoutId="activeTabIndicator"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  {tab.icon}
                  <span className="text-[9px] font-body leading-tight">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col bg-[#0f1628]/98 backdrop-blur-xl overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 border-b border-slate-700/50 px-6 py-4 flex items-center justify-between bg-[#0a0e1a]/60">
                <div className="min-w-0">
                  <h2 className="text-base font-headline font-bold text-slate-100 truncate">
                    Evidence Workspace
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-mono-variant text-dna-cyan">
                      {v?.chrom}:{v?.pos.toLocaleString()}
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="font-mono-variant text-sm px-2 py-0.5 bg-slate-700/50 rounded border border-slate-600/50 text-slate-200">
                      {v?.ref}
                    </span>
                    <span className="text-slate-500 text-sm">&rarr;</span>
                    <span className="font-mono-variant text-sm px-2 py-0.5 bg-dna-cyan/10 text-dna-cyan rounded border border-dna-cyan/30">
                      {v?.alt}
                    </span>
                    {v?.gene_symbol && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-sm font-headline font-semibold text-dna-cyan">
                          {v.gene_symbol}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 glass-panel hover:glass-panel-interactive rounded-lg transition-all group flex-shrink-0 ml-4"
                >
                  <X className="w-5 h-5 text-slate-400 group-hover:text-dna-cyan transition-colors" />
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <LoadingState />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="p-6"
                    >
                      {activeTab === 'overview' && v && <OverviewTab variant={v} detail={detail} />}
                      {activeTab === 'acmg' && detail && <ACMGTab detail={detail} expanded={expandedCriteria} setExpanded={setExpandedCriteria} />}
                      {activeTab === 'acmg' && !detail && <NoDataMessage message="Loading ACMG classification..." />}
                      {activeTab === 'population' && detail && <PopulationTab detail={detail} />}
                      {activeTab === 'population' && !detail && <NoDataMessage message="Loading population data..." />}
                      {activeTab === 'annotations' && v && <AnnotationsTab variant={v} detail={detail} />}
                      {activeTab === 'alphagenome' && v && <AlphaGenomeTab variant={v} />}
                      {activeTab === 'notes' && v && <NotesTab variantId={v.id} />}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---- Loading & placeholder components ----

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-dna-cyan/30 border-t-dna-cyan rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-body">Loading evidence data...</span>
      </div>
    </div>
  )
}

function NoDataMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-slate-500 font-body">
      {message}
    </div>
  )
}

// ---- Tab 1: Overview ----

function OverviewTab({ variant, detail }: { variant: Variant; detail: VariantDetail | undefined }) {
  const getRiskSeverity = (score: number | null): number => {
    if (score === null) return 0
    if (score >= 12) return 9
    if (score >= 8) return 7
    if (score >= 4) return 5
    return 3
  }

  const getRiskLabel = (score: number | null) => {
    if (score === null) return 'Unknown'
    if (score >= 12) return 'High Risk'
    if (score >= 8) return 'Moderate Risk'
    if (score >= 4) return 'Low-Moderate'
    return 'Low Risk'
  }

  const getRiskBarColor = (score: number) => {
    if (score >= 12) return 'from-dna-magenta to-red-500'
    if (score >= 8) return 'from-dna-amber to-orange-500'
    if (score >= 4) return 'from-yellow-400 to-dna-amber'
    return 'from-dna-green to-emerald-400'
  }

  const maxScore = 16

  return (
    <div className="space-y-6">
      {/* Variant identity card */}
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Dna className="w-5 h-5 text-dna-cyan" />
          Variant Identity
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoItem icon={<Hash className="w-4 h-4" />} label="Chromosome" value={variant.chrom} />
          <InfoItem icon={<MapPin className="w-4 h-4" />} label="Position" value={variant.pos.toLocaleString()} />
          <InfoItem label="Gene" value={variant.gene_symbol || 'N/A'} highlight={!!variant.gene_symbol} />
          <InfoItem label="Transcript" value={variant.transcript_id || 'N/A'} mono />
          <InfoItem label="Consequence" value={variant.consequence?.replace(/_/g, ' ') || 'N/A'} />
          <InfoItem label="Protein Change" value={variant.protein_change || 'N/A'} mono highlight={!!variant.protein_change} />
          {variant.rs_id && <InfoItem label="dbSNP" value={variant.rs_id} mono highlight />}
        </div>
      </motion.div>

      {/* Risk score */}
      {variant.risk_score !== null && (
        <motion.div
          className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-headline font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-dna-cyan" />
              Risk Score
            </h3>
            <GlowBadge variant="score" severity={getRiskSeverity(variant.risk_score)}>
              {getRiskLabel(variant.risk_score)}
            </GlowBadge>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${getRiskBarColor(variant.risk_score!)} rounded-full shadow-glow-cyan-sm`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(100, (variant.risk_score! / maxScore) * 100)}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
            <span className="text-xl font-headline font-bold text-slate-100 w-10 text-right">
              {variant.risk_score}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-body">Score range: 0&ndash;{maxScore}</p>
        </motion.div>
      )}

      {/* AI Summary */}
      {variant.ai_summary && (
        <motion.div
          className="relative rounded-xl p-5 overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(255, 51, 102, 0.08) 100%)',
            border: '1px solid',
            borderImage: 'linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(255, 51, 102, 0.3)) 1',
          }}
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-dna-cyan/20 to-dna-magenta/20 rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow-cyan-sm">
              <Zap className="w-5 h-5 text-dna-cyan" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-headline font-semibold text-slate-100 mb-2">
                AI Clinical Interpretation
              </h3>
              <p className="text-slate-300 leading-relaxed font-body text-sm">{variant.ai_summary}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick links */}
      {detail?.external_links && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-dna-green" />
            External Databases
          </h3>
          <div className="flex flex-wrap gap-2">
            {detail.external_links.clinvar && (
              <ExternalLinkButton href={detail.external_links.clinvar} label="ClinVar" />
            )}
            {detail.external_links.gnomad && (
              <ExternalLinkButton href={detail.external_links.gnomad} label="gnomAD" />
            )}
            {detail.external_links.ensembl && (
              <ExternalLinkButton href={detail.external_links.ensembl} label="Ensembl" />
            )}
            {detail.external_links.pubmed && (
              <ExternalLinkButton href={detail.external_links.pubmed} label="PubMed" />
            )}
            {detail.external_links.uniprot && (
              <ExternalLinkButton href={detail.external_links.uniprot} label="UniProt" />
            )}
          </div>
        </motion.div>
      )}

      {/* ACMG classification preview */}
      {detail?.acmg_criteria && (
        <motion.div
          className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-headline font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-dna-cyan" />
              ACMG Classification
            </h3>
            <ClassificationBadge classification={detail.acmg_criteria.classification} />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-body">
            {detail.acmg_criteria.classification_reason}
          </p>
          {detail.acmg_criteria.criteria_met.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {detail.acmg_criteria.criteria_met.map((c) => (
                <span
                  key={c}
                  className={`text-xs font-mono-variant px-2 py-0.5 rounded border ${getCriterionColor(c)}`}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ---- Tab 2: ACMG Classification ----

function ACMGTab({
  detail,
  expanded,
  setExpanded,
}: {
  detail: VariantDetail
  expanded: string | null
  setExpanded: (c: string | null) => void
}) {
  const acmg = detail.acmg_criteria
  if (!acmg) return <NoDataMessage message="ACMG classification not available" />

  return (
    <div className="space-y-6">
      {/* Classification result */}
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-headline font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-dna-cyan" />
            Classification Result
          </h3>
          <ClassificationBadge classification={acmg.classification} size="lg" />
        </div>
        <p className="text-sm text-slate-300 font-body">{acmg.classification_reason}</p>
        <div className="mt-3 p-3 bg-dna-amber/5 border border-dna-amber/20 rounded-lg">
          <p className="text-xs text-dna-amber font-body flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            This is an automated preliminary assessment. Clinical review is required before use in patient care.
          </p>
        </div>
      </motion.div>

      {/* Pathogenic criteria */}
      <div>
        <h4 className="text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Pathogenic Evidence
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ACMG_ORDER.filter((c) => c.startsWith('P')).map((code) => (
            <CriterionCard
              key={code}
              code={code}
              detail={acmg.criteria_details[code]}
              isExpanded={expanded === code}
              onClick={() => setExpanded(expanded === code ? null : code)}
            />
          ))}
        </div>
      </div>

      {/* Benign criteria */}
      <div>
        <h4 className="text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Benign Evidence
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ACMG_ORDER.filter((c) => c.startsWith('B')).map((code) => (
            <CriterionCard
              key={code}
              code={code}
              detail={acmg.criteria_details[code]}
              isExpanded={expanded === code}
              onClick={() => setExpanded(expanded === code ? null : code)}
            />
          ))}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && acmg.criteria_details[expanded] && (
          <motion.div
            className="glass-panel-elevated rounded-xl p-4 border border-dna-cyan/20"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-variant text-dna-cyan font-bold text-sm">{expanded}</span>
              <StrengthBadge strength={acmg.criteria_details[expanded].strength} />
            </div>
            <p className="text-sm text-slate-200 font-body mb-1">
              {ACMG_LABELS[expanded] || expanded}
            </p>
            <p className="text-xs text-slate-400 font-body">
              {acmg.criteria_details[expanded].evidence || 'No evidence available'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CriterionCard({
  code,
  detail,
  isExpanded,
  onClick,
}: {
  code: string
  detail: ACMGCriterionDetail | undefined
  isExpanded: boolean
  onClick: () => void
}) {
  const met = detail?.met ?? false
  const hasEvidence = detail?.evidence === 'Insufficient data' ? false : !!detail?.evidence

  return (
    <button
      onClick={onClick}
      className={`
        rounded-lg p-2.5 text-left transition-all duration-200 border
        ${met
          ? 'bg-dna-green/10 border-dna-green/30 hover:border-dna-green/50'
          : hasEvidence
            ? 'bg-slate-800/30 border-slate-600/30 hover:border-slate-500/50'
            : 'bg-slate-800/20 border-slate-700/20 hover:border-slate-600/30'
        }
        ${isExpanded ? 'ring-1 ring-dna-cyan/40' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <span className={`font-mono-variant text-xs font-bold ${met ? 'text-dna-green' : 'text-slate-500'}`}>
          {code}
        </span>
        {met ? (
          <Check className="w-3.5 h-3.5 text-dna-green" />
        ) : (
          <Minus className="w-3.5 h-3.5 text-slate-600" />
        )}
      </div>
      <p className="text-[10px] text-slate-500 mt-1 leading-tight font-body line-clamp-2">
        {ACMG_LABELS[code] || code}
      </p>
    </button>
  )
}

// ---- Tab 3: Population Frequencies ----

function PopulationTab({ detail }: { detail: VariantDetail }) {
  const pop = detail.population_frequencies
  if (!pop) return <NoDataMessage message="No population frequency data available" />

  const allNull = Object.values(pop).every((v) => v === null)
  if (allNull) {
    return (
      <div className="space-y-6">
        <motion.div
          className="glass-panel rounded-xl p-8 border border-slate-700/30 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-headline font-semibold text-slate-300 mb-1">
            Not observed in gnomAD
          </h3>
          <p className="text-xs text-slate-500 font-body">
            This variant has not been observed in the gnomAD population database,
            suggesting it may be extremely rare or novel.
          </p>
        </motion.div>
      </div>
    )
  }

  const populations: { key: keyof typeof pop; label: string; color: string }[] = [
    { key: 'overall', label: 'Overall', color: '#00d4ff' },
    { key: 'african', label: 'African / African-American', color: '#ff3366' },
    { key: 'east_asian', label: 'East Asian', color: '#00ff88' },
    { key: 'european', label: 'European (non-Finnish)', color: '#ffaa00' },
    { key: 'latino', label: 'Latino / Admixed American', color: '#a855f7' },
    { key: 'south_asian', label: 'South Asian', color: '#06b6d4' },
  ]

  // Find max value for scaling
  const values = populations.map((p) => pop[p.key]).filter((v): v is number => v !== null)
  const maxVal = Math.max(...values, 0.001)

  return (
    <div className="space-y-6">
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-5 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-dna-cyan" />
          Population Allele Frequencies
        </h3>

        <div className="space-y-4">
          {populations.map((p, i) => {
            const val = pop[p.key]
            const pct = val !== null ? (val / maxVal) * 100 : 0
            return (
              <motion.div
                key={p.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-body text-slate-400">{p.label}</span>
                  <span className="text-xs font-mono-variant text-slate-300">
                    {val !== null ? val.toExponential(3) : 'N/A'}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-800/60 rounded-full overflow-hidden">
                  {val !== null && (
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: p.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 1)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 + 0.2, ease: 'easeOut' }}
                    />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Threshold reference lines */}
        <div className="mt-6 pt-4 border-t border-slate-700/30">
          <p className="text-xs text-slate-500 font-body mb-2">Pathogenicity AF Thresholds</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-dna-magenta" />
              <span className="text-xs font-mono-variant text-slate-400">0.01 (BS1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-dna-amber" />
              <span className="text-xs font-mono-variant text-slate-400">0.001 (rare)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-dna-green" />
              <span className="text-xs font-mono-variant text-slate-400">0.0001 (PM2)</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ---- Tab 4: Annotation Details ----

function AnnotationsTab({ variant, detail }: { variant: Variant; detail: VariantDetail | undefined }) {
  return (
    <div className="space-y-6">
      {/* Ensembl */}
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Dna className="w-5 h-5 text-dna-cyan" />
          Ensembl VEP
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <KVItem label="Gene Symbol" value={variant.gene_symbol} />
          <KVItem label="Transcript ID" value={variant.transcript_id} />
          <KVItem label="Consequence" value={variant.consequence?.replace(/_/g, ' ')} />
          <KVItem label="Protein Change" value={variant.protein_change} />
        </div>
      </motion.div>

      {/* ClinVar */}
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-dna-magenta" />
          ClinVar
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <KVItem label="Clinical Significance" value={variant.clinvar_significance} clinvar />
          <KVItem label="Review Status" value={variant.clinvar_review_status} />
          <div className="col-span-2">
            <KVItem label="Condition" value={variant.clinvar_condition} />
          </div>
        </div>
        {variant.clinvar_review_status && (
          <div className="mt-3 flex items-center gap-1">
            <ReviewStars status={variant.clinvar_review_status} />
          </div>
        )}
      </motion.div>

      {/* gnomAD */}
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5 text-dna-green" />
          gnomAD
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <KVItem label="Allele Frequency" value={variant.gnomad_af?.toExponential(4)} mono />
          <KVItem label="Allele Count" value={variant.gnomad_ac?.toLocaleString()} mono />
          <KVItem label="Allele Number" value={variant.gnomad_an?.toLocaleString()} mono />
        </div>
      </motion.div>

      {/* External links */}
      {detail?.external_links && (
        <motion.div
          className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-slate-400" />
            Database Links
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(detail.external_links).map(
              ([key, url]) =>
                url && (
                  <ExternalLinkButton key={key} href={url} label={key.charAt(0).toUpperCase() + key.slice(1)} />
                ),
            )}
          </div>
        </motion.div>
      )}

      {/* Raw metadata */}
      <motion.div
        className="border-t border-slate-700/30 pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-2 gap-3">
          <KVItem label="Variant ID" value={variant.id} mono />
          <KVItem label="Normalized" value={variant.normalized_variant} mono />
          <KVItem label="Quality" value={variant.qual?.toString()} mono />
          <KVItem label="Filter" value={variant.filter_status} />
          <KVItem label="Annotation Status" value={variant.annotation_status} />
          <KVItem label="Created" value={variant.created_at ? new Date(variant.created_at).toLocaleString() : null} />
        </div>
      </motion.div>
    </div>
  )
}

// ---- Tab 5: Notes & Review ----

function NotesTab({ variantId }: { variantId: string }) {
  const [notes, setNotes] = useState<NoteData>(() => getStoredNotes(variantId))

  // Reload notes when variant changes
  useEffect(() => {
    setNotes(getStoredNotes(variantId))
  }, [variantId])

  const handleTextChange = useCallback(
    (text: string) => {
      const updated: NoteData = { ...notes, text, lastUpdated: new Date().toISOString() }
      setNotes(updated)
      saveNotes(variantId, updated)
    },
    [variantId, notes],
  )

  const handleStatusChange = useCallback(
    (reviewStatus: ReviewStatus) => {
      const updated: NoteData = { ...notes, reviewStatus, lastUpdated: new Date().toISOString() }
      setNotes(updated)
      saveNotes(variantId, updated)
    },
    [variantId, notes],
  )

  return (
    <div className="space-y-6">
      {/* Review status */}
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-dna-cyan" />
          Review Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {REVIEW_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-body transition-all duration-200 border
                ${notes.reviewStatus === status
                  ? getReviewStatusStyle(status)
                  : 'border-slate-700/30 text-slate-500 hover:text-slate-300 hover:border-slate-600/50'
                }
              `}
            >
              {status}
            </button>
          ))}
        </div>
        {notes.lastUpdated && (
          <p className="text-xs text-slate-600 mt-3 font-body flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated: {new Date(notes.lastUpdated).toLocaleString()}
          </p>
        )}
      </motion.div>

      {/* Notes textarea */}
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-dna-cyan" />
          Analyst Notes
        </h3>
        <textarea
          value={notes.text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Add your analysis notes here..."
          className="w-full h-48 bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 text-sm text-slate-200 font-body placeholder-slate-600 resize-none focus:outline-none focus:border-dna-cyan/40 focus:shadow-[0_0_12px_rgba(0,212,255,0.08)] transition-all duration-200"
        />
        <p className="text-xs text-slate-600 mt-2 font-body">
          Notes are stored locally in your browser and are not uploaded to the server.
        </p>
      </motion.div>
    </div>
  )
}

// ---- Tab 6: AlphaGenome ----

const OUTPUT_TYPE_OPTIONS: { value: AlphaGenomeOutputType; label: string; description: string }[] = [
  { value: 'RNA_SEQ', label: 'RNA-seq', description: 'Gene expression' },
  { value: 'CAGE', label: 'CAGE', description: 'TSS activity' },
  { value: 'DNASE', label: 'DNase', description: 'Chromatin accessibility' },
  { value: 'CHIP_HISTONE', label: 'ChIP Histone', description: 'Histone marks' },
  { value: 'ATAC', label: 'ATAC-seq', description: 'Open chromatin' },
]

function AlphaGenomeTab({ variant }: { variant: Variant }) {
  const [prediction, setPrediction] = useState<AlphaGenomePrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputType, setOutputType] = useState<AlphaGenomeOutputType>('RNA_SEQ')

  // Reset state when variant changes
  useEffect(() => {
    setPrediction(null)
    setError(null)
    setLoading(false)
  }, [variant.id])

  const handlePredict = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPrediction(null)
    try {
      const result = await predictAlphaGenome(
        variant.chrom,
        variant.pos,
        variant.ref,
        variant.alt,
        outputType,
      )
      setPrediction(result)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Prediction failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [variant, outputType])

  return (
    <div className="space-y-6">
      {/* Header card */}
      <motion.div
        className="relative rounded-xl p-5 overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(0, 212, 255, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-dna-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-1">
              AlphaGenome Variant Effect Prediction
            </h3>
            <p className="text-xs text-slate-400 font-body leading-relaxed">
              Powered by Google DeepMind. Predicts the functional impact of this variant on
              gene expression, chromatin accessibility, and more using a deep learning model
              trained on 1M+ base pair sequences.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Output type selector + run button */}
      <motion.div
        className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Dna className="w-5 h-5 text-dna-cyan" />
          Prediction Settings
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {OUTPUT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutputType(opt.value)}
              disabled={loading}
              className={`
                rounded-lg p-3 text-left transition-all duration-200 border
                ${outputType === opt.value
                  ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/20'
                  : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className={`text-xs font-headline font-bold block ${outputType === opt.value ? 'text-indigo-400' : 'text-slate-400'
                }`}>
                {opt.label}
              </span>
              <span className="text-[10px] text-slate-500 font-body">{opt.description}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handlePredict}
          disabled={loading}
          className={`
            w-full py-3 rounded-xl font-headline font-semibold text-sm transition-all duration-300
            flex items-center justify-center gap-2
            ${loading
              ? 'bg-indigo-500/20 text-indigo-300 cursor-wait border border-indigo-500/20'
              : 'bg-gradient-to-r from-indigo-600 to-dna-cyan text-white hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:-translate-y-0.5 active:translate-y-0'
            }
          `}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full animate-spin" />
              Running AlphaGenome...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run AlphaGenome Prediction
            </>
          )}
        </button>
      </motion.div>

      {/* Error state */}
      {error && (
        <motion.div
          className="rounded-xl p-4 border border-dna-magenta/30 bg-dna-magenta/5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-dna-magenta flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-headline font-semibold text-dna-magenta mb-1">Prediction Failed</p>
              <p className="text-xs text-slate-400 font-body">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {prediction && (
        <>
          {/* Effect score */}
          <motion.div
            className="glass-panel rounded-xl p-5 border border-indigo-500/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-headline font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                Variant Effect Score
              </h3>
              <GlowBadge
                variant="score"
                severity={prediction.variant_effect_score >= 1.0 ? 9 : prediction.variant_effect_score >= 0.5 ? 7 : prediction.variant_effect_score >= 0.2 ? 5 : 3}
              >
                {prediction.variant_effect_score >= 1.0 ? 'High Impact' :
                  prediction.variant_effect_score >= 0.5 ? 'Moderate Impact' :
                    prediction.variant_effect_score >= 0.2 ? 'Low Impact' : 'Minimal Impact'}
              </GlowBadge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full shadow-[0_0_8px_rgba(99,102,241,0.3)] ${prediction.variant_effect_score >= 1.0
                      ? 'bg-gradient-to-r from-dna-magenta to-red-500'
                      : prediction.variant_effect_score >= 0.5
                        ? 'bg-gradient-to-r from-dna-amber to-orange-500'
                        : prediction.variant_effect_score >= 0.2
                          ? 'bg-gradient-to-r from-yellow-400 to-dna-amber'
                          : 'bg-gradient-to-r from-dna-green to-emerald-400'
                      }`}
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.min(100, prediction.variant_effect_score * 50)}%` }}
                    transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <span className="text-xl font-headline font-bold text-slate-100 w-16 text-right">
                {prediction.variant_effect_score.toFixed(3)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-body">
              Mean absolute log₂ fold-change between REF and ALT prediction tracks
            </p>
          </motion.div>

          {/* Track visualization */}
          <motion.div
            className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-dna-cyan" />
              Prediction Tracks — {OUTPUT_TYPE_OPTIONS.find(o => o.value === prediction.output_type)?.label || prediction.output_type}
            </h3>
            <TrackVisualization
              refTracks={prediction.ref_tracks}
              altTracks={prediction.alt_tracks}
            />
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-slate-400 rounded" />
                <span className="text-[10px] text-slate-500 font-body">REF</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-indigo-400 rounded" />
                <span className="text-[10px] text-slate-500 font-body">ALT</span>
              </div>
            </div>
          </motion.div>

          {/* Interval info */}
          <motion.div
            className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-dna-cyan" />
              Prediction Window
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <InfoItem label="Chromosome" value={prediction.interval.chromosome} />
              <InfoItem label="Start" value={prediction.interval.start.toLocaleString()} mono />
              <InfoItem label="End" value={prediction.interval.end.toLocaleString()} mono />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/30">
              <a
                href="https://deepmind.google.com/science/alphagenome"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body
                  bg-indigo-500/5 border border-indigo-500/20 text-indigo-400
                  hover:bg-indigo-500/10 hover:border-indigo-500/40
                  transition-all duration-200"
              >
                <Sparkles className="w-3 h-3" />
                Learn more about AlphaGenome
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        </>
      )}

      {/* Empty state (before running) */}
      {!prediction && !loading && !error && (
        <motion.div
          className="glass-panel rounded-xl p-8 border border-slate-700/30 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-headline font-semibold text-slate-300 mb-1">
            Ready to Predict
          </h3>
          <p className="text-xs text-slate-500 font-body max-w-sm mx-auto">
            Select an output type above and click "Run AlphaGenome Prediction" to
            see how this variant affects regulatory function.
          </p>
        </motion.div>
      )}
    </div>
  )
}

// SVG-based track visualisation for AlphaGenome REF/ALT prediction data
function TrackVisualization({
  refTracks,
  altTracks,
}: {
  refTracks: number[]
  altTracks: number[]
}) {
  const width = 600
  const height = 160
  const padding = { top: 10, right: 10, bottom: 10, left: 10 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Compute scales
  const allValues = [...refTracks, ...altTracks]
  const maxVal = Math.max(...allValues, 1e-8)
  const n = Math.max(refTracks.length, altTracks.length)

  const toX = (i: number) => padding.left + (i / (n - 1)) * plotWidth
  const toY = (v: number) => padding.top + plotHeight - (v / maxVal) * plotHeight

  const buildPath = (data: number[]) => {
    if (data.length === 0) return ''
    let d = `M ${toX(0)} ${toY(data[0])}`
    // Downsample for smooth SVG (every 2 points if very long)
    const step = data.length > 256 ? 2 : 1
    for (let i = step; i < data.length; i += step) {
      d += ` L ${toX(i)} ${toY(data[i])}`
    }
    return d
  }

  const buildAreaPath = (data: number[]) => {
    const linePath = buildPath(data)
    if (!linePath) return ''
    return `${linePath} L ${toX(data.length - 1)} ${toY(0)} L ${toX(0)} ${toY(0)} Z`
  }

  return (
    <div className="w-full overflow-hidden rounded-lg bg-slate-900/50 border border-slate-700/30">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="refGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(148,163,184)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(148,163,184)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(129,140,248)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(129,140,248)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={padding.left}
            y1={toY(maxVal * frac)}
            x2={width - padding.right}
            y2={toY(maxVal * frac)}
            stroke="rgb(51,65,85)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}

        {/* REF area + line */}
        <path d={buildAreaPath(refTracks)} fill="url(#refGradient)" />
        <path
          d={buildPath(refTracks)}
          fill="none"
          stroke="rgb(148,163,184)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.7"
        />

        {/* ALT area + line */}
        <path d={buildAreaPath(altTracks)} fill="url(#altGradient)" />
        <path
          d={buildPath(altTracks)}
          fill="none"
          stroke="rgb(129,140,248)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Variant position marker (center) */}
        <line
          x1={width / 2}
          y1={padding.top}
          x2={width / 2}
          y2={height - padding.bottom}
          stroke="rgb(239,68,68)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <text
          x={width / 2 + 4}
          y={padding.top + 10}
          fill="rgb(239,68,68)"
          fontSize="8"
          fontFamily="monospace"
          opacity="0.8"
        >
          variant
        </text>
      </svg>
    </div>
  )
}

// ---- Shared sub-components ----

function InfoItem({
  label,
  value,
  highlight,
  mono,
  icon,
}: {
  label: string
  value: string | number
  highlight?: boolean
  mono?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="glass-panel rounded-lg p-3 border border-slate-700/30">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-dna-cyan">{icon}</span>}
        <p className="text-xs text-slate-500 font-body">{label}</p>
      </div>
      <p
        className={`font-medium text-sm ${highlight ? 'text-dna-cyan' : 'text-slate-100'} ${mono ? 'font-mono-variant' : 'font-body'}`}
      >
        {value}
      </p>
    </div>
  )
}

function KVItem({
  label,
  value,
  mono,
  clinvar,
}: {
  label: string
  value: string | number | null | undefined
  mono?: boolean
  clinvar?: boolean
}) {
  const getClinvarColor = (sig: string) => {
    const s = sig.toLowerCase()
    if (s.includes('pathogenic') && !s.includes('likely')) return 'text-dna-magenta'
    if (s.includes('likely') && s.includes('pathogenic')) return 'text-amber-400'
    if (s.includes('benign') && !s.includes('likely')) return 'text-dna-green'
    if (s.includes('likely') && s.includes('benign')) return 'text-green-400'
    return 'text-dna-amber'
  }

  const displayValue = value ?? 'N/A'
  const isNA = displayValue === 'N/A'

  return (
    <div className="py-1.5">
      <p className="text-xs text-slate-500 font-body mb-0.5">{label}</p>
      <p
        className={`text-sm ${isNA ? 'text-slate-600' : clinvar && typeof value === 'string' ? getClinvarColor(value) : 'text-slate-200'} ${mono ? 'font-mono-variant break-all' : 'font-body'}`}
      >
        {displayValue}
      </p>
    </div>
  )
}

function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body
        bg-slate-800/40 border border-slate-700/40 text-slate-300
        hover:text-dna-cyan hover:border-dna-cyan/30 hover:bg-dna-cyan/5
        transition-all duration-200"
    >
      {label}
      <ExternalLink className="w-3 h-3" />
    </a>
  )
}

function ClassificationBadge({ classification, size = 'sm' }: { classification: string; size?: 'sm' | 'lg' }) {
  const s = classification.toLowerCase()
  let colors = 'bg-dna-amber/15 text-dna-amber border-dna-amber/30'
  if (s.includes('pathogenic') && !s.includes('likely')) colors = 'bg-dna-magenta/15 text-dna-magenta border-dna-magenta/30'
  else if (s.includes('likely') && s.includes('pathogenic')) colors = 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  else if (s.includes('benign') && !s.includes('likely')) colors = 'bg-dna-green/15 text-dna-green border-dna-green/30'
  else if (s.includes('likely') && s.includes('benign')) colors = 'bg-green-400/15 text-green-400 border-green-400/30'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-headline font-semibold ${colors} ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
        }`}
    >
      {classification}
    </span>
  )
}

function StrengthBadge({ strength }: { strength: string }) {
  const label = strength.replace(/_/g, ' ')
  const colors: Record<string, string> = {
    very_strong: 'bg-dna-magenta/10 text-dna-magenta border-dna-magenta/30',
    strong: 'bg-dna-amber/10 text-dna-amber border-dna-amber/30',
    moderate: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
    supporting: 'bg-slate-400/10 text-slate-400 border-slate-600/30',
    standalone: 'bg-dna-green/10 text-dna-green border-dna-green/30',
  }
  return (
    <span className={`text-[10px] font-body px-2 py-0.5 rounded border ${colors[strength] || colors.supporting}`}>
      {label}
    </span>
  )
}

function ReviewStars({ status }: { status: string }) {
  const s = status.toLowerCase()
  let stars = 0
  if (s.includes('practice guideline')) stars = 4
  else if (s.includes('expert panel')) stars = 3
  else if (s.includes('multiple submitters') && s.includes('no conflicts')) stars = 2
  else if (s.includes('single submitter') || s.includes('criteria provided')) stars = 1

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= stars ? 'text-dna-amber fill-dna-amber' : 'text-slate-700'}`}
        />
      ))}
      <span className="text-xs text-slate-500 font-body ml-1.5">ClinVar review</span>
    </div>
  )
}

function getCriterionColor(code: string): string {
  if (code.startsWith('PVS')) return 'bg-dna-magenta/10 text-dna-magenta border-dna-magenta/30'
  if (code.startsWith('PS')) return 'bg-red-400/10 text-red-400 border-red-400/30'
  if (code.startsWith('PM')) return 'bg-dna-amber/10 text-dna-amber border-dna-amber/30'
  if (code.startsWith('PP')) return 'bg-blue-400/10 text-blue-400 border-blue-400/30'
  if (code.startsWith('BA')) return 'bg-dna-green/10 text-dna-green border-dna-green/30'
  if (code.startsWith('BS')) return 'bg-green-400/10 text-green-400 border-green-400/30'
  if (code.startsWith('BP')) return 'bg-teal-400/10 text-teal-400 border-teal-400/30'
  return 'bg-slate-700/10 text-slate-400 border-slate-600/30'
}

function getReviewStatusStyle(status: ReviewStatus): string {
  switch (status) {
    case 'Reviewed - Agree':
      return 'bg-dna-green/15 text-dna-green border-dna-green/40'
    case 'Reviewed - Disagree':
      return 'bg-dna-magenta/15 text-dna-magenta border-dna-magenta/40'
    case 'Flagged':
      return 'bg-dna-amber/15 text-dna-amber border-dna-amber/40'
    default:
      return 'bg-slate-700/30 text-slate-300 border-slate-600/40'
  }
}
