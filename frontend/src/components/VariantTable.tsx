import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Variant } from '../types/variant'
import GlassCard from './ui/GlassCard'
import GlowBadge from './ui/GlowBadge'
import { ChevronUp, ChevronDown, ChevronsUpDown, Dna } from 'lucide-react'

interface VariantTableProps {
  variants: Variant[]
  onRowClick: (variant: Variant) => void
}

type SortField = 'chrom' | 'pos' | 'gene_symbol' | 'risk_score' | 'allele_freq'
type SortDirection = 'asc' | 'desc' | null

export default function VariantTable({ variants, onRowClick }: VariantTableProps) {
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

  return (
    <GlassCard variant="elevated" className="overflow-hidden">
      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-700/50 bg-bg-tertiary/30">
        <button
          onClick={() => handleSort('chrom')}
          className={`col-span-1 ${sortableHeaderClass('chrom')}`}
        >
          <span>Chr</span>
          <SortIcon field="chrom" />
        </button>
        <button
          onClick={() => handleSort('pos')}
          className={`col-span-2 ${sortableHeaderClass('pos')}`}
        >
          <span>Position</span>
          <SortIcon field="pos" />
        </button>
        <div className="col-span-1 text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider">
          Ref
        </div>
        <div className="col-span-1 text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider">
          Alt
        </div>
        <button
          onClick={() => handleSort('gene_symbol')}
          className={`col-span-1 ${sortableHeaderClass('gene_symbol')}`}
        >
          <span>Gene</span>
          <SortIcon field="gene_symbol" />
        </button>
        <div className="col-span-2 text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider">
          Consequence
        </div>
        <div className="col-span-2 text-xs font-headline font-semibold text-slate-400 uppercase tracking-wider">
          ClinVar
        </div>
        <button
          onClick={() => handleSort('allele_freq')}
          className={`col-span-1 ${sortableHeaderClass('allele_freq')}`}
        >
          <span>AF</span>
          <SortIcon field="allele_freq" />
        </button>
        <button
          onClick={() => handleSort('risk_score')}
          className={`col-span-1 ${sortableHeaderClass('risk_score')}`}
        >
          <span>Risk</span>
          <SortIcon field="risk_score" />
        </button>
      </div>

      {/* Variant Rows */}
      <div className="divide-y divide-slate-700/30">
        {sortedVariants.map((variant, index) => {
          const rowKey = `${variant.chrom}-${variant.pos}-${variant.ref}-${variant.alt}`
          const isRipple = rippleRowKey === rowKey

          return (
            <motion.div
              key={rowKey}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
              onClick={() => handleRowClick(variant, rowKey)}
              className={`relative grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer group transition-all duration-300
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
              <div className="col-span-1 flex items-center relative z-10">
                <span className="font-mono-variant font-medium text-slate-200 text-sm">
                  {variant.chrom}
                </span>
              </div>

              {/* Position */}
              <div className="col-span-2 flex items-center relative z-10">
                <span className="font-mono-variant text-slate-300 text-sm">
                  {variant.pos.toLocaleString()}
                </span>
              </div>

              {/* Ref Allele */}
              <div className="col-span-1 flex items-center relative z-10">
                <span className="font-mono-variant text-xs px-2 py-1 bg-slate-700/50 rounded border border-slate-600/50">
                  {variant.ref}
                </span>
              </div>

              {/* Alt Allele */}
              <div className="col-span-1 flex items-center relative z-10">
                <span className="font-mono-variant text-xs px-2 py-1 bg-dna-cyan/10 text-dna-cyan rounded border border-dna-cyan/30">
                  {variant.alt}
                </span>
              </div>

              {/* Gene Symbol */}
              <div className="col-span-1 flex items-center relative z-10">
                {variant.gene_symbol ? (
                  <span className="font-mono-variant font-semibold text-dna-cyan">
                    {variant.gene_symbol}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* Consequence */}
              <div className="col-span-2 flex items-center relative z-10">
                {variant.consequence ? (
                  <span className="text-sm text-slate-300 font-body">
                    {variant.consequence.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* ClinVar Significance - Colored text, not badges */}
              <div className="col-span-2 flex items-center relative z-10">
                {variant.clinvar_significance ? (
                  <span className={`text-sm font-body font-medium ${getClinVarColor(variant.clinvar_significance)}`}>
                    {variant.clinvar_significance}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* Allele Frequency - Scientific notation */}
              <div className="col-span-1 flex items-center relative z-10">
                {variant.allele_freq !== null ? (
                  <span className="font-mono-variant text-xs text-slate-400">
                    {variant.allele_freq.toExponential(2)}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              {/* Risk Score - GlowBadge */}
              <div className="col-span-1 flex items-center relative z-10">
                {variant.risk_score !== null ? (
                  <GlowBadge variant="score" severity={getRiskSeverity(variant.risk_score)}>
                    {variant.risk_score}
                  </GlowBadge>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}
