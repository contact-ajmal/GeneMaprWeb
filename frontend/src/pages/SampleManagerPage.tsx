import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Upload, Trash2, Archive, Search, LayoutGrid, List,
  MoreVertical, Eye, Download, RefreshCw, Edit3, FileText,
  ChevronLeft, ChevronRight, HardDrive, AlertTriangle,
  CheckCircle2, Loader2, XCircle, ArchiveRestore, Dna,
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import GlassCard from '../components/ui/GlassCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import DecodeText from '../components/ui/DecodeText'
import { SkeletonKPICards } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useActiveSample } from '../contexts/ActiveSampleContext'
import {
  getSamples, deleteSample, bulkDeleteSamples, archiveSample,
  unarchiveSample, exportSampleCSV, updateSample, reannotateSample,
  rescoreSample,
  type SampleListParams,
} from '../api/samples'
import type { Sample } from '../types/variant'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'

type ViewMode = 'card' | 'table'
type StatusFilter = 'all' | 'processing' | 'complete' | 'failed' | 'archived'

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  processing: { label: 'Processing', color: 'text-dna-cyan', icon: Loader2 },
  annotating: { label: 'Annotating', color: 'text-dna-cyan', icon: Loader2 },
  complete: { label: 'Complete', color: 'text-dna-green', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-dna-magenta', icon: XCircle },
  archived: { label: 'Archived', color: 'text-slate-500', icon: Archive },
}

const typeColors: Record<string, string> = {
  germline: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  somatic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  control: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function SampleManagerPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast: addToast } = useToast()
  const { activeSampleIds, setActiveSampleIds } = useActiveSample()

  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('uploaded_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Sample | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [editingSample, setEditingSample] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const params: SampleListParams = {
    search: searchQuery || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sample_type: typeFilter === 'all' ? undefined : typeFilter,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: 12,
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['samples', params],
    queryFn: () => getSamples(params),
    staleTime: 10_000,
  })

  const samples = data?.samples ?? []
  const total = data?.total ?? 0
  const summary = data?.summary
  const totalPages = Math.ceil(total / 12) || 1

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['samples'] })
    queryClient.invalidateQueries({ queryKey: ['samples-selector'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSample(id),
    onSuccess: (result) => {
      addToast(`Deleted "${result.sample_name}" (${result.deleted_variants} variants)`, 'success')
      // If deleted sample was active, clear it
      if (activeSampleIds.includes(deleteTarget?.id ?? '')) {
        setActiveSampleIds(activeSampleIds.filter(id => id !== deleteTarget?.id))
      }
      invalidate()
      setDeleteTarget(null)
    },
    onError: () => addToast('Failed to delete sample', 'error'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteSamples(ids),
    onSuccess: (result) => {
      addToast(`Deleted ${result.deleted_samples} samples (${result.deleted_variants} variants)`, 'success')
      setActiveSampleIds(activeSampleIds.filter(id => !selectedIds.includes(id)))
      setSelectedIds([])
      invalidate()
      setBulkDeleteOpen(false)
    },
    onError: () => addToast('Failed to delete samples', 'error'),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveSample(id),
    onSuccess: () => { addToast('Sample archived', 'info'); invalidate() },
  })

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => unarchiveSample(id),
    onSuccess: () => { addToast('Sample unarchived', 'success'); invalidate() },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateSample(id, { name }),
    onSuccess: () => { addToast('Sample renamed', 'success'); setEditingSample(null); invalidate() },
    onError: () => addToast('Name already taken', 'error'),
  })

  const reannotateMutation = useMutation({
    mutationFn: (id: string) => reannotateSample(id),
    onSuccess: () => { addToast('Re-annotation started', 'info'); invalidate() },
  })

  const rescoreMutation = useMutation({
    mutationFn: (id: string) => rescoreSample(id),
    onSuccess: () => { addToast('Re-scoring started', 'info'); invalidate() },
  })

  const handleExport = useCallback(async (sampleId: string, sampleName: string) => {
    try {
      const blob = await exportSampleCSV(sampleId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sampleName}_variants.csv`
      a.click()
      URL.revokeObjectURL(url)
      addToast('CSV exported', 'success')
    } catch {
      addToast('Export failed', 'error')
    }
  }, [addToast])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const selectActive = (id: string) => {
    setActiveSampleIds([id])
    navigate('/dashboard')
  }

  // Card View component
  const SampleCard = ({ sample, index }: { sample: Sample; index: number }) => {
    const sConf = statusConfig[sample.status] || statusConfig.complete
    const StatusIcon = sConf.icon
    const isSelected = selectedIds.includes(sample.id)

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <GlassCard
          variant="interactive"
          className={`relative p-5 ${sample.status === 'archived' ? 'opacity-60' : ''} ${isSelected ? 'ring-1 ring-dna-cyan/40' : ''}`}
        >
          {/* Top row: checkbox, status, type */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelect(sample.id) }}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                  ${isSelected ? 'bg-dna-cyan border-dna-cyan' : 'border-slate-600 hover:border-slate-400'}`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-bg-primary" />}
              </button>
              <span className={`flex items-center gap-1 text-xs font-body ${sConf.color}`}>
                <StatusIcon className={`w-3.5 h-3.5 ${sample.status === 'processing' || sample.status === 'annotating' ? 'animate-spin' : ''}`} />
                {sConf.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${typeColors[sample.sample_type] || typeColors.germline}`}>
                {sample.sample_type}
              </span>
              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === sample.id ? null : sample.id)}
                  className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-slate-200"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {menuOpen === sample.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 w-48 z-20 glass-panel-elevated rounded-lg
                        border border-dna-cyan/15 shadow-lg py-1 overflow-hidden"
                    >
                      <MenuItem icon={Edit3} label="Rename" onClick={() => {
                        setEditingSample(sample.id); setEditName(sample.name); setMenuOpen(null)
                      }} />
                      <MenuItem icon={RefreshCw} label="Re-annotate" onClick={() => {
                        reannotateMutation.mutate(sample.id); setMenuOpen(null)
                      }} />
                      <MenuItem icon={RefreshCw} label="Re-score" onClick={() => {
                        rescoreMutation.mutate(sample.id); setMenuOpen(null)
                      }} />
                      <MenuItem icon={Download} label="Export CSV" onClick={() => {
                        handleExport(sample.id, sample.name); setMenuOpen(null)
                      }} />
                      {sample.status === 'archived' ? (
                        <MenuItem icon={ArchiveRestore} label="Unarchive" onClick={() => {
                          unarchiveMutation.mutate(sample.id); setMenuOpen(null)
                        }} />
                      ) : (
                        <MenuItem icon={Archive} label="Archive" onClick={() => {
                          archiveMutation.mutate(sample.id); setMenuOpen(null)
                        }} />
                      )}
                      <div className="border-t border-dna-cyan/10 mt-1 pt-1">
                        <MenuItem icon={Trash2} label="Delete" danger onClick={() => {
                          setDeleteTarget(sample); setMenuOpen(null)
                        }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Sample name */}
          {editingSample === sample.id ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="flex-1 text-base font-headline text-slate-100 bg-transparent border-b
                  border-dna-cyan/30 focus:border-dna-cyan focus:outline-none py-0.5"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') renameMutation.mutate({ id: sample.id, name: editName })
                  if (e.key === 'Escape') setEditingSample(null)
                }}
              />
              <button onClick={() => renameMutation.mutate({ id: sample.id, name: editName })}
                className="text-dna-cyan text-xs font-body">Save</button>
            </div>
          ) : (
            <h3 className="text-base font-headline font-semibold text-slate-100 mb-1 truncate">
              <FileText className="w-4 h-4 inline mr-1.5 text-slate-400" />
              {sample.name}
            </h3>
          )}

          <p className="text-xs text-slate-500 font-body mb-1">
            Uploaded {formatDate(sample.uploaded_at)} &middot; {formatBytes(sample.file_size_bytes)}
          </p>
          {sample.description && (
            <p className="text-xs text-slate-400 font-body mb-3 line-clamp-2 italic">
              "{sample.description}"
            </p>
          )}

          {/* Mini stat cards */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            <MiniStat label="Total" value={sample.total_variants} />
            <MiniStat label="Path." value={sample.pathogenic_count} color="text-dna-magenta" />
            <MiniStat label="L.Pat." value={sample.likely_pathogenic_count} color="text-orange-400" />
            <MiniStat label="VUS" value={sample.vus_count} color="text-dna-amber" />
            <MiniStat label="Avg RS" value={sample.mean_risk_score?.toFixed(1) ?? '—'} color="text-dna-cyan" />
          </div>

          {/* Top genes */}
          {sample.top_genes && sample.top_genes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {sample.top_genes.map(g => (
                <span key={g.gene} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                  {g.gene} ({g.count})
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-dna-cyan/5">
            <button
              onClick={() => selectActive(sample.id)}
              className="text-xs font-body text-dna-cyan hover:text-dna-cyan/80 flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> View Dashboard
            </button>
            <button
              onClick={() => handleExport(sample.id, sample.name)}
              className="text-xs font-body text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => { setActiveSampleIds([sample.id]); navigate('/dashboard') }}
              className="text-xs font-body text-dna-green hover:text-dna-green/80 flex items-center gap-1 ml-auto"
            >
              <Dna className="w-3.5 h-3.5" /> Analyze
            </button>
          </div>
        </GlassCard>
      </motion.div>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-headline font-bold text-slate-100 flex items-center gap-3">
              <Database className="w-7 h-7 text-dna-cyan" />
              <DecodeText text="Sample Workspace" trigger="mount" speed={25} />
            </h1>
            <p className="text-sm text-slate-400 font-body mt-1">
              Manage your uploaded VCF samples and analysis data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnimatedButton
              variant="primary"
              onClick={() => navigate('/')}
              className="text-sm"
            >
              <Upload className="w-4 h-4 mr-1.5" /> Upload New Sample
            </AnimatedButton>
            {selectedIds.length > 0 && (
              <AnimatedButton
                variant="danger"
                onClick={() => setBulkDeleteOpen(true)}
                className="text-sm"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete ({selectedIds.length})
              </AnimatedButton>
            )}
          </div>
        </div>

        {/* Storage indicator */}
        {summary && (
          <GlassCard className="p-3">
            <div className="flex items-center gap-4 text-xs font-body text-slate-400">
              <HardDrive className="w-4 h-4 text-dna-cyan" />
              <span>
                <span className="text-slate-200 font-medium">{formatBytes(summary.storage_used_bytes)}</span> used
              </span>
              <span className="text-dna-cyan/30">|</span>
              <span>
                <span className="text-slate-200 font-medium">{summary.total_samples}</span> samples
              </span>
              <span className="text-dna-cyan/30">|</span>
              <span>
                <span className="text-slate-200 font-medium">{summary.total_variants_all.toLocaleString()}</span> total variants
              </span>
              {summary.total_pathogenic_all > 0 && (
                <>
                  <span className="text-dna-cyan/30">|</span>
                  <span>
                    <span className="text-dna-magenta font-medium">{summary.total_pathogenic_all}</span> pathogenic
                  </span>
                </>
              )}
            </div>
          </GlassCard>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              placeholder="Search by name, filename, description..."
              className="w-full pl-9 pr-3 py-2 text-sm font-body bg-transparent
                glass-panel rounded-lg text-slate-200 placeholder-slate-500
                focus:outline-none focus:border-dna-cyan/30 border border-transparent"
            />
          </div>

          {/* Status chips */}
          <div className="flex items-center gap-1">
            {(['all', 'complete', 'processing', 'failed', 'archived'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-xs font-body transition-colors
                  ${statusFilter === s
                    ? 'bg-dna-cyan/15 text-dna-cyan border border-dna-cyan/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className="px-3 py-1.5 text-xs font-body glass-panel rounded-lg bg-transparent
              text-slate-300 border border-dna-cyan/10 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="germline">Germline</option>
            <option value="somatic">Somatic</option>
            <option value="control">Control</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={e => {
              const [sb, so] = e.target.value.split('_')
              setSortBy(sb); setSortOrder(so); setPage(1)
            }}
            className="px-3 py-1.5 text-xs font-body glass-panel rounded-lg bg-transparent
              text-slate-300 border border-dna-cyan/10 focus:outline-none"
          >
            <option value="uploaded_at_desc">Newest</option>
            <option value="uploaded_at_asc">Oldest</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="total_variants_desc">Most Variants</option>
            <option value="pathogenic_count_desc">Most Pathogenic</option>
            <option value="mean_risk_score_desc">Highest Risk</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center glass-panel rounded-lg overflow-hidden border border-dna-cyan/10">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-dna-cyan/15 text-dna-cyan' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-dna-cyan/15 text-dna-cyan' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonKPICards key={i} />)}
          </div>
        ) : isError ? (
          <GlassCard className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-dna-amber mx-auto mb-3" />
            <p className="text-slate-300 font-body">Failed to load samples</p>
          </GlassCard>
        ) : samples.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-headline font-semibold text-slate-300 mb-2">No samples found</h3>
            <p className="text-sm text-slate-500 font-body mb-4">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload a VCF file to get started'}
            </p>
            <AnimatedButton variant="primary" onClick={() => navigate('/')}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload Sample
            </AnimatedButton>
          </GlassCard>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {samples.map((sample, i) => (
              <SampleCard key={sample.id} sample={sample} index={i} />
            ))}
          </div>
        ) : (
          /* Table View */
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dna-cyan/10">
                    <th className="px-4 py-3 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === samples.length && samples.length > 0}
                        onChange={() => {
                          if (selectedIds.length === samples.length) setSelectedIds([])
                          else setSelectedIds(samples.map(s => s.id))
                        }}
                        className="rounded border-slate-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-body font-medium text-slate-400">Name</th>
                    <th className="px-4 py-3 text-left font-body font-medium text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left font-body font-medium text-slate-400">Type</th>
                    <th className="px-4 py-3 text-right font-body font-medium text-slate-400">Variants</th>
                    <th className="px-4 py-3 text-right font-body font-medium text-slate-400">Pathogenic</th>
                    <th className="px-4 py-3 text-right font-body font-medium text-slate-400">VUS</th>
                    <th className="px-4 py-3 text-right font-body font-medium text-slate-400">Avg Risk</th>
                    <th className="px-4 py-3 text-left font-body font-medium text-slate-400">Uploaded</th>
                    <th className="px-4 py-3 text-center font-body font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample, i) => {
                    const sConf = statusConfig[sample.status] || statusConfig.complete
                    const isSelected = selectedIds.includes(sample.id)
                    return (
                      <motion.tr
                        key={sample.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => selectActive(sample.id)}
                        className={`border-b border-dna-cyan/5 cursor-pointer transition-colors hover:bg-white/3
                          ${isSelected ? 'bg-dna-cyan/5 border-l-2 border-l-dna-cyan' : ''}
                          ${sample.status === 'archived' ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(sample.id)}
                            className="rounded border-slate-600"
                          />
                        </td>
                        <td className="px-4 py-3 font-body text-slate-200 font-medium">{sample.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-body ${sConf.color}`}>{sConf.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[sample.sample_type] || typeColors.germline}`}>
                            {sample.sample_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-300">{sample.total_variants}</td>
                        <td className="px-4 py-3 text-right font-mono text-dna-magenta">{sample.pathogenic_count}</td>
                        <td className="px-4 py-3 text-right font-mono text-dna-amber">{sample.vus_count}</td>
                        <td className="px-4 py-3 text-right font-mono text-dna-cyan">{sample.mean_risk_score?.toFixed(1) ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-body">{formatDate(sample.uploaded_at)}</td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => selectActive(sample.id)} className="p-1 text-slate-400 hover:text-dna-cyan" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleExport(sample.id, sample.name)} className="p-1 text-slate-400 hover:text-slate-200" title="Export">
                              <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteTarget(sample)} className="p-1 text-slate-400 hover:text-dna-magenta" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-body text-slate-400">
              Page <span className="text-slate-200">{page}</span> of <span className="text-slate-200">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmationModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          isLoading={deleteMutation.isPending}
          sampleName={deleteTarget.name}
          variantCount={deleteTarget.total_variants}
          pathogenicCount={deleteTarget.pathogenic_count}
          uploadDate={formatDate(deleteTarget.uploaded_at)}
        />
      )}

      {/* Bulk Delete Modal */}
      {bulkDeleteOpen && (
        <DeleteConfirmationModal
          isOpen={bulkDeleteOpen}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
          isLoading={bulkDeleteMutation.isPending}
          sampleName={`${selectedIds.length} samples`}
          variantCount={samples.filter(s => selectedIds.includes(s.id)).reduce((sum, s) => sum + s.total_variants, 0)}
          pathogenicCount={samples.filter(s => selectedIds.includes(s.id)).reduce((sum, s) => sum + s.pathogenic_count, 0)}
          isBulk
          bulkNames={samples.filter(s => selectedIds.includes(s.id)).map(s => s.name)}
        />
      )}
    </PageTransition>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="text-center glass-panel rounded-lg py-1.5 px-1">
      <p className={`text-sm font-mono font-semibold ${color || 'text-slate-200'}`}>{value}</p>
      <p className="text-[10px] text-slate-500 font-body">{label}</p>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-body transition-colors
        ${danger ? 'text-dna-magenta hover:bg-dna-magenta/10' : 'text-slate-300 hover:bg-white/5'}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
