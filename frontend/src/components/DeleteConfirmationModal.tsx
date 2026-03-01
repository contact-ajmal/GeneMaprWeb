import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, X, FileText } from 'lucide-react'
import AnimatedButton from './ui/AnimatedButton'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  sampleName: string
  variantCount: number
  pathogenicCount?: number
  uploadDate?: string
  isBulk?: boolean
  bulkNames?: string[]
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  sampleName,
  variantCount,
  pathogenicCount = 0,
  uploadDate,
  isBulk = false,
  bulkNames = [],
}: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const canDelete = confirmText === 'DELETE'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md glass-panel-elevated rounded-2xl
              border border-dna-magenta/20 shadow-glow-magenta overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-dna-magenta/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dna-magenta/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-dna-magenta" />
                </div>
                <h3 className="text-lg font-headline font-bold text-slate-100">
                  Delete Sample Data
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-300 font-body">
                You are about to permanently delete:
              </p>

              {isBulk ? (
                <div className="space-y-1">
                  {bulkNames.map(name => (
                    <div key={name} className="flex items-center gap-2 p-2 rounded-lg bg-white/3">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-200 font-body truncate">{name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-dna-magenta/10">
                  <FileText className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-body font-medium text-slate-200">{sampleName}</p>
                    <p className="text-xs text-slate-500 font-body mt-0.5">
                      {variantCount.toLocaleString()} variants
                      {pathogenicCount > 0 && (
                        <span className="text-dna-magenta"> &middot; {pathogenicCount} pathogenic findings</span>
                      )}
                    </p>
                    {uploadDate && (
                      <p className="text-xs text-slate-500 font-body">Uploaded: {uploadDate}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-dna-magenta/5 border border-dna-magenta/15">
                <p className="text-xs text-dna-magenta font-body">
                  This action cannot be undone. All variant data, annotations, and AI summaries will be permanently removed.
                </p>
              </div>

              {/* Confirmation input */}
              <div>
                <label className="block text-xs text-slate-400 font-body mb-1.5">
                  Type <span className="text-slate-200 font-medium">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 text-sm font-mono bg-transparent rounded-lg
                    border border-dna-magenta/20 text-slate-200 placeholder-slate-600
                    focus:outline-none focus:border-dna-magenta/40"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-dna-cyan/5">
              <AnimatedButton variant="ghost" onClick={onClose}>
                Cancel
              </AnimatedButton>
              <AnimatedButton
                variant="danger"
                onClick={onConfirm}
                disabled={!canDelete}
                loading={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Permanently
              </AnimatedButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
