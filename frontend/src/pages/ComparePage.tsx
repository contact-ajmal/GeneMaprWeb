import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { getSamples, compareSamples } from '../api/samples'
import PageTransition from '../components/PageTransition'
import GlassCard from '../components/ui/GlassCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import GlowBadge from '../components/ui/GlowBadge'
import DecodeText from '../components/ui/DecodeText'
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton'
import {
  GitCompareArrows,
  Users,
  Dna,
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react'
import type {
  Sample,
  ComparisonResult,
  SharedVariant,
  InheritancePattern,
} from '../types/variant'

// Sample color palette for consistent coloring
const SAMPLE_COLORS = [
  { bg: 'from-dna-cyan/20 to-blue-600/20', text: 'text-dna-cyan', border: 'border-dna-cyan/40', fill: '#00d4ff' },
  { bg: 'from-dna-magenta/20 to-pink-600/20', text: 'text-dna-magenta', border: 'border-dna-magenta/40', fill: '#ff3366' },
  { bg: 'from-dna-green/20 to-emerald-600/20', text: 'text-dna-green', border: 'border-dna-green/40', fill: '#00ff88' },
  { bg: 'from-dna-amber/20 to-yellow-600/20', text: 'text-dna-amber', border: 'border-dna-amber/40', fill: '#ffaa00' },
  { bg: 'from-purple-500/20 to-violet-600/20', text: 'text-purple-400', border: 'border-purple-400/40', fill: '#a78bfa' },
]

const RELATIONSHIP_LABELS: Record<string, string> = {
  proband: 'Proband',
  mother: 'Mother',
  father: 'Father',
  sibling: 'Sibling',
  unrelated: 'Unrelated',
}

const INHERITANCE_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  de_novo: { label: 'De Novo', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40' },
  de_novo_or_paternal: { label: 'De Novo / Paternal', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40' },
  de_novo_or_maternal: { label: 'De Novo / Maternal', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40' },
  maternal: { label: 'Maternal', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
  paternal: { label: 'Paternal', color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/40' },
  biparental: { label: 'Biparental', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
  unknown: { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/40' },
}

export default function ComparePage() {
  const [selectedSamples, setSelectedSamples] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'shared' | 'inheritance' | 'unique'>('shared')
  const [uniqueTab, setUniqueTab] = useState<string>('')
  const [inheritanceFilter, setInheritanceFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'gene' | 'risk_score' | 'samples'>('risk_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { data: samplesData, isLoading: samplesLoading } = useQuery({
    queryKey: ['samples'],
    queryFn: () => getSamples(),
  })
  const samples = samplesData?.samples

  const {
    data: comparison,
    isLoading: comparisonLoading,
    refetch: runComparison,
    isFetching,
  } = useQuery({
    queryKey: ['comparison', selectedSamples],
    queryFn: () => compareSamples(selectedSamples),
    enabled: false,
  })

  const toggleSample = (sampleId: string) => {
    setSelectedSamples((prev) =>
      prev.includes(sampleId) ? prev.filter((id) => id !== sampleId) : [...prev, sampleId],
    )
  }

  const handleCompare = () => {
    if (selectedSamples.length >= 2) {
      runComparison()
    }
  }

  // Color map for samples
  const sampleColorMap = useMemo(() => {
    const map: Record<string, (typeof SAMPLE_COLORS)[0]> = {}
    samples?.forEach((s, i) => {
      map[s.id] = SAMPLE_COLORS[i % SAMPLE_COLORS.length]
    })
    return map
  }, [samples])

  // Set initial unique tab when comparison data arrives
  if (comparison && !uniqueTab && selectedSamples.length > 0) {
    setUniqueTab(selectedSamples[0])
  }

  // Sorted shared variants
  const sortedShared = useMemo(() => {
    if (!comparison) return []
    const sorted = [...comparison.shared_variants]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'gene') {
        return dir * (a.variant.gene_symbol || '').localeCompare(b.variant.gene_symbol || '')
      }
      if (sortField === 'risk_score') {
        return dir * ((a.variant.risk_score || 0) - (b.variant.risk_score || 0))
      }
      if (sortField === 'samples') {
        return dir * (a.present_in.length - b.present_in.length)
      }
      return 0
    })
    return sorted
  }, [comparison, sortField, sortDir])

  // Filtered inheritance patterns
  const filteredInheritance = useMemo(() => {
    if (!comparison) return []
    if (inheritanceFilter === 'all') return comparison.inheritance_patterns
    return comparison.inheritance_patterns.filter((p) => p.inheritance === inheritanceFilter)
  }, [comparison, inheritanceFilter])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
  }

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-headline font-bold text-slate-100 flex items-center gap-3">
              <GitCompareArrows className="w-7 h-7 text-dna-cyan" />
              <DecodeText text="Multi-Sample Comparison" speed={20} />
            </h1>
            <p className="text-sm text-slate-400 font-body mt-1">
              Compare variants across family members or cohort samples
            </p>
          </div>
        </div>

        {/* Sample Selector */}
        <GlassCard variant="elevated" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-headline font-semibold text-slate-200 flex items-center gap-2">
              <Users className="w-5 h-5 text-dna-cyan" />
              Select Samples
            </h2>
            <AnimatedButton
              variant="primary"
              disabled={selectedSamples.length < 2 || isFetching}
              loading={isFetching}
              onClick={handleCompare}
              className="text-sm px-4 py-2"
            >
              {isFetching ? 'Comparing...' : `Compare ${selectedSamples.length} Samples`}
            </AnimatedButton>
          </div>

          {samplesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
          ) : !samples || samples.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-body">No samples uploaded yet.</p>
              <p className="text-sm mt-1">Upload VCF files with sample names on the Upload page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {samples.map((sample) => {
                const color = sampleColorMap[sample.id]
                const isSelected = selectedSamples.includes(sample.id)
                return (
                  <motion.div
                    key={sample.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => toggleSample(sample.id)}
                    className={`
                      cursor-pointer rounded-xl p-4 border-2 transition-all duration-200
                      ${
                        isSelected
                          ? `glass-panel-interactive ${color?.border} shadow-lg`
                          : 'glass-panel border-transparent hover:border-slate-600/50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color?.bg} flex items-center justify-center`}
                        >
                          <Dna className={`w-5 h-5 ${color?.text}`} />
                        </div>
                        <div>
                          <p className="font-headline font-semibold text-slate-100 text-sm">
                            {sample.name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono-variant">
                            {sample.original_filename}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? `${color?.border} bg-gradient-to-br ${color?.bg}`
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`w-2.5 h-2.5 rounded-full`}
                            style={{ backgroundColor: color?.fill }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {sample.relationship_type && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${color?.bg} ${color?.text} border ${color?.border}`}
                        >
                          {RELATIONSHIP_LABELS[sample.relationship_type] || sample.relationship_type}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-mono-variant">
                        {sample.total_variants} variants
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </GlassCard>

        {/* Comparison Results */}
        {comparisonLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
            <SkeletonTable rows={6} />
          </div>
        )}

        {comparison && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Section 1: Sample Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparison.sample_stats.map((stat) => {
                  const color = sampleColorMap[stat.sample_id]
                  return (
                    <GlassCard key={stat.sample_id} variant="default" className={`p-5 border-l-4 ${color?.border}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-headline font-semibold ${color?.text}`}>{stat.name}</h3>
                        <span className="text-xs text-slate-500 font-mono-variant">
                          {stat.total} total
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Pathogenic</p>
                          <p className="font-mono-variant text-dna-magenta font-semibold">
                            {stat.pathogenic_count}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Likely Path.</p>
                          <p className="font-mono-variant text-orange-400 font-semibold">
                            {stat.likely_pathogenic_count}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">VUS</p>
                          <p className="font-mono-variant text-dna-amber font-semibold">
                            {stat.vus_count}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Mean Risk</p>
                          <p className="font-mono-variant text-slate-200 font-semibold">
                            {stat.mean_risk}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  )
                })}
              </div>

              {/* Venn Diagram */}
              {selectedSamples.length <= 3 && (
                <GlassCard variant="elevated" className="p-6">
                  <h3 className="text-lg font-headline font-semibold text-slate-200 mb-4">
                    Variant Overlap
                  </h3>
                  <VennDiagram
                    comparison={comparison}
                    samples={samples || []}
                    selectedSamples={selectedSamples}
                    colorMap={sampleColorMap}
                  />
                </GlassCard>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-700/50 pb-0">
                {[
                  { key: 'shared', label: `Shared (${comparison.shared_variants.length})`, icon: GitCompareArrows },
                  ...(comparison.inheritance_patterns.length > 0
                    ? [{ key: 'inheritance', label: `Inheritance (${comparison.inheritance_patterns.length})`, icon: Dna }]
                    : []),
                  { key: 'unique', label: 'Unique Variants', icon: Filter },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`
                      flex items-center gap-2 px-4 py-3 text-sm font-body font-medium
                      border-b-2 transition-all -mb-[1px]
                      ${
                        activeTab === tab.key
                          ? 'text-dna-cyan border-dna-cyan'
                          : 'text-slate-500 border-transparent hover:text-slate-300'
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'shared' && (
                  <motion.div
                    key="shared"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <SharedVariantsTable
                      variants={sortedShared}
                      samples={samples || []}
                      colorMap={sampleColorMap}
                      onSort={handleSort}
                      SortIcon={SortIcon}
                    />
                  </motion.div>
                )}

                {activeTab === 'inheritance' && (
                  <motion.div
                    key="inheritance"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Inheritance filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-slate-400 font-body">Filter:</span>
                      {['all', 'de_novo', 'maternal', 'paternal', 'biparental'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setInheritanceFilter(f)}
                          className={`
                            text-xs px-3 py-1.5 rounded-full border transition-all font-body
                            ${
                              inheritanceFilter === f
                                ? 'border-dna-cyan/50 bg-dna-cyan/10 text-dna-cyan'
                                : 'border-slate-700 text-slate-400 hover:text-slate-300'
                            }
                          `}
                        >
                          {f === 'all' ? 'All' : INHERITANCE_STYLES[f]?.label || f}
                        </button>
                      ))}
                    </div>

                    {/* Compound Hets */}
                    {comparison.compound_hets.length > 0 && (
                      <GlassCard variant="elevated" className="p-5 border border-dna-amber/30">
                        <h4 className="font-headline font-semibold text-dna-amber flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4" />
                          Compound Heterozygote Candidates ({comparison.compound_hets.length})
                        </h4>
                        <div className="space-y-3">
                          {comparison.compound_hets.map((ch, i) => (
                            <div key={i} className="glass-panel rounded-lg p-3 text-sm">
                              <p className="font-mono-variant text-dna-amber font-semibold mb-1">
                                Gene: {ch.gene}
                              </p>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="text-blue-400">
                                  <span className="text-slate-500">Maternal: </span>
                                  {ch.variant_a.chrom}:{ch.variant_a.pos} {ch.variant_a.ref}&gt;{ch.variant_a.alt}
                                </div>
                                <div className="text-pink-400">
                                  <span className="text-slate-500">Paternal: </span>
                                  {ch.variant_b.chrom}:{ch.variant_b.pos} {ch.variant_b.ref}&gt;{ch.variant_b.alt}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                    )}

                    <InheritanceTable patterns={filteredInheritance} />
                  </motion.div>
                )}

                {activeTab === 'unique' && (
                  <motion.div
                    key="unique"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Sub-tabs per sample */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedSamples.map((sid) => {
                        const sample = samples?.find((s) => s.id === sid)
                        const color = sampleColorMap[sid]
                        const count = comparison.unique_variants[sid]?.length || 0
                        return (
                          <button
                            key={sid}
                            onClick={() => setUniqueTab(sid)}
                            className={`
                              text-xs px-3 py-1.5 rounded-full border transition-all font-body
                              ${
                                uniqueTab === sid
                                  ? `${color?.border} ${color?.bg} ${color?.text}`
                                  : 'border-slate-700 text-slate-400 hover:text-slate-300'
                              }
                            `}
                          >
                            {sample?.name || 'Unknown'} ({count})
                          </button>
                        )
                      })}
                    </div>

                    {/* Unique variants table */}
                    <UniqueVariantsTable
                      variants={comparison.unique_variants[uniqueTab] || []}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Summary */}
              {comparison.ai_summary && (
                <GlassCard
                  variant="elevated"
                  className="p-6 border border-dna-cyan/20"
                >
                  <h3 className="text-lg font-headline font-semibold text-slate-200 flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-dna-cyan" />
                    AI Comparison Summary
                  </h3>
                  <div className="glass-panel rounded-lg p-5 text-sm text-slate-300 font-body leading-relaxed whitespace-pre-line bg-gradient-to-br from-dna-cyan/5 to-transparent">
                    {comparison.ai_summary}
                  </div>
                </GlassCard>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </PageTransition>
  )
}

/* ───── Venn Diagram ───── */

function VennDiagram({
  comparison,
  samples,
  selectedSamples,
  colorMap,
}: {
  comparison: ComparisonResult
  samples: Sample[]
  selectedSamples: string[]
  colorMap: Record<string, (typeof SAMPLE_COLORS)[0]>
}) {
  const sampleNames = selectedSamples.map(
    (sid) => samples.find((s) => s.id === sid)?.name || 'Unknown',
  )
  const fills = selectedSamples.map((sid) => colorMap[sid]?.fill || '#888')

  // Count unique per sample
  const uniqueCounts = selectedSamples.map(
    (sid) => comparison.unique_variants[sid]?.length || 0,
  )
  const sharedCount = comparison.shared_variants.length

  if (selectedSamples.length === 2) {
    return (
      <div className="flex items-center justify-center py-6">
        <svg viewBox="0 0 400 200" className="w-full max-w-md">
          {/* Left circle */}
          <circle cx="150" cy="100" r="80" fill={fills[0]} fillOpacity="0.2" stroke={fills[0]} strokeWidth="2" />
          {/* Right circle */}
          <circle cx="250" cy="100" r="80" fill={fills[1]} fillOpacity="0.2" stroke={fills[1]} strokeWidth="2" />
          {/* Labels */}
          <text x="110" y="100" textAnchor="middle" fill={fills[0]} fontSize="24" fontWeight="bold" fontFamily="JetBrains Mono">
            {uniqueCounts[0]}
          </text>
          <text x="200" y="95" textAnchor="middle" fill="#e2e8f0" fontSize="24" fontWeight="bold" fontFamily="JetBrains Mono">
            {sharedCount}
          </text>
          <text x="200" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="Plus Jakarta Sans">
            shared
          </text>
          <text x="290" y="100" textAnchor="middle" fill={fills[1]} fontSize="24" fontWeight="bold" fontFamily="JetBrains Mono">
            {uniqueCounts[1]}
          </text>
          {/* Sample names */}
          <text x="110" y="195" textAnchor="middle" fill={fills[0]} fontSize="12" fontFamily="Plus Jakarta Sans">
            {sampleNames[0]}
          </text>
          <text x="290" y="195" textAnchor="middle" fill={fills[1]} fontSize="12" fontFamily="Plus Jakarta Sans">
            {sampleNames[1]}
          </text>
        </svg>
      </div>
    )
  }

  if (selectedSamples.length === 3) {
    return (
      <div className="flex items-center justify-center py-6">
        <svg viewBox="0 0 400 280" className="w-full max-w-md">
          {/* Three overlapping circles */}
          <circle cx="170" cy="110" r="75" fill={fills[0]} fillOpacity="0.15" stroke={fills[0]} strokeWidth="2" />
          <circle cx="230" cy="110" r="75" fill={fills[1]} fillOpacity="0.15" stroke={fills[1]} strokeWidth="2" />
          <circle cx="200" cy="170" r="75" fill={fills[2]} fillOpacity="0.15" stroke={fills[2]} strokeWidth="2" />
          {/* Unique counts */}
          <text x="130" y="90" textAnchor="middle" fill={fills[0]} fontSize="20" fontWeight="bold" fontFamily="JetBrains Mono">
            {uniqueCounts[0]}
          </text>
          <text x="270" y="90" textAnchor="middle" fill={fills[1]} fontSize="20" fontWeight="bold" fontFamily="JetBrains Mono">
            {uniqueCounts[1]}
          </text>
          <text x="200" y="215" textAnchor="middle" fill={fills[2]} fontSize="20" fontWeight="bold" fontFamily="JetBrains Mono">
            {uniqueCounts[2]}
          </text>
          {/* Shared count (center) */}
          <text x="200" y="135" textAnchor="middle" fill="#e2e8f0" fontSize="20" fontWeight="bold" fontFamily="JetBrains Mono">
            {sharedCount}
          </text>
          <text x="200" y="150" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Plus Jakarta Sans">
            shared
          </text>
          {/* Sample names */}
          <text x="120" y="40" textAnchor="middle" fill={fills[0]} fontSize="11" fontFamily="Plus Jakarta Sans">
            {sampleNames[0]}
          </text>
          <text x="280" y="40" textAnchor="middle" fill={fills[1]} fontSize="11" fontFamily="Plus Jakarta Sans">
            {sampleNames[1]}
          </text>
          <text x="200" y="270" textAnchor="middle" fill={fills[2]} fontSize="11" fontFamily="Plus Jakarta Sans">
            {sampleNames[2]}
          </text>
        </svg>
      </div>
    )
  }

  // For >3, show a simple bar-based view
  return (
    <div className="flex items-center justify-center gap-6 py-6">
      <div className="text-center">
        <p className="text-3xl font-mono-variant font-bold text-dna-cyan">{sharedCount}</p>
        <p className="text-xs text-slate-400 font-body mt-1">Shared</p>
      </div>
      {selectedSamples.map((sid, i) => {
        const color = colorMap[sid]
        const sample = samples.find((s) => s.id === sid)
        return (
          <div key={sid} className="text-center">
            <p className={`text-3xl font-mono-variant font-bold ${color?.text}`}>
              {uniqueCounts[i]}
            </p>
            <p className="text-xs text-slate-400 font-body mt-1">
              {sample?.name} only
            </p>
          </div>
        )
      })}
    </div>
  )
}

/* ───── Shared Variants Table ───── */

function SharedVariantsTable({
  variants,
  samples,
  colorMap,
  onSort,
  SortIcon,
}: {
  variants: SharedVariant[]
  samples: Sample[]
  colorMap: Record<string, (typeof SAMPLE_COLORS)[0]>
  onSort: (field: 'gene' | 'risk_score' | 'samples') => void
  SortIcon: React.FC<{ field: 'gene' | 'risk_score' | 'samples' }>
}) {
  if (variants.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-12 text-center text-slate-500">
        <GitCompareArrows className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-body">No shared variants found between selected samples.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel-elevated rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-700/50 bg-bg-tertiary/30 text-xs font-body text-slate-400 uppercase tracking-wider">
        <div className="col-span-1">Chr</div>
        <div className="col-span-1">Pos</div>
        <div
          className="col-span-2 cursor-pointer flex items-center gap-1 hover:text-slate-200"
          onClick={() => onSort('gene')}
        >
          Gene <SortIcon field="gene" />
        </div>
        <div className="col-span-2">Consequence</div>
        <div className="col-span-2">ClinVar</div>
        <div
          className="col-span-1 cursor-pointer flex items-center gap-1 hover:text-slate-200"
          onClick={() => onSort('risk_score')}
        >
          Risk <SortIcon field="risk_score" />
        </div>
        <div
          className="col-span-3 cursor-pointer flex items-center gap-1 hover:text-slate-200"
          onClick={() => onSort('samples')}
        >
          Present In <SortIcon field="samples" />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
        {variants.map((sv, i) => {
          const v = sv.variant
          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-white/[0.02] transition-colors"
            >
              <div className="col-span-1 font-mono-variant text-slate-300">
                {v.chrom.replace('chr', '')}
              </div>
              <div className="col-span-1 font-mono-variant text-slate-400 text-xs">
                {v.pos.toLocaleString()}
              </div>
              <div className="col-span-2 font-mono-variant text-dna-cyan font-medium truncate">
                {v.gene_symbol || '-'}
              </div>
              <div className="col-span-2 text-xs text-slate-400 truncate">
                {v.consequence || '-'}
              </div>
              <div className="col-span-2">
                {v.clinvar_significance ? (
                  <ClinvarBadge significance={v.clinvar_significance} />
                ) : (
                  <span className="text-xs text-slate-600">-</span>
                )}
              </div>
              <div className="col-span-1">
                {v.risk_score != null ? (
                  <GlowBadge variant="score" severity={v.risk_score}>
                    {v.risk_score}
                  </GlowBadge>
                ) : (
                  <span className="text-xs text-slate-600">-</span>
                )}
              </div>
              <div className="col-span-3 flex items-center gap-1.5 flex-wrap">
                {sv.present_in.map((sid) => {
                  const color = colorMap[sid]
                  const sample = samples.find((s) => s.id === sid)
                  return (
                    <span
                      key={sid}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color?.bg} ${color?.text} border ${color?.border}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color?.fill }}
                      />
                      {sample?.name?.substring(0, 8)}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ───── Inheritance Table ───── */

function InheritanceTable({ patterns }: { patterns: InheritancePattern[] }) {
  if (patterns.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-12 text-center text-slate-500">
        <Dna className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-body">No inheritance patterns detected.</p>
        <p className="text-sm mt-1">
          Upload a trio (proband + parents) with relationship labels for inheritance analysis.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel-elevated rounded-xl overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-700/50 bg-bg-tertiary/30 text-xs font-body text-slate-400 uppercase tracking-wider">
        <div className="col-span-2">Gene</div>
        <div className="col-span-2">Position</div>
        <div className="col-span-2">ClinVar</div>
        <div className="col-span-1">Risk</div>
        <div className="col-span-1 text-center">Proband</div>
        <div className="col-span-1 text-center">Mother</div>
        <div className="col-span-1 text-center">Father</div>
        <div className="col-span-2">Inheritance</div>
      </div>

      <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
        {patterns.map((p, i) => {
          const style = INHERITANCE_STYLES[p.inheritance] || INHERITANCE_STYLES.unknown
          return (
            <motion.div
              key={p.variant_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-white/[0.02] transition-colors ${
                p.inheritance === 'de_novo' ? 'bg-red-500/[0.03]' : ''
              }`}
            >
              <div className="col-span-2 font-mono-variant text-dna-cyan font-medium truncate">
                {p.gene || '-'}
              </div>
              <div className="col-span-2 font-mono-variant text-slate-400 text-xs">
                {p.chrom.replace('chr', '')}:{p.pos.toLocaleString()}
              </div>
              <div className="col-span-2">
                {p.clinvar_significance ? (
                  <ClinvarBadge significance={p.clinvar_significance} />
                ) : (
                  <span className="text-xs text-slate-600">-</span>
                )}
              </div>
              <div className="col-span-1">
                {p.risk_score != null ? (
                  <GlowBadge variant="score" severity={p.risk_score}>
                    {p.risk_score}
                  </GlowBadge>
                ) : (
                  <span className="text-xs text-slate-600">-</span>
                )}
              </div>
              <div className="col-span-1 text-center">
                <PresenceDot present={p.proband} />
              </div>
              <div className="col-span-1 text-center">
                <PresenceDot present={p.mother} />
              </div>
              <div className="col-span-1 text-center">
                <PresenceDot present={p.father} />
              </div>
              <div className="col-span-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${style.bg} ${style.color} ${style.border} font-medium`}
                >
                  {style.label}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ───── Unique Variants Table ───── */

function UniqueVariantsTable({ variants }: { variants: import('../types/variant').Variant[] }) {
  if (variants.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-12 text-center text-slate-500">
        <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-body">No unique variants for this sample.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel-elevated rounded-xl overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-700/50 bg-bg-tertiary/30 text-xs font-body text-slate-400 uppercase tracking-wider">
        <div className="col-span-1">Chr</div>
        <div className="col-span-2">Position</div>
        <div className="col-span-2">Gene</div>
        <div className="col-span-2">Consequence</div>
        <div className="col-span-2">ClinVar</div>
        <div className="col-span-1">Risk</div>
        <div className="col-span-2">gnomAD AF</div>
      </div>

      <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
        {variants.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-white/[0.02] transition-colors"
          >
            <div className="col-span-1 font-mono-variant text-slate-300">
              {v.chrom.replace('chr', '')}
            </div>
            <div className="col-span-2 font-mono-variant text-slate-400 text-xs">
              {v.pos.toLocaleString()}
            </div>
            <div className="col-span-2 font-mono-variant text-dna-cyan font-medium truncate">
              {v.gene_symbol || '-'}
            </div>
            <div className="col-span-2 text-xs text-slate-400 truncate">
              {v.consequence || '-'}
            </div>
            <div className="col-span-2">
              {v.clinvar_significance ? (
                <ClinvarBadge significance={v.clinvar_significance} />
              ) : (
                <span className="text-xs text-slate-600">-</span>
              )}
            </div>
            <div className="col-span-1">
              {v.risk_score != null ? (
                <GlowBadge variant="score" severity={v.risk_score}>
                  {v.risk_score}
                </GlowBadge>
              ) : (
                <span className="text-xs text-slate-600">-</span>
              )}
            </div>
            <div className="col-span-2 font-mono-variant text-xs text-slate-400">
              {v.gnomad_af != null ? v.gnomad_af.toExponential(2) : '-'}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ───── Helpers ───── */

function PresenceDot({ present }: { present: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${
        present ? 'bg-dna-green shadow-glow-green-sm' : 'bg-slate-700'
      }`}
    />
  )
}

function ClinvarBadge({ significance }: { significance: string }) {
  const lower = significance.toLowerCase()
  let variant: 'pathogenic' | 'likely-pathogenic' | 'vus' | 'likely-benign' | 'benign' = 'vus'

  if (lower.includes('pathogenic') && !lower.includes('likely') && !lower.includes('benign')) {
    variant = 'pathogenic'
  } else if (lower.includes('likely pathogenic') || lower.includes('likely_pathogenic')) {
    variant = 'likely-pathogenic'
  } else if (lower.includes('benign') && lower.includes('likely')) {
    variant = 'likely-benign'
  } else if (lower.includes('benign')) {
    variant = 'benign'
  }

  const shortLabel =
    variant === 'pathogenic'
      ? 'P'
      : variant === 'likely-pathogenic'
        ? 'LP'
        : variant === 'vus'
          ? 'VUS'
          : variant === 'likely-benign'
            ? 'LB'
            : 'B'

  return <GlowBadge variant={variant}>{shortLabel}</GlowBadge>
}
