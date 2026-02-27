import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pill,
  AlertTriangle,
  ChevronRight,
  Dna,
  FlaskConical,
  BookOpen,
  Search,
  ArrowUpDown,
  ShieldAlert,
  Zap,
  Minus,
  TrendingUp,
  ChevronsUp,
  FileText,
} from 'lucide-react'
import { getPharmacogenomics } from '../api/pharmacogenomics'
import GlassCard from '../components/ui/GlassCard'
import DecodeText from '../components/ui/DecodeText'
import PageTransition from '../components/PageTransition'
import type { GeneReference } from '../types/pharmacogenomics'

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const METABOLIZER_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string; icon: typeof Zap }> = {
  Poor: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    glow: '0 0 20px rgba(239,68,68,0.2)',
    icon: ShieldAlert,
  },
  Intermediate: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: '0 0 20px rgba(245,158,11,0.2)',
    icon: AlertTriangle,
  },
  Normal: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: '0 0 20px rgba(16,185,129,0.2)',
    icon: Minus,
  },
  Rapid: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    glow: '0 0 20px rgba(59,130,246,0.2)',
    icon: TrendingUp,
  },
  'Ultra-rapid': {
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    glow: '0 0 20px rgba(168,85,247,0.2)',
    icon: ChevronsUp,
  },
  Sensitivity: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    glow: '0 0 20px rgba(251,113,133,0.2)',
    icon: Zap,
  },
}

const getMetabolizerConfig = (status: string) =>
  METABOLIZER_CONFIG[status] ?? METABOLIZER_CONFIG.Normal

type SortKey = 'drug' | 'category' | 'impact' | 'metabolizer_status' | 'guideline'
type SortDir = 'asc' | 'desc'

// ────────────────────────────────────────────────────────────
// Page Component
// ────────────────────────────────────────────────────────────

export default function PharmacogenomicsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pharmacogenomics'],
    queryFn: getPharmacogenomics,
    staleTime: 1000 * 60 * 5,
  })

  const [drugFilter, setDrugFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('drug')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [expandedGenes, setExpandedGenes] = useState<Set<string>>(new Set())

  // Derive unique categories
  const categories = useMemo(() => {
    if (!data) return []
    const cats = new Set(data.drug_interactions.map((d) => d.category))
    return Array.from(cats).sort()
  }, [data])

  // Filtered + sorted drug interactions
  const filteredInteractions = useMemo(() => {
    if (!data) return []
    let items = [...data.drug_interactions]

    if (drugFilter) {
      const q = drugFilter.toLowerCase()
      items = items.filter(
        (d) =>
          d.drug.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.impact.toLowerCase().includes(q),
      )
    }
    if (categoryFilter !== 'all') {
      items = items.filter((d) => d.category === categoryFilter)
    }

    items.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const cmp = aVal.localeCompare(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return items
  }, [data, drugFilter, categoryFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleGene = (gene: string) =>
    setExpandedGenes((prev) => {
      const next = new Set(prev)
      next.has(gene) ? next.delete(gene) : next.add(gene)
      return next
    })

  // ── Loading skeleton ──────────────────────────────────────
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="skeleton-shimmer w-10 h-10 rounded-xl" />
            <div className="skeleton-shimmer h-8 w-64 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-xl p-6 space-y-3">
                <div className="skeleton-shimmer h-4 w-1/2 rounded" />
                <div className="skeleton-shimmer h-8 w-1/3 rounded" />
                <div className="skeleton-shimmer h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
          <div className="glass-panel rounded-xl p-6 space-y-4">
            <div className="skeleton-shimmer h-5 w-1/4 rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-12 w-full rounded" />
            ))}
          </div>
        </div>
      </PageTransition>
    )
  }

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <PageTransition>
        <GlassCard variant="elevated" className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-dna-magenta mx-auto mb-4" />
          <h2 className="text-xl font-headline font-bold text-slate-100 mb-2">
            Failed to Load Pharmacogenomics Data
          </h2>
          <p className="text-slate-400 font-body">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </GlassCard>
      </PageTransition>
    )
  }

  // ── Empty state ───────────────────────────────────────────
  if (!data || data.pgx_variants.length === 0) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <Header pgxCount={0} />
          <GlassCard variant="elevated" className="p-12 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <Pill className="w-16 h-16 text-slate-600 mx-auto mb-6" />
            </motion.div>
            <h2 className="text-2xl font-headline font-bold text-slate-200 mb-3">
              No Pharmacogenomic Variants Detected
            </h2>
            <p className="text-slate-400 font-body max-w-md mx-auto leading-relaxed">
              No variants matching known pharmacogenes were found in your dataset. Upload a
              VCF containing variants in genes like CYP2C19, CYP2D6, DPYD, or TPMT to see
              drug-gene interactions.
            </p>
          </GlassCard>
        </div>
      </PageTransition>
    )
  }

  // ── Main render ───────────────────────────────────────────
  const geneSummaries = Object.entries(data.gene_summaries)

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Page Header */}
        <Header pgxCount={data.pgx_variants.length} />

        {/* Section 1: Metabolizer Status Cards */}
        <section>
          <SectionTitle icon={Dna} label="Metabolizer Status" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
            {geneSummaries.map(([gene, summary], idx) => {
              const cfg = getMetabolizerConfig(summary.metabolizer_status)
              const Icon = cfg.icon
              return (
                <motion.div
                  key={gene}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                >
                  <GlassCard
                    variant="elevated"
                    className={`p-6 border-l-4 ${cfg.border}`}
                    style={{ boxShadow: cfg.glow }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-headline font-bold text-slate-100">
                        {gene}
                      </h3>
                      <div className={`p-2 rounded-lg ${cfg.bg}`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                    </div>
                    <div className={`text-2xl font-headline font-extrabold mb-1 ${cfg.color}`}>
                      {summary.metabolizer_status}
                    </div>
                    <p className="text-sm text-slate-400 font-body mb-3">
                      {summary.alleles.map((a) => a.allele).join(', ')}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-body">
                      <span>
                        {summary.drug_count} drug{summary.drug_count !== 1 ? 's' : ''} affected
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        {summary.alleles.length} allele{summary.alleles.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Section 2: Drug Interaction Table */}
        <section>
          <SectionTitle icon={FlaskConical} label="Drug Interactions" />

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={drugFilter}
                onChange={(e) => setDrugFilter(e.target.value)}
                placeholder="Search drugs, categories..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-transparent border border-slate-700/50 text-slate-200 placeholder-slate-500 font-body text-sm focus:outline-none focus:border-dna-cyan/50 focus:shadow-glow-cyan-sm transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg bg-bg-tertiary border border-slate-700/50 text-slate-200 font-body text-sm focus:outline-none focus:border-dna-cyan/50 transition-all cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <GlassCard variant="elevated" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="w-10 px-4 py-3" />
                    {([
                      ['drug', 'Drug'],
                      ['category', 'Category'],
                      ['metabolizer_status', 'Status'],
                      ['impact', 'Clinical Impact'],
                      ['guideline', 'Guideline'],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className="px-4 py-3 text-left text-xs font-body font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-dna-cyan transition-colors select-none"
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? 'text-dna-cyan' : 'text-slate-600'}`} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filteredInteractions.map((ix, idx) => {
                    const rowId = `${ix.drug}-${idx}`
                    const isExpanded = expandedRows.has(rowId)
                    const isCritical = /CONTRAINDICATED|AVOID|LIFE-THREATENING|FATAL/i.test(ix.impact)
                    const isWarning = /reduce|monitor|consider|increased/i.test(ix.impact)
                    const cfg = getMetabolizerConfig(ix.metabolizer_status)

                    return (
                      <motion.tr
                        key={rowId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group cursor-pointer hover:bg-white/[0.02] transition-colors"
                        onClick={() => toggleRow(rowId)}
                      >
                        <td className="px-4 py-3">
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </motion.div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isCritical && (
                              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                            <span className="font-body font-medium text-slate-100">{ix.drug}</span>
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
                                  <p className="text-xs text-slate-500 font-body mb-1">Mechanism</p>
                                  <p className="text-sm text-slate-300 font-body">{ix.interaction}</p>
                                  <p className="text-xs text-slate-500 font-body mt-2 mb-1">Recommendation</p>
                                  <p className={`text-sm font-body ${isCritical ? 'text-red-400 font-semibold' : 'text-slate-300'}`}>
                                    {ix.impact}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400 font-body">{ix.category}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                            {ix.metabolizer_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm font-body ${
                              isCritical
                                ? 'text-red-400 font-semibold'
                                : isWarning
                                  ? 'text-amber-400'
                                  : 'text-slate-300'
                            }`}
                          >
                            {ix.impact.length > 60 ? ix.impact.slice(0, 57) + '...' : ix.impact}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-dna-cyan/70 font-mono-variant px-2 py-1 rounded bg-dna-cyan/5">
                            {ix.guideline}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                  {filteredInteractions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 font-body">
                        No drug interactions match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </section>

        {/* Section 3: AI Clinical Summary */}
        <section>
          <SectionTitle icon={FileText} label="Clinical Summary" />
          <GlassCard variant="elevated" className="p-6 mt-4">
            <div className="prose prose-invert prose-sm max-w-none font-body">
              {data.summary.split('\n').map((line, i) => {
                if (line.startsWith('**CRITICAL')) {
                  return (
                    <div key={i} className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-red-300 font-semibold">{line.replace(/\*\*/g, '')}</span>
                    </div>
                  )
                }
                if (line.startsWith('  - ')) {
                  return (
                    <div key={i} className="ml-6 flex items-start gap-2 py-0.5">
                      <span className="text-red-400 mt-1">&#8226;</span>
                      <span className="text-red-300 text-sm">{line.slice(4)}</span>
                    </div>
                  )
                }
                if (line.startsWith('- **')) {
                  const parts = line.replace(/^- /, '').split(':')
                  const gene = parts[0].replace(/\*\*/g, '')
                  const rest = parts.slice(1).join(':')
                  return (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <Dna className="w-4 h-4 text-dna-cyan flex-shrink-0 mt-0.5" />
                      <span>
                        <span className="text-dna-cyan font-semibold">{gene}:</span>
                        <span className="text-slate-300">{rest}</span>
                      </span>
                    </div>
                  )
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return (
                    <p key={i} className="text-amber-400 font-semibold mt-3">
                      {line.replace(/\*\*/g, '')}
                    </p>
                  )
                }
                if (line.includes('**')) {
                  const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
                  return (
                    <p key={i} className="text-slate-300" dangerouslySetInnerHTML={{ __html: formatted }} />
                  )
                }
                if (line.trim() === '') return <div key={i} className="h-2" />
                return <p key={i} className="text-slate-300">{line}</p>
              })}
            </div>
          </GlassCard>
        </section>

        {/* Section 4: Allele Function Reference */}
        <section>
          <SectionTitle icon={BookOpen} label="Allele Function Reference" />
          <div className="space-y-3 mt-4">
            {data.allele_reference.map((geneRef) => (
              <GeneReferenceCard
                key={geneRef.gene}
                geneRef={geneRef}
                isExpanded={expandedGenes.has(geneRef.gene)}
                onToggle={() => toggleGene(geneRef.gene)}
              />
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  )
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function Header({ pgxCount }: { pgxCount: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <motion.div
          className="w-12 h-12 bg-gradient-to-br from-purple-500 to-dna-magenta rounded-xl flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.05, rotate: 5 }}
        >
          <Pill className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-headline font-bold text-slate-100">
            <DecodeText text="Pharmacogenomics" speed={15} />
          </h1>
          <p className="text-sm text-slate-400 font-body">
            Gene-drug interactions &amp; metabolizer analysis
          </p>
        </div>
      </div>
      {pgxCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-dna-cyan/10 border border-dna-cyan/20"
        >
          <Dna className="w-4 h-4 text-dna-cyan" />
          <span className="text-sm font-body font-medium text-dna-cyan">
            {pgxCount} PGx variant{pgxCount !== 1 ? 's' : ''} detected
          </span>
        </motion.div>
      )}
    </div>
  )
}

function SectionTitle({ icon: Icon, label }: { icon: typeof Dna; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-dna-cyan" />
      <h2 className="text-lg font-headline font-semibold text-slate-200">{label}</h2>
    </div>
  )
}

function GeneReferenceCard({
  geneRef,
  isExpanded,
  onToggle,
}: {
  geneRef: GeneReference
  isExpanded: boolean
  onToggle: () => void
}) {
  const alleleEntries = Object.entries(geneRef.alleles)

  return (
    <GlassCard variant="interactive" className="overflow-hidden" onClick={onToggle}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </motion.div>
          <span className="text-base font-headline font-bold text-dna-cyan">{geneRef.gene}</span>
          {geneRef.chromosome && (
            <span className="text-xs text-slate-500 font-mono-variant">chr{geneRef.chromosome}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400 font-body">
          <span>{alleleEntries.length} allele{alleleEntries.length !== 1 ? 's' : ''}</span>
          <span className="text-slate-600">|</span>
          <span>{geneRef.drug_count} drug{geneRef.drug_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/40">
                    <th className="text-left py-2 px-3 text-xs font-body text-slate-500 uppercase">Allele</th>
                    <th className="text-left py-2 px-3 text-xs font-body text-slate-500 uppercase">rsID</th>
                    <th className="text-left py-2 px-3 text-xs font-body text-slate-500 uppercase">Change</th>
                    <th className="text-left py-2 px-3 text-xs font-body text-slate-500 uppercase">Function</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/20">
                  {alleleEntries.map(([name, info]) => {
                    const fnLower = info.function.toLowerCase()
                    const fnColor = fnLower.includes('no function')
                      ? 'text-red-400'
                      : fnLower.includes('decreased')
                        ? 'text-amber-400'
                        : fnLower.includes('increased') || fnLower.includes('sensitivity')
                          ? 'text-blue-400'
                          : 'text-emerald-400'

                    return (
                      <tr key={name} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2 px-3 font-mono-variant text-slate-200">{name}</td>
                        <td className="py-2 px-3 font-mono-variant text-dna-cyan/70">
                          {info.rsid ?? '—'}
                        </td>
                        <td className="py-2 px-3 font-mono-variant text-slate-400">{info.change}</td>
                        <td className={`py-2 px-3 font-body font-medium ${fnColor}`}>{info.function}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
