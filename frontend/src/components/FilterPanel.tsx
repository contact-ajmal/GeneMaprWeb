import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VariantFilters } from '../types/variant'
import GlassCard from './ui/GlassCard'
import AnimatedButton from './ui/AnimatedButton'
import GlowBadge from './ui/GlowBadge'
import { Filter, ChevronDown, X } from 'lucide-react'

interface FilterPanelProps {
  filters: VariantFilters
  onFiltersChange: (filters: VariantFilters) => void
  onClearFilters: () => void
}

const CLINICAL_SIGNIFICANCE_OPTIONS = [
  'Pathogenic',
  'Likely pathogenic',
  'Uncertain significance',
  'Likely benign',
  'Benign',
]

const CONSEQUENCE_OPTIONS = [
  'missense_variant',
  'synonymous_variant',
  'stop_gained',
  'frameshift_variant',
  'splice_donor_variant',
  'splice_acceptor_variant',
  'inframe_deletion',
  'inframe_insertion',
]

export default function FilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const updateFilter = (key: keyof VariantFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleConsequence = (consequence: string) => {
    const current = filters.consequence || []
    const updated = current.includes(consequence)
      ? current.filter((c) => c !== consequence)
      : [...current, consequence]
    updateFilter('consequence', updated)
  }

  const removeFilter = (key: keyof VariantFilters) => {
    const updated = { ...filters }
    delete updated[key]
    onFiltersChange(updated)
  }

  const hasActiveFilters =
    filters.gene ||
    filters.clinvar_significance ||
    filters.af_min !== undefined ||
    filters.af_max !== undefined ||
    (filters.consequence && filters.consequence.length > 0) ||
    filters.risk_score_min !== undefined ||
    filters.risk_score_max !== undefined

  const inputClassName = (name: string) => `
    w-full px-4 py-2 bg-transparent border-b-2 text-slate-100 font-mono-variant
    placeholder-slate-500 focus:outline-none
    transition-all duration-300
    ${focusedInput === name
      ? 'border-dna-cyan shadow-[0_2px_10px_rgba(0,212,255,0.15)]'
      : 'border-slate-600 hover:border-slate-500'
    }
  `

  const smallInputClassName = (name: string) => `
    px-3 py-2 bg-transparent border-b-2 text-slate-100 font-mono-variant text-sm
    placeholder-slate-500 focus:outline-none
    transition-all duration-300
    ${focusedInput === name
      ? 'border-dna-cyan shadow-[0_2px_10px_rgba(0,212,255,0.15)]'
      : 'border-slate-600 hover:border-slate-500'
    }
  `

  return (
    <GlassCard variant="elevated" className="overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-tertiary/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-dna-cyan" />
          <h3 className="font-headline font-semibold text-slate-100">Filters</h3>
          {hasActiveFilters && (
            <GlowBadge variant="score" severity={5}>
              Active
            </GlowBadge>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </div>

      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {filters.gene && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center space-x-1 px-3 py-1 glass-panel-interactive rounded-full border border-dna-cyan/30 shadow-glow-cyan-sm group hover:border-dna-cyan/50 transition-colors"
            >
              <span className="text-xs font-mono-variant text-slate-300">Gene: {filters.gene}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFilter('gene')
                }}
                className="text-slate-400 hover:text-dna-cyan transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
          {filters.clinvar_significance && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center space-x-1 px-3 py-1 glass-panel-interactive rounded-full border border-dna-cyan/30 shadow-glow-cyan-sm group hover:border-dna-cyan/50 transition-colors"
            >
              <span className="text-xs font-mono-variant text-slate-300">{filters.clinvar_significance}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFilter('clinvar_significance')
                }}
                className="text-slate-400 hover:text-dna-cyan transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Filter Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-5 border-t border-slate-700/50">
              {/* Gene Filter */}
              <div className="pt-4">
                <label className="block text-sm font-body font-medium text-slate-300 mb-2">
                  Gene Symbol
                </label>
                <input
                  type="text"
                  value={filters.gene || ''}
                  onChange={(e) => updateFilter('gene', e.target.value || undefined)}
                  onFocus={() => setFocusedInput('gene')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="e.g., BRCA1, TP53"
                  className={inputClassName('gene')}
                />
              </div>

              {/* Clinical Significance */}
              <div>
                <label className="block text-sm font-body font-medium text-slate-300 mb-2">
                  Clinical Significance
                </label>
                <div className="relative">
                  <select
                    value={filters.clinvar_significance || ''}
                    onChange={(e) =>
                      updateFilter('clinvar_significance', e.target.value || undefined)
                    }
                    onFocus={() => setFocusedInput('clinvar')}
                    onBlur={() => setFocusedInput(null)}
                    className={`w-full px-4 py-2 bg-bg-tertiary/50 border rounded-lg text-slate-100 font-body
                      focus:outline-none transition-all duration-300 appearance-none cursor-pointer
                      ${focusedInput === 'clinvar'
                        ? 'border-dna-cyan shadow-[0_0_10px_rgba(0,212,255,0.15)]'
                        : 'border-slate-600 hover:border-slate-500'
                      }`}
                  >
                    <option value="" className="bg-bg-secondary">All Variants</option>
                    {CLINICAL_SIGNIFICANCE_OPTIONS.map((option) => (
                      <option key={option} value={option} className="bg-bg-secondary">
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Allele Frequency Range */}
              <div>
                <label className="block text-sm font-body font-medium text-slate-300 mb-2">
                  Allele Frequency (AF)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={filters.af_min ?? ''}
                    onChange={(e) =>
                      updateFilter(
                        'af_min',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    onFocus={() => setFocusedInput('af_min')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="Min"
                    min="0"
                    max="1"
                    step="0.001"
                    className={smallInputClassName('af_min')}
                  />
                  <input
                    type="number"
                    value={filters.af_max ?? ''}
                    onChange={(e) =>
                      updateFilter(
                        'af_max',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    onFocus={() => setFocusedInput('af_max')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="Max"
                    min="0"
                    max="1"
                    step="0.001"
                    className={smallInputClassName('af_max')}
                  />
                </div>
              </div>

              {/* Risk Score Range */}
              <div>
                <label className="block text-sm font-body font-medium text-slate-300 mb-2">
                  Risk Score (0-100)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={filters.risk_score_min ?? ''}
                    onChange={(e) =>
                      updateFilter(
                        'risk_score_min',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    onFocus={() => setFocusedInput('risk_min')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="Min"
                    min="0"
                    max="100"
                    step="1"
                    className={smallInputClassName('risk_min')}
                  />
                  <input
                    type="number"
                    value={filters.risk_score_max ?? ''}
                    onChange={(e) =>
                      updateFilter(
                        'risk_score_max',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    onFocus={() => setFocusedInput('risk_max')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="Max"
                    min="0"
                    max="100"
                    step="1"
                    className={smallInputClassName('risk_max')}
                  />
                </div>
              </div>

              {/* Consequence Type */}
              <div>
                <label className="block text-sm font-body font-medium text-slate-300 mb-2">
                  Consequence Type
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {CONSEQUENCE_OPTIONS.map((consequence) => (
                    <label
                      key={consequence}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-bg-tertiary/30 p-2 rounded-lg transition-colors group"
                    >
                      <input
                        type="checkbox"
                        checked={(filters.consequence || []).includes(consequence)}
                        onChange={() => toggleConsequence(consequence)}
                        className="w-4 h-4 bg-bg-tertiary border-2 border-slate-600 rounded
                          checked:bg-dna-cyan checked:border-dna-cyan
                          focus:ring-2 focus:ring-dna-cyan focus:ring-offset-0
                          transition-all cursor-pointer"
                      />
                      <span className="text-sm text-slate-300 font-body group-hover:text-slate-100 transition-colors">
                        {consequence.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <AnimatedButton
                  onClick={onClearFilters}
                  variant="ghost"
                  className="w-full"
                >
                  Clear All Filters
                </AnimatedButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 255, 0.5);
        }
      `}</style>
    </GlassCard>
  )
}
