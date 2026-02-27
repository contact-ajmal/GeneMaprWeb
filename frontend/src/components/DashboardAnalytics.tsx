import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getVariantStats } from '../api/variants'
import { Dna, AlertTriangle, HelpCircle, Shield, Flame, Activity, TrendingUp } from 'lucide-react'
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
} from 'recharts'
import { useEffect, useState } from 'react'
import GlassCard from './ui/GlassCard'
import { SkeletonKPICards, SkeletonCharts } from './ui/Skeleton'
import { useScrollReveal, scrollRevealVariants } from '../hooks/useScrollReveal'

// Animated counter for KPI cards
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

// DNA-themed chart colors
const CHART_COLORS = {
  cyan: '#00d4ff',
  magenta: '#ff3366',
  green: '#00ff88',
  amber: '#ffaa00',
  purple: '#a855f7',
  blue: '#3b82f6',
}

const PIE_COLORS = ['#00d4ff', '#ff3366', '#00ff88', '#ffaa00', '#a855f7', '#3b82f6']

// Custom tooltip for charts
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel-elevated rounded-lg px-4 py-3 shadow-glow-cyan-sm">
      <p className="text-sm font-headline font-semibold text-slate-100 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-mono-variant" style={{ color: entry.color || '#00d4ff' }}>
          {entry.name || 'Count'}: {entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
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

export default function DashboardAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['variantStats'],
    queryFn: getVariantStats,
    staleTime: 1000 * 30,
  })

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <SkeletonKPICards />
        <SkeletonCharts />
        {/* Quick Insights skeleton */}
        <div className="glass-panel rounded-xl p-6">
          <div className="skeleton-shimmer h-5 w-1/4 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-lg p-5 space-y-2">
                <div className="skeleton-shimmer h-8 w-1/2 rounded" />
                <div className="skeleton-shimmer h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const pathogenicPercent = stats.total_variants > 0
    ? Math.round(((stats.pathogenic_count + stats.likely_pathogenic_count) / stats.total_variants) * 100)
    : 0

  const topGene = stats.top_genes[0]
  const ultraRareVariants = stats.af_distribution.find((d) => d.name === '<0.001')?.count || 0

  // Chart data
  const clinvarChartData = stats.clinvar_distribution.map((item) => ({
    name: item.name,
    value: item.count,
  }))

  const topGenesChartData = stats.top_genes.map((gene) => ({
    name: gene.gene,
    count: gene.count,
    maxRisk: gene.max_risk,
  }))

  const getGeneBarColor = (maxRisk: number) => {
    if (maxRisk >= 9) return CHART_COLORS.magenta
    if (maxRisk >= 6) return CHART_COLORS.amber
    if (maxRisk >= 3) return CHART_COLORS.cyan
    return CHART_COLORS.blue
  }

  // KPI cards config
  const kpiCards = [
    { title: 'Total Variants', value: stats.total_variants, icon: Dna, color: 'cyan', border: 'border-l-dna-cyan' },
    { title: 'Pathogenic', value: stats.pathogenic_count, icon: AlertTriangle, color: 'magenta', border: 'border-l-dna-magenta' },
    { title: 'Likely Pathogenic', value: stats.likely_pathogenic_count, icon: TrendingUp, color: 'amber', border: 'border-l-dna-amber' },
    { title: 'VUS', value: stats.vus_count, icon: HelpCircle, color: 'amber', border: 'border-l-dna-amber' },
    { title: 'High Risk', value: stats.high_risk_count, icon: Flame, color: 'magenta', border: 'border-l-dna-magenta' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <ScrollRevealSection>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpiCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
            >
              <GlassCard
                variant="interactive"
                className={`relative p-6 border-l-4 ${card.border} overflow-hidden group hover:scale-105 transition-transform`}
              >
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <card.icon className={`w-14 h-14 text-dna-${card.color}`} />
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-body text-slate-400 mb-2">{card.title}</p>
                  <p className={`text-xl font-headline font-bold text-dna-${card.color}`}>
                    <AnimatedCounter value={card.value} />
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </ScrollRevealSection>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ClinVar Pie Chart */}
        <ScrollRevealSection index={0}>
          <GlassCard variant="elevated" className="p-6">
            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-dna-cyan" />
              ClinVar Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clinvarChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={2}
                >
                  {clinvarChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </ScrollRevealSection>

        {/* Top Genes Bar Chart */}
        <ScrollRevealSection index={1}>
          <GlassCard variant="elevated" className="p-6">
            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Dna className="w-5 h-5 text-dna-magenta" />
              Top Genes by Variant Count
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topGenesChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#64748b" width={80} tick={{ fill: '#00d4ff', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {topGenesChartData.map((gene, index) => (
                    <Cell key={`cell-${index}`} fill={getGeneBarColor(gene.maxRisk)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </ScrollRevealSection>

        {/* Risk Score Distribution */}
        <ScrollRevealSection index={2}>
          <GlassCard variant="elevated" className="p-6">
            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-dna-amber" />
              Risk Score Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.risk_score_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.risk_score_distribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index < 2 ? CHART_COLORS.green : index < 4 ? CHART_COLORS.amber : CHART_COLORS.magenta}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </ScrollRevealSection>

        {/* Consequence Distribution */}
        <ScrollRevealSection index={3}>
          <GlassCard variant="elevated" className="p-6">
            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-dna-green" />
              Consequence Types
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.consequence_distribution.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
                <XAxis dataKey="name" stroke="#64748b" angle={-45} textAnchor="end" height={100} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.consequence_distribution.slice(0, 10).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </ScrollRevealSection>
      </div>

      {/* Quick Insights */}
      <ScrollRevealSection>
        <GlassCard variant="elevated" className="p-6">
          <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-dna-cyan" />
            Quick Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel rounded-lg p-5 border border-dna-cyan/20">
              <p className="text-xl font-headline font-bold text-dna-cyan mb-1">{pathogenicPercent}%</p>
              <p className="text-sm text-slate-400 font-body">
                of variants are pathogenic or likely pathogenic
              </p>
            </div>

            {topGene && (
              <div className="glass-panel rounded-lg p-5 border border-dna-magenta/20">
                <p className="text-xl font-headline font-bold text-dna-magenta mb-1 font-mono-variant">{topGene.gene}</p>
                <p className="text-sm text-slate-400 font-body">
                  Top gene with {topGene.count} variant{topGene.count !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <div className="glass-panel rounded-lg p-5 border border-dna-green/20">
              <p className="text-xl font-headline font-bold text-dna-green mb-1">
                {ultraRareVariants.toLocaleString()}
              </p>
              <p className="text-sm text-slate-400 font-body">
                ultra-rare variants (AF &lt; 0.001)
              </p>
            </div>
          </div>
        </GlassCard>
      </ScrollRevealSection>
    </div>
  )
}
