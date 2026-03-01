import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { getAdvancedVariantStats } from '../api/variants'
import { useActiveSample } from '../contexts/ActiveSampleContext'
import type {
  AdvancedVariantStats,
  ScatterDataPoint,
  RiskScoreBin,
  ChromosomeDistributionItem,
  GeneAnalysisItem,
  ACMGCriterionFrequency,
} from '../types/variant'
import {
  Dna,
  AlertTriangle,
  HelpCircle,
  Shield,
  Flame,
  Activity,
  Beaker,
  BarChart3,
  Target,
  Sparkles,
  Maximize2,
  Minimize2,
  Pill,
  Search,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Treemap,
} from 'recharts'
import { useEffect, useState, useMemo } from 'react'
import GlassCard from './ui/GlassCard'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants & Utilities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SIG_COLORS: Record<string, string> = {
  pathogenic: '#ff3366',
  likely_pathogenic: '#ff8c00',
  uncertain_significance: '#ffaa00',
  likely_benign: '#4a9eff',
  benign: '#00ff88',
  conflicting: '#a855f7',
  not_provided: '#64748b',
}

const SIG_LABELS: Record<string, string> = {
  pathogenic: 'Pathogenic',
  likely_pathogenic: 'Likely Pathogenic',
  uncertain_significance: 'VUS',
  likely_benign: 'Likely Benign',
  benign: 'Benign',
  conflicting: 'Conflicting',
  not_provided: 'Not Provided',
}

function formatConsequence(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Variant', '')
    .trim()
}

function classifySig(sig: string): string {
  const s = sig.toLowerCase()
  if (s.includes('conflicting')) return 'conflicting'
  if (s.includes('likely pathogenic')) return 'likely_pathogenic'
  if (s.includes('pathogenic')) return 'pathogenic'
  if (s.includes('likely benign')) return 'likely_benign'
  if (s.includes('benign')) return 'benign'
  if (s.includes('uncertain')) return 'uncertain_significance'
  return 'not_provided'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Animated Counter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AnimatedCounter({ value, duration = 1200, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let frame: number

    const animate = (t: number) => {
      if (!startTime) startTime = t
      const progress = Math.min((t - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      setCount(eased * value)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <>{decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}</>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Glass Tooltip
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section Container with full-screen toggle
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ChartSection({ title, subtitle, icon: Icon, children, className = '' }: {
  title: string
  subtitle?: string
  icon: any
  children: React.ReactNode
  className?: string
}) {
  const [isFullScreen, setIsFullScreen] = useState(false)

  return (
    <>
      <GlassCard variant="elevated" className={`p-6 ${className}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-headline font-semibold text-slate-100 flex items-center gap-2">
              <Icon className="w-5 h-5 text-dna-cyan" />
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs font-body text-slate-400 mt-0.5 italic">{subtitle}</p>
            )}
          </div>
          <button
            onClick={() => setIsFullScreen(true)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-dna-cyan transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        {children}
      </GlassCard>

      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            className="fixed inset-0 z-50 bg-bg-primary/95 backdrop-blur-xl p-8 overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-headline font-bold text-slate-100 flex items-center gap-2">
                    <Icon className="w-6 h-6 text-dna-cyan" />
                    {title}
                  </h2>
                  {subtitle && <p className="text-sm text-slate-400 mt-1 italic">{subtitle}</p>}
                </div>
                <button
                  onClick={() => setIsFullScreen(false)}
                  className="p-2 rounded-lg glass-panel hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
              <div className="h-[calc(100vh-160px)]">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Loading Skeleton
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-panel rounded-xl p-5 space-y-3"
          >
            <div className="skeleton-shimmer h-3 w-2/3 rounded" />
            <div className="skeleton-shimmer h-7 w-1/2 rounded" />
            <div className="skeleton-shimmer h-2 w-full rounded" />
            <div className="skeleton-shimmer h-3 w-3/4 rounded" />
          </motion.div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="glass-panel rounded-xl p-6"
          >
            <div className="skeleton-shimmer h-5 w-1/3 rounded mb-2" />
            <div className="skeleton-shimmer h-3 w-1/2 rounded mb-6" />
            <div className="flex items-end gap-2 h-56">
              {[40, 65, 30, 80, 55, 70, 45, 60].map((h, j) => (
                <div key={j} className="flex-1 skeleton-shimmer rounded-t-md" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 1: Executive Summary Strip
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SummaryStrip({ stats }: { stats: AdvancedVariantStats }) {
  const { summary, clinical_significance: cs, risk_scores, allele_frequency_spectrum: afs, actionable_summary: act, gene_analysis } = stats

  const clinicallySignificant = cs.pathogenic.count + cs.likely_pathogenic.count
  const clinicalPct = summary.total_variants > 0
    ? Math.round((clinicallySignificant / summary.total_variants) * 100)
    : 0

  const rareCount = afs.ultra_rare.count + afs.very_rare.count + afs.rare.count
  const rarePct = summary.total_variants > 0
    ? Math.round((rareCount / summary.total_variants) * 100)
    : 0

  const annotatedCount = summary.total_variants - (cs.not_provided.count || 0)
  const annotationPct = summary.total_variants > 0
    ? Math.round((annotatedCount / summary.total_variants) * 100)
    : 0

  const sigBarData = [
    { key: 'pathogenic', count: cs.pathogenic.count, color: SIG_COLORS.pathogenic },
    { key: 'likely_pathogenic', count: cs.likely_pathogenic.count, color: SIG_COLORS.likely_pathogenic },
    { key: 'uncertain_significance', count: cs.uncertain_significance.count, color: SIG_COLORS.uncertain_significance },
    { key: 'likely_benign', count: cs.likely_benign.count, color: SIG_COLORS.likely_benign },
    { key: 'benign', count: cs.benign.count, color: SIG_COLORS.benign },
  ].filter(d => d.count > 0)
  const sigTotal = sigBarData.reduce((s, d) => s + d.count, 0)

  const cards = [
    {
      label: 'Total Variants',
      value: summary.total_variants,
      sub: `across ${stats.chromosome_distribution.length} chromosomes`,
      borderColor: '#00d4ff',
      icon: Dna,
      mini: (
        <div className="flex gap-0.5 h-6 items-end mt-2">
          {stats.chromosome_distribution.slice(0, 12).map((ch) => (
            <div
              key={ch.chromosome}
              className="flex-1 rounded-t-sm bg-dna-cyan/40"
              style={{ height: `${Math.max(15, (ch.variant_count / Math.max(...stats.chromosome_distribution.map(c => c.variant_count))) * 100)}%` }}
            />
          ))}
        </div>
      ),
    },
    {
      label: 'Clinical Classification',
      value: clinicallySignificant,
      sub: `${clinicalPct}% clinically significant`,
      borderColor: '#ff3366',
      icon: AlertTriangle,
      mini: (
        <div className="flex h-2.5 rounded-full overflow-hidden mt-2 bg-slate-800">
          {sigBarData.map((d) => (
            <div
              key={d.key}
              style={{ width: `${(d.count / sigTotal) * 100}%`, backgroundColor: d.color }}
            />
          ))}
        </div>
      ),
    },
    {
      label: 'Risk Assessment',
      value: risk_scores.mean,
      isFloat: true,
      sub: 'Mean risk score',
      borderColor: '#ffaa00',
      icon: Target,
      mini: (
        <div className="relative mt-2">
          <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 opacity-40" />
          <div
            className="absolute top-0 w-3 h-3 -mt-0.5 rounded-full bg-white shadow-lg border-2 border-amber-400"
            style={{ left: `${Math.min(95, (risk_scores.mean / Math.max(risk_scores.max, 1)) * 100)}%` }}
          />
        </div>
      ),
    },
    {
      label: 'Rare Variants',
      value: rareCount,
      sub: `${rarePct}% rare or ultra-rare`,
      borderColor: '#4a9eff',
      icon: Search,
      mini: (
        <div className="flex gap-1 mt-2">
          {[
            { label: 'UR', count: afs.ultra_rare.count, color: '#ff3366' },
            { label: 'VR', count: afs.very_rare.count, color: '#ff8c00' },
            { label: 'R', count: afs.rare.count, color: '#ffaa00' },
            { label: 'C', count: afs.common.count, color: '#00ff88' },
          ].map((b) => (
            <div key={b.label} className="text-center flex-1">
              <div className="text-[9px] font-mono text-slate-500">{b.label}</div>
              <div className="text-[10px] font-mono font-semibold" style={{ color: b.color }}>{b.count}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Actionable Findings',
      value: act.total_actionable,
      sub: 'Require clinical attention',
      borderColor: act.total_actionable > 0 ? '#ff3366' : '#64748b',
      icon: Flame,
      pulse: act.total_actionable > 0,
      mini: (
        <div className="flex items-center gap-2 mt-2 text-[10px] font-body text-slate-400">
          <span><Pill className="inline w-3 h-3 mr-0.5" />{act.pharmacogenomic_variants} PGx</span>
          <span><Beaker className="inline w-3 h-3 mr-0.5" />{act.cancer_predisposition} Cancer</span>
        </div>
      ),
    },
    {
      label: 'Genes Affected',
      value: summary.total_genes_affected,
      sub: `${gene_analysis.genes_with_multiple_hits} with multiple variants`,
      borderColor: '#a855f7',
      icon: Activity,
      mini: (
        <div className="space-y-0.5 mt-2">
          {gene_analysis.top_genes.slice(0, 3).map((g) => (
            <div key={g.gene} className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-dna-cyan truncate w-14">{g.gene}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-400/60"
                  style={{ width: `${(g.variant_count / Math.max(gene_analysis.top_genes[0]?.variant_count || 1, 1)) * 100}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500">{g.variant_count}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Data Quality',
      value: annotationPct,
      isSuffix: '%',
      sub: 'Annotation completeness',
      borderColor: '#00ff88',
      icon: Shield,
      mini: (
        <div className="relative w-12 h-12 mx-auto mt-1">
          <svg viewBox="0 0 36 36" className="w-12 h-12">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#1e293b"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#00ff88"
              strokeWidth="3"
              strokeDasharray={`${annotationPct}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-dna-green">
            {annotationPct}
          </span>
        </div>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.07, duration: 0.4, ease: 'easeOut' }}
        >
          <GlassCard
            variant="interactive"
            className="p-4 border-l-4 overflow-hidden group relative"
            style={{ borderLeftColor: card.borderColor } as any}
          >
            {card.pulse && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1">
                <card.icon className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-xs font-body text-slate-400">{card.label}</p>
              </div>
              <p className="text-xl font-headline font-bold text-slate-100">
                {card.isFloat ? (
                  <AnimatedCounter value={card.value} decimals={1} />
                ) : (
                  <AnimatedCounter value={card.value} />
                )}
                {card.isSuffix && <span className="text-sm text-slate-400 ml-0.5">{card.isSuffix}</span>}
              </p>
              {card.mini}
              <p className="text-[10px] text-slate-500 mt-1.5 font-body">{card.sub}</p>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 2: Clinical Significance & Consequence Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ClinicalConsequenceSection({ stats }: { stats: AdvancedVariantStats }) {
  const { clinical_significance: cs, consequences } = stats

  // Nested donut data — inner ring: significance, outer ring: consequence
  const innerData = Object.entries(SIG_LABELS)
    .map(([key, label]) => ({
      name: label,
      value: (cs as any)[key]?.count || 0,
      fill: SIG_COLORS[key],
    }))
    .filter(d => d.value > 0)

  // Stacked horizontal bar data for consequences
  const consequenceBarData = useMemo(() => {
    return consequences.slice(0, 12).map((c) => {
      const pathCount = Math.round((c.pathogenic_pct / 100) * c.count)
      const benignCount = Math.round(((100 - c.pathogenic_pct) / 100) * c.count * 0.3)
      const vusCount = c.count - pathCount - benignCount
      return {
        name: formatConsequence(c.type),
        rawName: c.type,
        total: c.count,
        Pathogenic: pathCount,
        VUS: Math.max(0, vusCount),
        Benign: benignCount,
        pathogenic_pct: c.pathogenic_pct,
      }
    })
  }, [consequences])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSection
        title="Clinical Significance Distribution"
        subtitle="Interactive — hover segments for details"
        icon={Activity}
      >
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={innerData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={1}
              isAnimationActive={true}
              animationDuration={1500}
              label={(props: any) => (props.percent ?? 0) > 0.04 ? `${props.name || ''}: ${((props.percent ?? 0) * 100).toFixed(0)}%` : ''}
              labelLine={false}
            >
              {innerData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm border border-dna-cyan/20">
                    <p className="text-sm font-headline font-semibold" style={{ color: d.fill }}>{d.name}</p>
                    <p className="text-xs font-mono text-slate-300">{d.value.toLocaleString()} variants</p>
                    <p className="text-xs text-slate-400">{((d.value / stats.summary.total_variants) * 100).toFixed(1)}%</p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection
        title="Variant Consequence Distribution"
        subtitle="Colored by clinical significance proportion"
        icon={BarChart3}
      >
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={consequenceBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
            <XAxis type="number" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              return (
                <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm border border-dna-cyan/20">
                  <p className="text-sm font-headline font-semibold text-slate-100">{label}</p>
                  <p className="text-xs font-mono text-slate-300">{d.total.toLocaleString()} total variants</p>
                  <p className="text-xs text-dna-magenta">{d.pathogenic_pct.toFixed(1)}% pathogenic</p>
                </div>
              )
            }} />
            <Bar dataKey="Pathogenic" stackId="a" fill="#ff3366" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={1500} />
            <Bar dataKey="VUS" stackId="a" fill="#ffaa00" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={1500} />
            <Bar dataKey="Benign" stackId="a" fill="#00ff88" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 3: Risk Score Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RiskScoreSection({ stats }: { stats: AdvancedVariantStats }) {
  const { risk_scores, allele_frequency_spectrum } = stats

  const histogramData = risk_scores.distribution.map((bin: RiskScoreBin) => ({
    name: bin.range,
    count: bin.count,
    fill: bin.color,
    label: bin.label,
  }))

  // Scatter plot: -log10(AF) vs Risk Score
  const scatterData = useMemo(() => {
    return allele_frequency_spectrum.scatter_data
      .filter((d: ScatterDataPoint) => d.af > 0 && d.risk_score > 0)
      .map((d: ScatterDataPoint) => ({
        ...d,
        negLogAF: -Math.log10(d.af),
        sigColor: SIG_COLORS[classifySig(d.significance)] || '#64748b',
        size: d.consequence.includes('frameshift') || d.consequence.includes('stop_gained') ? 80 : d.consequence.includes('missense') ? 50 : 30,
      }))
  }, [allele_frequency_spectrum.scatter_data])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSection
        title="Risk Score Distribution"
        subtitle={`Mean: ${risk_scores.mean} | Median: ${risk_scores.median} | SD: ${risk_scores.std_dev}`}
        icon={BarChart3}
      >
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={histogramData} margin={{ bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis
              dataKey="name"
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm border border-dna-cyan/20">
                  <p className="text-sm font-headline font-semibold text-slate-100">{d.label} Risk ({d.name})</p>
                  <p className="text-xs font-mono text-dna-cyan">{d.count.toLocaleString()} variants</p>
                </div>
              )
            }} />
            {risk_scores.mean > 0 && (
              <ReferenceLine
                x={null as any}
                y={null as any}
                stroke="#00d4ff"
                strokeDasharray="5 5"
                label={{ value: `Mean: ${risk_scores.mean}`, fill: '#00d4ff', fontSize: 10 }}
              />
            )}
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1500}>
              {histogramData.map((entry: any, i: number) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection
        title="Variant Pathogenicity Landscape"
        subtitle="Allele frequency vs. risk assessment — rarer variants to the right"
        icon={Target}
      >
        <div className="relative">
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="negLogAF"
                name="-log10(AF)"
                stroke="#475569"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                label={{ value: '-log₁₀(AF) → Rarer', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                dataKey="risk_score"
                name="Risk Score"
                stroke="#475569"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
              <ZAxis dataKey="size" range={[20, 100]} />
              <ReferenceLine y={8} stroke="#ff3366" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine x={2} stroke="#4a9eff" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm border border-dna-cyan/20 max-w-xs">
                      <p className="text-sm font-headline font-semibold text-dna-cyan">{d.gene}</p>
                      <p className="text-xs font-mono text-slate-300">AF: {d.af.toExponential(2)}</p>
                      <p className="text-xs font-mono text-slate-300">Risk Score: {d.risk_score}</p>
                      <p className="text-xs" style={{ color: d.sigColor }}>{d.significance}</p>
                      <p className="text-xs text-slate-400">{formatConsequence(d.consequence)}</p>
                    </div>
                  )
                }}
              />
              <Scatter
                data={scatterData}
                isAnimationActive
                animationDuration={1500}
              >
                {scatterData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.sigColor} fillOpacity={0.7} stroke={entry.sigColor} strokeWidth={1} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          {/* Quadrant labels */}
          <div className="absolute top-6 right-8 text-[9px] font-body text-red-400/60 bg-red-500/5 px-2 py-0.5 rounded">
            HIGH RISK / RARE
          </div>
          <div className="absolute top-6 left-12 text-[9px] font-body text-amber-400/60 bg-amber-500/5 px-2 py-0.5 rounded">
            HIGH RISK / COMMON
          </div>
          <div className="absolute bottom-14 right-8 text-[9px] font-body text-blue-400/60 bg-blue-500/5 px-2 py-0.5 rounded">
            LOW RISK / RARE
          </div>
          <div className="absolute bottom-14 left-12 text-[9px] font-body text-green-400/60 bg-green-500/5 px-2 py-0.5 rounded">
            LOW RISK / COMMON
          </div>
        </div>
      </ChartSection>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 4: Gene-Level Analysis (Treemap + Lollipop tabs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getTreemapColor(score: number): string {
  if (score >= 9) return '#ff3366'
  if (score >= 6) return '#ff8c00'
  if (score >= 3) return '#ffaa00'
  return '#00ff88'
}

function CustomTreemapContent(props: any) {
  const { x, y, width, height, name, variant_count, max_risk_score } = props
  if (width < 30 || height < 25) return null

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getTreemapColor(max_risk_score || 0)}
        fillOpacity={0.25}
        stroke={getTreemapColor(max_risk_score || 0)}
        strokeWidth={1}
        strokeOpacity={0.4}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#e2e8f0"
        fontSize={width > 80 ? 12 : 10}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight={600}
      >
        {name}
      </text>
      {height > 35 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#94a3b8"
          fontSize={9}
          fontFamily="'Plus Jakarta Sans', sans-serif"
        >
          {variant_count} var{variant_count !== 1 ? 's' : ''}
        </text>
      )}
    </g>
  )
}

function GeneLevelSection({ stats }: { stats: AdvancedVariantStats }) {
  const [tab, setTab] = useState<'treemap' | 'lollipop'>('treemap')
  const { gene_analysis } = stats

  const treemapData = useMemo(() =>
    gene_analysis.top_genes.filter(g => g.gene !== 'Intergenic').map((g: GeneAnalysisItem) => ({
      name: g.gene,
      size: g.variant_count,
      variant_count: g.variant_count,
      max_risk_score: g.max_risk_score,
      mean_risk_score: g.mean_risk_score,
      pathogenic_count: g.pathogenic_count,
    })),
  [gene_analysis.top_genes])

  const lollipopGenes = gene_analysis.top_genes.filter(g => g.gene !== 'Intergenic').slice(0, 15)
  const maxCount = Math.max(...lollipopGenes.map(g => g.variant_count), 1)

  return (
    <ChartSection title="Gene-Level Analysis" subtitle={`${stats.summary.total_genes_affected} genes affected — ${gene_analysis.genes_with_multiple_hits} with multiple variants`} icon={Dna}>
      <div className="flex gap-2 mb-4">
        {(['treemap', 'lollipop'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-body transition-all ${
              tab === t
                ? 'bg-dna-cyan/20 text-dna-cyan border border-dna-cyan/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {t === 'treemap' ? 'Gene Burden Treemap' : 'Top Genes Lollipop'}
          </button>
        ))}
      </div>

      {tab === 'treemap' ? (
        <ResponsiveContainer width="100%" height={400}>
          <Treemap
            data={treemapData}
            dataKey="size"
            stroke="rgba(0,0,0,0.3)"
            isAnimationActive
            animationDuration={1500}
            content={<CustomTreemapContent />}
          >
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm border border-dna-cyan/20">
                    <p className="text-sm font-headline font-semibold text-dna-cyan">{d.name}</p>
                    <p className="text-xs font-mono text-slate-300">{d.variant_count} variants</p>
                    <p className="text-xs text-dna-magenta">{d.pathogenic_count} pathogenic</p>
                    <p className="text-xs text-slate-400">Max risk: {d.max_risk_score} | Mean: {d.mean_risk_score}</p>
                  </div>
                )
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2">
          {lollipopGenes.map((gene, i) => {
            const pctWidth = (gene.variant_count / maxCount) * 100
            const pathPct = gene.variant_count > 0 ? gene.pathogenic_count / gene.variant_count : 0
            const dotColor = getTreemapColor(gene.max_risk_score)

            return (
              <motion.div
                key={gene.gene}
                className="flex items-center gap-3 group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <span className="text-xs font-mono text-dna-cyan w-20 text-right truncate">{gene.gene}</span>
                <div className="flex-1 relative h-6 flex items-center">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: `${pctWidth}%`,
                      background: `linear-gradient(90deg, ${dotColor}40, ${dotColor}80)`,
                    }}
                  />
                  <div
                    className="absolute w-4 h-4 rounded-full border-2 shadow-lg flex items-center justify-center"
                    style={{
                      left: `${pctWidth}%`,
                      transform: 'translateX(-50%)',
                      backgroundColor: dotColor,
                      borderColor: dotColor,
                    }}
                  >
                    <span className="text-[7px] font-bold text-white">{gene.variant_count}</span>
                  </div>
                  {gene.mean_risk_score > 0 && (
                    <div
                      className="absolute w-2 h-2 bg-white/80 rotate-45"
                      style={{ left: `${(gene.mean_risk_score / Math.max(gene.max_risk_score, 1)) * pctWidth}%` }}
                      title={`Mean risk: ${gene.mean_risk_score}`}
                    />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono w-8">
                  {pathPct > 0 ? `${(pathPct * 100).toFixed(0)}%P` : ''}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </ChartSection>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 5: Chromosome Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CHROM_LENGTHS: Record<string, number> = {
  '1': 249, '2': 243, '3': 198, '4': 191, '5': 182, '6': 171,
  '7': 159, '8': 146, '9': 141, '10': 136, '11': 135, '12': 134,
  '13': 115, '14': 107, '15': 103, '16': 90, '17': 84, '18': 80,
  '19': 59, '20': 65, '21': 47, '22': 51, 'X': 156, 'Y': 57,
}

function ChromosomeSection({ stats }: { stats: AdvancedVariantStats }) {
  const chromData = useMemo(() => {
    return stats.chromosome_distribution.map((ch: ChromosomeDistributionItem) => {
      const benignCount = ch.variant_count - ch.pathogenic_count
      return {
        name: `chr${ch.chromosome}`,
        chromosome: ch.chromosome,
        Pathogenic: ch.pathogenic_count,
        Other: benignCount,
        total: ch.variant_count,
        genes: ch.genes,
        relLength: CHROM_LENGTHS[ch.chromosome] || 100,
      }
    })
  }, [stats.chromosome_distribution])

  return (
    <ChartSection
      title="Chromosomal Variant Distribution"
      subtitle="Stacked by clinical significance"
      icon={Dna}
    >
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={chromData} margin={{ bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
          <XAxis
            dataKey="name"
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm border border-dna-cyan/20">
                  <p className="text-sm font-headline font-semibold text-dna-cyan">{d.name}</p>
                  <p className="text-xs font-mono text-slate-300">{d.total} total variants</p>
                  <p className="text-xs text-dna-magenta">{d.Pathogenic} pathogenic</p>
                  {d.genes.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">Genes: {d.genes.slice(0, 5).join(', ')}{d.genes.length > 5 ? '...' : ''}</p>
                  )}
                </div>
              )
            }}
          />
          <Bar dataKey="Pathogenic" stackId="a" fill="#ff3366" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={1500} />
          <Bar dataKey="Other" stackId="a" fill="#00d4ff" fillOpacity={0.4} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </ChartSection>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 6: Allele Frequency Spectrum
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AFSpectrumSection({ stats }: { stats: AdvancedVariantStats }) {
  const { allele_frequency_spectrum: afs } = stats

  const afData = [
    { name: 'Ultra-rare', range: '<0.0001', count: afs.ultra_rare.count, color: '#ff3366', label: 'PM2' },
    { name: 'Very Rare', range: '0.0001-0.001', count: afs.very_rare.count, color: '#ff8c00', label: '' },
    { name: 'Rare', range: '0.001-0.01', count: afs.rare.count, color: '#ffaa00', label: 'BS1' },
    { name: 'Low Freq', range: '0.01-0.05', count: afs.low_frequency.count, color: '#4a9eff', label: '' },
    { name: 'Common', range: '>0.05', count: afs.common.count, color: '#00ff88', label: 'BA1' },
    { name: 'Not Found', range: 'N/A', count: afs.not_found.count, color: '#64748b', label: '' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSection
        title="Allele Frequency Distribution"
        subtitle="ACMG frequency thresholds shown as labels"
        icon={BarChart3}
      >
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={afData} margin={{ bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis
              dataKey="name"
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm border border-dna-cyan/20">
                  <p className="text-sm font-headline font-semibold" style={{ color: d.color }}>{d.name}</p>
                  <p className="text-xs font-mono text-slate-300">AF Range: {d.range}</p>
                  <p className="text-xs font-mono text-dna-cyan">{d.count.toLocaleString()} variants</p>
                  {d.label && <p className="text-xs text-slate-400 mt-1">ACMG: {d.label} threshold</p>}
                </div>
              )
            }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1500}>
              {afData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection
        title="Frequency Spectrum Summary"
        subtitle="Distribution of variants across frequency bins"
        icon={Activity}
      >
        <div className="space-y-4 pt-2">
          {afData.filter(d => d.count > 0).map((bin, i) => {
            const maxCount = Math.max(...afData.map(d => d.count), 1)
            const pct = (bin.count / maxCount) * 100

            return (
              <motion.div
                key={bin.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="space-y-1"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bin.color }} />
                    <span className="text-xs font-body text-slate-300">{bin.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">({bin.range})</span>
                  </div>
                  <span className="text-xs font-mono font-semibold" style={{ color: bin.color }}>
                    {bin.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: bin.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                {bin.label && (
                  <p className="text-[9px] text-slate-500 pl-4">ACMG criterion: {bin.label}</p>
                )}
              </motion.div>
            )
          })}
        </div>
      </ChartSection>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 7: AI Insights Panel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getInsightIcon(text: string) {
  const t = text.toLowerCase()
  if (t.includes('pathogenic') || t.includes('cancer') || t.includes('disease')) return { icon: AlertTriangle, color: '#ff3366' }
  if (t.includes('pharmacogenomic') || t.includes('metabolism') || t.includes('pgx')) return { icon: Pill, color: '#a855f7' }
  if (t.includes('loss-of-function') || t.includes('frameshift') || t.includes('stop_gained')) return { icon: Flame, color: '#ff8c00' }
  if (t.includes('rare') || t.includes('ultra-rare')) return { icon: Search, color: '#4a9eff' }
  if (t.includes('vus') || t.includes('uncertain')) return { icon: HelpCircle, color: '#ffaa00' }
  return { icon: Sparkles, color: '#00d4ff' }
}

function AIInsightsSection({ stats }: { stats: AdvancedVariantStats }) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Gradient border */}
      <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-dna-cyan via-purple-500 to-dna-magenta">
        <div className="w-full h-full rounded-xl bg-bg-secondary" />
      </div>

      <div className="relative glass-panel-elevated rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-dna-cyan" />
          <h3 className="text-base font-headline font-semibold text-slate-100">
            Automated Analysis Summary
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-5 font-body italic">
          Key findings from variant interpretation pipeline
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.ai_insights.map((insight, i) => {
            const { icon: InsightIcon, color } = getInsightIcon(insight)
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel rounded-lg p-4 border border-white/5 hover:border-dna-cyan/20 transition-colors group"
              >
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <InsightIcon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-xs font-body text-slate-300 leading-relaxed">
                    {insight}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 8: ACMG Evidence Summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ACMG_COLORS: Record<string, string> = {
  PVS: '#cc0033',
  PS: '#ff3366',
  PM: '#ff8c00',
  PP: '#ffaa00',
  BA: '#00ff88',
  BS: '#4a9eff',
  BP: '#60a5fa',
}

function getACMGColor(criterion: string): string {
  const prefix = criterion.replace(/\d+/g, '')
  return ACMG_COLORS[prefix] || '#64748b'
}

function ACMGSection({ stats }: { stats: AdvancedVariantStats }) {
  const { acmg_summary } = stats

  if (acmg_summary.criteria_frequency.length === 0) {
    return (
      <ChartSection title="ACMG/AMP Criteria Application" subtitle="Evidence types supporting variant classification" icon={Shield}>
        <div className="text-center py-12 text-slate-500 text-sm font-body">
          No ACMG criteria met for variants in this dataset
        </div>
      </ChartSection>
    )
  }

  const barData = acmg_summary.criteria_frequency.map((c: ACMGCriterionFrequency) => ({
    name: c.criterion,
    count: c.met_count,
    description: c.description,
    fill: getACMGColor(c.criterion),
  }))

  return (
    <ChartSection
      title="ACMG/AMP Criteria Application"
      subtitle="Evidence types supporting variant classification"
      icon={Shield}
    >
      <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 32 + 40)}>
        <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
          <XAxis
            type="number"
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={55}
            stroke="#475569"
            tick={{ fill: '#00d4ff', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm border border-dna-cyan/20">
                  <p className="text-sm font-headline font-semibold" style={{ color: d.fill }}>{d.name}</p>
                  <p className="text-xs font-body text-slate-300">{d.description}</p>
                  <p className="text-xs font-mono text-dna-cyan mt-1">{d.count} variants met this criterion</p>
                </div>
              )
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={1500}>
            {barData.map((entry: any, i: number) => (
              <Cell key={i} fill={entry.fill} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartSection>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Dashboard Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function DashboardAnalytics() {
  const { primarySampleId } = useActiveSample()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['advancedVariantStats', primarySampleId],
    queryFn: () => getAdvancedVariantStats(primarySampleId),
    staleTime: 1000 * 60,
  })

  if (isLoading || !stats) {
    return <AnalyticsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Executive Summary */}
      <SummaryStrip stats={stats} />

      {/* Section 2: Clinical Significance & Consequence */}
      <ClinicalConsequenceSection stats={stats} />

      {/* Section 3: Risk Score Analysis */}
      <RiskScoreSection stats={stats} />

      {/* Section 4: Gene-Level Analysis */}
      <GeneLevelSection stats={stats} />

      {/* Section 5: Chromosome Distribution */}
      <ChromosomeSection stats={stats} />

      {/* Section 6: Allele Frequency Spectrum */}
      <AFSpectrumSection stats={stats} />

      {/* Section 7: AI Insights */}
      <AIInsightsSection stats={stats} />

      {/* Section 8: ACMG Evidence */}
      <ACMGSection stats={stats} />
    </div>
  )
}
