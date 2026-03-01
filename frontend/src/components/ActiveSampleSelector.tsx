import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Check, Search, Database, X } from 'lucide-react'
import { useActiveSample } from '../contexts/ActiveSampleContext'
import { getSamples } from '../api/samples'

export default function ActiveSampleSelector() {
  const navigate = useNavigate()
  const { activeSampleIds, activeSamples, setActiveSampleIds, setActiveSamples, toggleSample } = useActiveSample()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: sampleData } = useQuery({
    queryKey: ['samples-selector'],
    queryFn: () => getSamples({ page_size: 50, sort_by: 'uploaded_at', sort_order: 'desc' }),
    staleTime: 30_000,
  })

  const allSamples = sampleData?.samples ?? []

  // Sync active samples data when IDs or sample list changes
  useEffect(() => {
    if (allSamples.length > 0) {
      const active = allSamples.filter(s => activeSampleIds.includes(s.id))
      setActiveSamples(active)
      // Clean up stale IDs
      const validIds = active.map(s => s.id)
      if (validIds.length !== activeSampleIds.length) {
        setActiveSampleIds(validIds)
      }
    }
  }, [allSamples, activeSampleIds, setActiveSamples, setActiveSampleIds])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = allSamples.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.original_filename.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor: Record<string, string> = {
    complete: 'bg-dna-green',
    processing: 'bg-dna-cyan animate-pulse',
    annotating: 'bg-dna-cyan animate-pulse',
    failed: 'bg-dna-magenta',
    archived: 'bg-slate-500',
  }

  const displayLabel = activeSamples.length === 0
    ? 'Select Sample'
    : activeSamples.length === 1
    ? activeSamples[0].name
    : `${activeSamples.length} samples`

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-body
          transition-colors duration-200
          ${activeSamples.length > 0
            ? 'glass-panel-interactive text-dna-cyan border-dna-cyan/20'
            : 'glass-panel text-slate-400 hover:text-slate-200'
          }
        `}
        whileTap={{ scale: 0.98 }}
      >
        <Database className="w-4 h-4 flex-shrink-0" />
        <span className="max-w-[140px] truncate">{displayLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 z-50 glass-panel-elevated rounded-xl
              border border-dna-cyan/15 shadow-glow-cyan overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-dna-cyan/10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search samples..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm font-body bg-transparent
                    border border-dna-cyan/10 rounded-lg text-slate-200
                    placeholder-slate-500 focus:outline-none focus:border-dna-cyan/30"
                  autoFocus
                />
              </div>
            </div>

            {/* Sample list */}
            <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-slate-500 font-body">No samples found</p>
                </div>
              ) : (
                filtered.map(sample => {
                  const isActive = activeSampleIds.includes(sample.id)
                  return (
                    <button
                      key={sample.id}
                      onClick={() => toggleSample(sample.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left
                        transition-colors duration-150 hover:bg-white/5
                        ${isActive ? 'bg-dna-cyan/5' : ''}
                      `}
                    >
                      {/* Checkbox indicator */}
                      <div className={`
                        w-4 h-4 rounded flex-shrink-0 flex items-center justify-center
                        border transition-colors
                        ${isActive
                          ? 'bg-dna-cyan border-dna-cyan'
                          : 'border-slate-600 hover:border-slate-400'
                        }
                      `}>
                        {isActive && <Check className="w-3 h-3 text-bg-primary" />}
                      </div>

                      {/* Status dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[sample.status] || 'bg-slate-500'}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-body truncate">{sample.name}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {sample.total_variants} variants
                          {sample.pathogenic_count > 0 && (
                            <span className="text-dna-magenta"> &middot; {sample.pathogenic_count} path.</span>
                          )}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-dna-cyan/10 p-2 flex items-center justify-between">
              {activeSampleIds.length > 0 && (
                <button
                  onClick={() => { setActiveSampleIds([]); setActiveSamples([]) }}
                  className="text-xs text-slate-500 hover:text-slate-300 font-body flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
              <button
                onClick={() => { setIsOpen(false); navigate('/samples') }}
                className="text-xs text-dna-cyan hover:text-dna-cyan/80 font-body ml-auto"
              >
                Manage Samples
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
