import { motion, AnimatePresence } from 'framer-motion'
import type { Variant } from '../types/variant'
import GlowBadge from './ui/GlowBadge'
import { X, MapPin, Dna, FileText, Zap, Activity, Globe, Hash } from 'lucide-react'

interface VariantDetailModalProps {
  variant: Variant | null
  onClose: () => void
}

export default function VariantDetailModal({
  variant,
  onClose,
}: VariantDetailModalProps) {
  const getRiskSeverity = (score: number | null): number => {
    if (score === null) return 0
    if (score >= 75) return 9
    if (score >= 50) return 7
    if (score >= 25) return 5
    return 3
  }

  const getRiskLabel = (score: number | null) => {
    if (score === null) return 'Unknown'
    if (score >= 75) return 'High Risk'
    if (score >= 50) return 'Moderate Risk'
    if (score >= 25) return 'Low-Moderate'
    return 'Low Risk'
  }

  const getRiskBarColor = (score: number) => {
    if (score >= 75) return 'from-dna-magenta to-red-500'
    if (score >= 50) return 'from-dna-amber to-orange-500'
    if (score >= 25) return 'from-yellow-400 to-dna-amber'
    return 'from-dna-green to-emerald-400'
  }

  return (
    <AnimatePresence>
      {variant && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
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
            className="relative glass-panel-elevated rounded-2xl shadow-glow-cyan max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-dna-cyan/20"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 glass-panel-elevated border-b border-slate-700/50 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-headline font-bold text-slate-100">
                  Variant Details
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono-variant text-dna-cyan">
                    {variant.chrom}:{variant.pos.toLocaleString()}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="font-mono-variant text-sm px-2 py-0.5 bg-slate-700/50 rounded border border-slate-600/50">
                    {variant.ref}
                  </span>
                  <span className="text-slate-500 text-sm">&rarr;</span>
                  <span className="font-mono-variant text-sm px-2 py-0.5 bg-dna-cyan/10 text-dna-cyan rounded border border-dna-cyan/30">
                    {variant.alt}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 glass-panel hover:glass-panel-interactive rounded-lg transition-all group"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-dna-cyan transition-colors" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Risk Score */}
              {variant.risk_score !== null && (
                <motion.div
                  className="glass-panel rounded-xl p-5 border border-dna-cyan/10"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-headline font-semibold text-slate-100 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-dna-cyan" />
                      Risk Assessment
                    </h3>
                    <GlowBadge variant="score" severity={getRiskSeverity(variant.risk_score)}>
                      {getRiskLabel(variant.risk_score)}
                    </GlowBadge>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${getRiskBarColor(variant.risk_score)} rounded-full shadow-glow-cyan-sm`}
                          initial={{ width: '0%' }}
                          animate={{ width: `${variant.risk_score}%` }}
                          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <span className="text-xl font-headline font-bold text-slate-100">
                      {variant.risk_score}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* AI Summary */}
              {variant.ai_summary && (
                <motion.div
                  className="relative rounded-xl p-5 overflow-hidden"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
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
                        AI-Generated Summary
                      </h3>
                      <p className="text-slate-300 leading-relaxed font-body">{variant.ai_summary}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Basic Information */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-dna-cyan" />
                  Genomic Location
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <InfoItem icon={<Hash className="w-4 h-4" />} label="Chromosome" value={variant.chrom} />
                  <InfoItem icon={<MapPin className="w-4 h-4" />} label="Position" value={variant.pos.toLocaleString()} />
                  <InfoItem label="Reference" value={variant.ref} mono />
                  <InfoItem label="Alternate" value={variant.alt} mono highlight />
                  <InfoItem icon={<Dna className="w-4 h-4" />} label="Gene" value={variant.gene_symbol || 'N/A'} highlight={!!variant.gene_symbol} />
                  <InfoItem label="Consequence" value={variant.consequence?.replace(/_/g, ' ') || 'N/A'} />
                </div>
              </motion.div>

              {/* Clinical Information */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-dna-magenta" />
                  Clinical Information
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <InfoItem
                    label="Clinical Significance"
                    value={variant.clinvar_significance || 'N/A'}
                    clinvar={variant.clinvar_significance}
                  />
                  <InfoItem
                    label="Allele Frequency"
                    value={variant.allele_freq !== null ? variant.allele_freq.toExponential(3) : 'N/A'}
                    mono
                  />
                </div>
              </motion.div>

              {/* Additional Information */}
              {(variant.rs_id || variant.transcript_id || variant.protein_change) && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-sm font-headline font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-dna-green" />
                    Annotations
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {variant.rs_id && <InfoItem label="dbSNP ID" value={variant.rs_id} mono highlight />}
                    {variant.transcript_id && <InfoItem label="Transcript" value={variant.transcript_id} mono />}
                    {variant.protein_change && <InfoItem label="Protein Change" value={variant.protein_change} mono highlight />}
                    {variant.gnomad_af !== null && (
                      <InfoItem label="gnomAD AF" value={variant.gnomad_af.toExponential(3)} mono />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Metadata */}
              <motion.div
                className="border-t border-slate-700/50 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-sm text-slate-500 font-body">
                  Created: {new Date(variant.created_at).toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 mt-1 font-mono-variant">ID: {variant.id}</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface InfoItemProps {
  label: string
  value: string | number
  highlight?: boolean
  mono?: boolean
  icon?: React.ReactNode
  clinvar?: string | null
}

function InfoItem({ label, value, highlight, mono, icon, clinvar }: InfoItemProps) {
  const getClinvarColor = (sig: string | null) => {
    if (!sig) return ''
    const s = sig.toLowerCase()
    if (s.includes('pathogenic') && !s.includes('likely')) return 'text-dna-magenta'
    if (s.includes('likely') && s.includes('pathogenic')) return 'text-amber-400'
    if (s.includes('benign') && !s.includes('likely')) return 'text-dna-green'
    if (s.includes('likely') && s.includes('benign')) return 'text-green-400'
    return 'text-dna-amber'
  }

  return (
    <motion.div
      className="glass-panel rounded-lg p-3 border border-slate-700/30 hover:border-dna-cyan/20 transition-all duration-200 group
        hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,212,255,0.08)]"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-dna-cyan">{icon}</span>}
        <p className="text-xs text-slate-500 font-body">{label}</p>
      </div>
      <p
        className={`font-medium ${
          clinvar
            ? getClinvarColor(clinvar)
            : highlight
            ? 'text-dna-cyan'
            : 'text-slate-100'
        } ${mono ? 'font-mono-variant' : 'font-body'}`}
      >
        {value}
      </p>
    </motion.div>
  )
}
