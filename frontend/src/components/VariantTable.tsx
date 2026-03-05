import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Variant } from '../types/variant'
import GlassCard from './ui/GlassCard'
import GlowBadge from './ui/GlowBadge'
import { ChevronUp, ChevronDown, ChevronsUpDown, Dna, Sparkles } from 'lucide-react'

interface VariantTableProps {
  variants: Variant[]
  onRowClick: (variant: Variant) => void
  agScoreMap?: Map<string, { score: number | null; status: string }>
}

type SortField = 'chrom' | 'pos' | 'gene_symbol' | 'risk_score' | 'allele_freq' | 'ag_score'
type SortDirection = 'asc' | 'desc' | null

export default function VariantTable({ variants, onRowClick, agScoreMap }: VariantTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [rippleRowKey, setRippleRowKey] = useState<string | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleRowClick = useCallback((variant: Variant, rowKey: string) => {
    setRippleRowKey(rowKey)
    setTimeout(() => {
      setRippleRowKey(null)
      onRowClick(variant)
    }, 200)
  }, [onRowClick])

  const sortedVariants = [...variants].sort((a, b) => {
    if (!sortField || !sortDirection) return 0

    if (sortField === 'ag_score') {
      const aScore = agScoreMap?.get(a.id)?.score ?? null
      const bScore = agScoreMap?.get(b.id)?.score ?? null
      if (aScore === null) return 1
      if (bScore === null) return -1
      const comparison = aScore < bScore ? -1 : aScore > bScore ? 1 : 0
      return sortDirection === 'asc' ? comparison : -comparison
    }

    const aVal = a[sortField]
    const bVal = b[sortField]

    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const getClinVarColor = (significance: string | null) => {
    if (!significance) return 'text-slate-500'
    const sig = significance.toLowerCase()
    if (sig.includes('pathogenic') && !sig.includes('likely')) return 'text-dna-magenta'
    if (sig.includes('likely') && sig.includes('pathogenic')) return 'text-amber-400'
    if (sig.includes('benign') && !sig.includes('likely')) return 'text-dna-green'
    if (sig.includes('likely') && sig.includes('benign')) return 'text-green-400'
    return 'text-dna-amber'
  }

  const getRiskSeverity = (score: number | null): number => {
    if (score === null) return 0
    if (score >= 75) return 9
    if (score >= 50) return 7
    if (score >= 25) return 5
    return 3
  }

  const getAgImpactLabel = (score: number | null) => {
    if (score === null) return null
    if (score >= 1.0) return { label: 'High', classes: 'bg-dna-magenta/15 text-dna-magenta border-dna-magenta/30' }
    if (score >= 0.5) return { label: 'Mod', classes: 'bg-dna-amber/15 text-dna-amber border-dna-amber/30' }
    if (score >= 0.2) return { label: 'Low', classes: 'bg-blue-400/15 text-blue-400 border-blue-400/30' }
    return { label: 'Min', classes: 'bg-slate-700/15 text-slate-400 border-slate-600/30' }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-slate-500" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-dna-cyan" />
    ) : (
      <ChevronDown className="w-4 h-4 text-dna-cyan" />
    )
  }

  const sortableHeaderClass = (field: SortField) => {
    const isActive = sortField === field
    return `flex items-center space-x-1 text-xs font-headline font-semibold uppercase tracking-wider transition-all duration-200 group
      ${isActive
        ? 'text-dna-cyan bg-dna-cyan/5 -mx-2 px-2 py-1 rounded-md'
        : 'text-slate-400 hover:text-dna-cyan hover:bg-dna-cyan/5 -mx-2 px-2 py-1 rounded-md'
      }`
  }

  const hasAgData = agScoreMap && agScoreMap.size > 0

  if (variants.length === 0) {
    return (
      <GlassCard variant="elevated" className="p-12 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-dna-cyan/20 to-dna-magenta/20 rounded-full flex items-center justify-center shadow-glow-cyan">
            <Dna className="w-10 h-10 text-dna-cyan" />
          </div>
          <p className="text-slate-300 text-sm font-headline font-semibold mb-2">No variants found</p>
          <p className="text-slate-500 text-sm font-body">
            Try adjusting your filters or upload a VCF file
          </p>
        </motion.div>
      </GlassCard>
    )
  }

  // Use a flexible grid: base 12 columns + 2 if AG data present
  const gridCols = hasAgData ? 'grid-cols-[1fr_2fr_1fr_1fr_1fr_2fr_2fr_1fr_1fr_1fr_0.8fr]' : 'grid-cols-12'

  return (
    <GlassCard variant="elevated" className="overflow-hidden">
      {/* Column Headers */}
      <div className={`grid ${gridCols} gap-3 px-6 py-4 border-b border-slate-700/50 bg-bg-tertiary/30`}>
        <button
          onClick={() => handleSort('chrom')}
          className={sortableHeaderClass('chrom')}
        >
          <span>Chr</span>
          <SortIcon field="chrom" />
        </button>
        <button
          onClick={() => handleSort('pos')}
          className={sortableHeaderClass('pos')}
        >
          <span>Position</span>
          <SortIcon field="pos" />
        </button>
        <div className="text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider flex items-center">
          Ref
        </div>
        <div className="text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider flex items-center">
          Alt
        </div>
        <button
          onClick={() => handleSort('gene_symbol')}
          className={sortableHeaderClass('gene_symbol')}
        >
          <span>Gene</span>
          <SortIcon field="gene_symbol" />
        </button>
        <div className="text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider flex items-center">
          Consequence
        </div>
        <div className="text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider flex items-center">
          ClinVar
        </div>
        <button
          onClick={() => handleSort('allele_freq')}
          className={sortableHeaderClass('allele_freq')}
        >
          <span>AF</span>
          <SortIcon field="allele_freq" />
        </button>
        <button
          onClick={() => handleSort('risk_score')}
          className={sortableHeaderClass('risk_score')}
        >
          <span>Risk</span>
          <SortIcon field="risk_score" />
        </button>
        {hasAgData && (
          <>
            <button
              onClick={() => handleSort('ag_score')}
              className={sortableHeaderClass('ag_score')}
              title="AlphaGenome Effect Score"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AG</span>
              <SortIcon field="ag_score" />
            </button>
            <div className="text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              Impact
            </div>
          </>
        )}
      </div>

      {/* Variant Rows */}
      <div className="divide-y divide-slate-700/30">
        {sortedVariants.map((variant, index) => {
          const rowKey = `${variant.chrom}-${variant.pos}-${variant.ref}-${variant.alt}`
          const isRipple = rippleRowKey === rowKey
          const agEntry = agScoreMap?.get(variant.id)

          return (
            <motion.div
              key={rowKey}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
              onClick={() => handleRowClick(variant, rowKey)}
              className={`relative grid ${gridCols} gap-3 px-6 py-4 cursor-pointer group transition-all duration-300
                hover:bg-bg-tertiary/50 hover:shadow-glow-cyan-sm hover:border-l-4 hover:border-l-dna-cyan
                ${index % 2 === 0 ? 'bg-bg-secondary/20' : 'bg-bg-secondary/10'}
                overflow-hidden`}
            >
              {/* Click ripple effect */}
              {isRipple && (
                <motion.div
                  className="absolute inset-0 bg-dna-cyan/10 z-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Chromosome */}
              <div className="flex items-center relative z-10">
                <span className="font-mono-variant font-medium text-slate-200 text-sm">
                  {variant.chrom}
                </span>
              </div>

              {/* Position */}
              <div className="flex items-center relative z-10">
                <span className="font-mono-variant text-slate-300 text-sm">
                  {variant.pos.toLocaleString()}
                </span>
              </div>

              {/* Ref Allele */}
              <div className="flex items-center relative z-10">
                <span className="font-mono-variant text-xs px-2 py-1 bg-slate-700/50 rounded border border-slate-600/50 truncate max-w-full">
                  {variant.ref}
                </span>
              </div>

              {/* Alt Allele */}
              <div className="flex items-center relative z-10">
                <span className="font-mono-variant text-xs px-2 py-1 bg-dna-cyan/10 text-dna-cyan rounded border border-dna-cyan/30 truncate max-w-full">
                  {variant.alt}
                </span>
              </div>

              {/* Gene Symbol */}
              <div className="flex items-center relative z-10">
                {variant.gene_symbol ? (
                  <span className="font-mono-variant font-semibold text-dna-cyan text-sm truncate">
                    {variant.gene_symbol}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* Consequence */}
              <div className="flex items-center relative z-10">
                {variant.consequence ? (
                  <span className="text-sm text-slate-300 font-body truncate">
                    {variant.consequence.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* ClinVar Significance */}
              <div className="flex items-center relative z-10">
                {variant.clinvar_significance ? (
                  <span className={`text-sm font-body font-medium truncate ${getClinVarColor(variant.clinvar_significance)}`}>
                    {variant.clinvar_significance}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* Allele Frequency */}
              <div className="flex items-center relative z-10">
                {variant.allele_freq !== null ? (
                  <span className="font-mono-variant text-xs text-slate-400">
                    {variant.allele_freq.toExponential(2)}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* Risk Score */}
              <div className="flex items-center relative z-10">
                {variant.risk_score !== null ? (
                  <GlowBadge variant="score" severity={getRiskSeverity(variant.risk_score)}>
                    {variant.risk_score}
                  </GlowBadge>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* AlphaGenome Effect Score */}
              {hasAgData && (
                <div className="flex items-center relative z-10">
                  {agEntry?.score != null ? (
                    <span className="font-mono-variant text-xs font-bold text-indigo-400">
                      {agEntry.score.toFixed(3)}
                    </span>
                  ) : agEntry?.status === 'running' ? (
                    <span className="text-xs text-indigo-300 animate-pulse">...</span>
                  ) : agEntry?.status === 'failed' ? (
                    <span className="text-xs text-dna-magenta">err</span>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </div>
              )}

              {/* AlphaGenome Impact */}
              {hasAgData && (
                <div className="flex items-center relative z-10">
                  {(() => {
                    const impact = getAgImpactLabel(agEntry?.score ?? null)
                    if (!impact) return <span className="text-slate-600 text-xs">—</span>
                    return (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-headline font-semibold border ${impact.classes}`}>
                        {impact.label}
                      </span>
                    )
                  })()}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}
