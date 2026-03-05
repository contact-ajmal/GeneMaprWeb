/**
 * AlphaGenomePage — Dashboard for AlphaGenome variant effect predictions.
 *
 * Shows summary cards, score distribution, top-impact variants table,
 * and allows triggering batch predictions for all variants in a sample.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useActiveSample } from '../contexts/ActiveSampleContext'
import {
    runBatchPredictions,
    getPredictions,
    getPredictionStats,
    getBatchStatus,
} from '../api/alphagenome'
import type {
    AlphaGenomePredictionRow,
    AlphaGenomeStats,
    AlphaGenomeBatchStatus,
    AlphaGenomeOutputType,
} from '../types/variant'
import {
    Sparkles, Activity, BarChart3, AlertTriangle,
    Play, CheckCircle, XCircle, Clock, Dna,
    ChevronDown, ChevronUp, Zap,
    TrendingUp, Target, Loader2,
} from 'lucide-react'

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AlphaGenomePage() {
    const { primarySampleId, activeSamples } = useActiveSample()
    const sampleId = primarySampleId

    const [stats, setStats] = useState<AlphaGenomeStats | null>(null)
    const [batchStatus, setBatchStatus] = useState<AlphaGenomeBatchStatus | null>(null)
    const [predictions, setPredictions] = useState<AlphaGenomePredictionRow[]>([])
    const [loading, setLoading] = useState(false)
    const [batchLoading, setBatchLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedRow, setExpandedRow] = useState<string | null>(null)
    const [outputType, setOutputType] = useState<AlphaGenomeOutputType>('RNA_SEQ')

    const sampleName = activeSamples.find(s => s.id === sampleId)?.name || 'Unknown Sample'

    // ─── Fetch data ──────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        if (!sampleId) return
        setLoading(true)
        setError(null)
        try {
            const [statsData, predsData, statusData] = await Promise.all([
                getPredictionStats(sampleId),
                getPredictions(sampleId),
                getBatchStatus(sampleId),
            ])
            setStats(statsData)
            setPredictions(predsData.predictions)
            setBatchStatus(statusData)
        } catch (err: any) {
            setError(err?.response?.data?.detail || err?.message || 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [sampleId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Poll while batch is running
    useEffect(() => {
        if (!batchStatus?.is_running || !sampleId) return
        const timer = setInterval(async () => {
            try {
                const [statusData, statsData, predsData] = await Promise.all([
                    getBatchStatus(sampleId),
                    getPredictionStats(sampleId),
                    getPredictions(sampleId),
                ])
                setBatchStatus(statusData)
                setStats(statsData)
                setPredictions(predsData.predictions)
                if (!statusData.is_running) setBatchLoading(false)
            } catch { /* ignore poll errors */ }
        }, 5000)
        return () => clearInterval(timer)
    }, [batchStatus?.is_running, sampleId])

    // ─── Handlers ────────────────────────────────────────────────────────────

    const handleRunBatch = async () => {
        if (!sampleId) return
        setBatchLoading(true)
        try {
            await runBatchPredictions(sampleId, outputType)
            // Start polling
            setBatchStatus(prev => prev ? { ...prev, is_running: true } : null)
            // Refresh after a short delay
            setTimeout(fetchData, 2000)
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Failed to start batch')
            setBatchLoading(false)
        }
    }

    // ─── No sample selected ─────────────────────────────────────────────────

    if (!sampleId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    className="text-center glass-panel rounded-2xl p-12 border border-dna-cyan/10 max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-headline font-bold text-slate-200 mb-2">
                        No Sample Selected
                    </h2>
                    <p className="text-sm text-slate-500 font-body">
                        Select a sample from the Sample Workspace to view AlphaGenome predictions.
                    </p>
                </motion.div>
            </div>
        )
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            {/* Page Header */}
            <motion.div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-dna-cyan/20 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-headline font-bold text-slate-100">
                            AlphaGenome Analysis
                        </h1>
                        <p className="text-sm text-slate-500 font-body">
                            Variant effect predictions · {sampleName}
                        </p>
                    </div>
                </div>

                {/* Run Batch Button */}
                <div className="flex items-center gap-3">
                    <select
                        value={outputType}
                        onChange={(e) => setOutputType(e.target.value as AlphaGenomeOutputType)}
                        className="px-3 py-2 rounded-lg text-sm font-body bg-slate-800/60 border border-slate-700/40 text-slate-300 focus:outline-none focus:border-indigo-500/40"
                        disabled={batchLoading || batchStatus?.is_running}
                    >
                        <option value="RNA_SEQ">RNA-seq</option>
                        <option value="CAGE">CAGE</option>
                        <option value="DNASE">DNase</option>
                        <option value="CHIP_HISTONE">ChIP Histone</option>
                        <option value="ATAC">ATAC-seq</option>
                    </select>
                    <button
                        onClick={handleRunBatch}
                        disabled={batchLoading || batchStatus?.is_running}
                        className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-headline font-semibold text-sm transition-all duration-300
              ${batchLoading || batchStatus?.is_running
                                ? 'bg-indigo-500/20 text-indigo-300 cursor-wait border border-indigo-500/20'
                                : 'bg-gradient-to-r from-indigo-600 to-dna-cyan text-white hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:-translate-y-0.5'
                            }
            `}
                    >
                        {batchLoading || batchStatus?.is_running ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Running...</>
                        ) : (
                            <><Play className="w-4 h-4" />Run Batch Prediction</>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Batch Progress Bar */}
            {batchStatus && (batchStatus.is_running || batchStatus.processed > 0) && (
                <motion.div
                    className="glass-panel rounded-xl p-4 border border-indigo-500/20"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-headline text-slate-400">
                            {batchStatus.is_running ? 'Processing variants...' : 'Batch complete'}
                        </span>
                        <span className="text-xs font-mono-variant text-indigo-400">
                            {batchStatus.completed}/{batchStatus.total_variants} completed
                            {batchStatus.failed > 0 && ` · ${batchStatus.failed} failed`}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-dna-cyan"
                            initial={{ width: '0%' }}
                            animate={{ width: `${batchStatus.progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </motion.div>
            )}

            {/* Error */}
            {error && (
                <motion.div
                    className="rounded-xl p-4 border border-dna-magenta/30 bg-dna-magenta/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-dna-magenta" />
                        <p className="text-sm text-dna-magenta font-body">{error}</p>
                    </div>
                </motion.div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
            )}

            {/* Dashboard Content */}
            {!loading && stats && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard
                            label="Predictions"
                            value={stats.completed}
                            subtitle={`of ${stats.total} total`}
                            icon={<CheckCircle className="w-5 h-5" />}
                            color="cyan"
                            delay={0}
                        />
                        <SummaryCard
                            label="Mean Effect Score"
                            value={stats.mean_score.toFixed(3)}
                            subtitle="log₂ fold-change"
                            icon={<TrendingUp className="w-5 h-5" />}
                            color="indigo"
                            delay={0.05}
                        />
                        <SummaryCard
                            label="High Impact"
                            value={stats.high_impact_count}
                            subtitle="score ≥ 0.5"
                            icon={<Zap className="w-5 h-5" />}
                            color="amber"
                            delay={0.1}
                        />
                        <SummaryCard
                            label="Max Score"
                            value={stats.max_score.toFixed(3)}
                            subtitle="highest effect"
                            icon={<Target className="w-5 h-5" />}
                            color="magenta"
                            delay={0.15}
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score Distribution */}
                        <motion.div
                            className="glass-panel rounded-xl p-6 border border-dna-cyan/10"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-indigo-400" />
                                Score Distribution
                            </h3>
                            <ScoreDistributionChart bins={stats.score_distribution} />
                        </motion.div>

                        {/* Status Breakdown */}
                        <motion.div
                            className="glass-panel rounded-xl p-6 border border-dna-cyan/10"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-dna-cyan" />
                                Prediction Overview
                            </h3>
                            <div className="space-y-3">
                                <StatusRow label="Completed" count={stats.completed} total={stats.total} color="bg-dna-green" />
                                <StatusRow label="Failed" count={stats.failed} total={stats.total} color="bg-dna-magenta" />
                                <StatusRow label="Running" count={stats.running} total={stats.total} color="bg-indigo-400" />
                                <StatusRow label="Pending" count={stats.pending} total={stats.total} color="bg-slate-500" />
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-700/30 flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-body">Total predictions</span>
                                <span className="text-lg font-headline font-bold text-slate-100">{stats.total}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Top Impact Variants */}
                    <motion.div
                        className="glass-panel rounded-xl p-6 border border-dna-cyan/10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-dna-amber" />
                            Top Impact Variants
                        </h3>
                        {stats.top_variants.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-500 font-body border-b border-slate-700/30">
                                            <th className="text-left py-2 px-3">Gene</th>
                                            <th className="text-left py-2 px-3">Position</th>
                                            <th className="text-left py-2 px-3">REF/ALT</th>
                                            <th className="text-right py-2 px-3">Effect Score</th>
                                            <th className="text-right py-2 px-3">Impact</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.top_variants.map((v) => (
                                            <tr
                                                key={v.variant_id}
                                                className="border-b border-slate-800/30 hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="py-2.5 px-3">
                                                    <span className="font-headline font-semibold text-indigo-400">
                                                        {v.gene_symbol || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-mono-variant text-slate-400 text-xs">
                                                    {v.chrom}:{v.pos?.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono-variant text-slate-400 text-xs">
                                                    {v.ref} → {v.alt}
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <span className="font-headline font-bold text-slate-100">
                                                        {v.variant_effect_score?.toFixed(4)}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <ImpactBadge score={v.variant_effect_score} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 font-body text-center py-8">
                                No predictions yet. Click "Run Batch Prediction" to get started.
                            </p>
                        )}
                    </motion.div>

                    {/* All Predictions (expandable) */}
                    {predictions.length > 0 && (
                        <motion.div
                            className="glass-panel rounded-xl p-6 border border-dna-cyan/10"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                        >
                            <h3 className="text-sm font-headline font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                <Dna className="w-5 h-5 text-dna-cyan" />
                                All Predictions ({predictions.length})
                            </h3>
                            <div className="space-y-1 max-h-[500px] overflow-y-auto">
                                {predictions.map((pred) => (
                                    <PredictionRow
                                        key={pred.id}
                                        prediction={pred}
                                        isExpanded={expandedRow === pred.id}
                                        onToggle={() => setExpandedRow(expandedRow === pred.id ? null : pred.id)}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </>
            )}

            {/* Empty state */}
            {!loading && !error && stats && stats.total === 0 && (
                <motion.div
                    className="glass-panel rounded-xl p-12 border border-slate-700/30 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-lg font-headline font-bold text-slate-300 mb-2">
                        No Predictions Yet
                    </h2>
                    <p className="text-sm text-slate-500 font-body max-w-md mx-auto mb-6">
                        Run AlphaGenome predictions for all variants in this sample to see
                        variant effect scores, impact analysis, and track visualizations.
                    </p>
                    <button
                        onClick={handleRunBatch}
                        disabled={batchLoading}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-headline font-semibold text-sm
              bg-gradient-to-r from-indigo-600 to-dna-cyan text-white
              hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:-translate-y-0.5
              transition-all duration-300"
                    >
                        <Sparkles className="w-4 h-4" />
                        Run AlphaGenome for All Variants
                    </button>
                </motion.div>
            )}
        </div>
    )
}


// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
    label, value, subtitle, icon, color, delay,
}: {
    label: string; value: string | number; subtitle: string
    icon: React.ReactNode; color: 'cyan' | 'indigo' | 'amber' | 'magenta'; delay: number
}) {
    const colors = {
        cyan: 'from-dna-cyan/10 to-dna-cyan/5 border-dna-cyan/20 text-dna-cyan',
        indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-400',
        amber: 'from-dna-amber/10 to-dna-amber/5 border-dna-amber/20 text-dna-amber',
        magenta: 'from-dna-magenta/10 to-dna-magenta/5 border-dna-magenta/20 text-dna-magenta',
    }
    return (
        <motion.div
            className={`rounded-xl p-5 border bg-gradient-to-br ${colors[color]}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs font-body">{label}</span></div>
            <p className="text-2xl font-headline font-bold text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 font-body mt-0.5">{subtitle}</p>
        </motion.div>
    )
}

function ScoreDistributionChart({ bins }: { bins: { label: string; count: number }[] }) {
    const maxCount = Math.max(...bins.map(b => b.count), 1)
    const colors = ['#00d4ff', '#818cf8', '#fbbf24', '#f97316', '#ef4444']

    return (
        <div className="flex items-end gap-3 h-40">
            {bins.map((bin, i) => (
                <div key={bin.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-headline font-bold text-slate-300">{bin.count}</span>
                    <motion.div
                        className="w-full rounded-t-md"
                        style={{ backgroundColor: colors[i] || colors[0], opacity: 0.8 }}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, (bin.count / maxCount) * 120)}px` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                    />
                    <span className="text-[10px] text-slate-500 font-body text-center leading-tight">{bin.label}</span>
                </div>
            ))}
        </div>
    )
}

function StatusRow({ label, count, total, color }: {
    label: string; count: number; total: number; color: string
}) {
    const pct = total > 0 ? (count / total) * 100 : 0
    return (
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-xs font-body text-slate-400 flex-1">{label}</span>
            <span className="text-xs font-mono-variant text-slate-300">{count}</span>
            <div className="w-24 h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}

function ImpactBadge({ score }: { score: number | null }) {
    if (score === null) return <span className="text-xs text-slate-600">—</span>
    let label: string, classes: string
    if (score >= 1.0) { label = 'High'; classes = 'bg-dna-magenta/15 text-dna-magenta border-dna-magenta/30' }
    else if (score >= 0.5) { label = 'Moderate'; classes = 'bg-dna-amber/15 text-dna-amber border-dna-amber/30' }
    else if (score >= 0.2) { label = 'Low'; classes = 'bg-blue-400/15 text-blue-400 border-blue-400/30' }
    else { label = 'Minimal'; classes = 'bg-slate-700/15 text-slate-400 border-slate-600/30' }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-headline font-semibold border ${classes}`}>
            {label}
        </span>
    )
}

function PredictionRow({
    prediction: p, isExpanded, onToggle,
}: {
    prediction: AlphaGenomePredictionRow; isExpanded: boolean; onToggle: () => void
}) {
    const statusIcon = {
        completed: <CheckCircle className="w-3.5 h-3.5 text-dna-green" />,
        failed: <XCircle className="w-3.5 h-3.5 text-dna-magenta" />,
        running: <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />,
        pending: <Clock className="w-3.5 h-3.5 text-slate-500" />,
        skipped: <Clock className="w-3.5 h-3.5 text-slate-600" />,
    }

    return (
        <div className="border border-slate-700/20 rounded-lg overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
            >
                {statusIcon[p.status]}
                <span className="text-xs font-headline font-semibold text-indigo-400 w-20">{p.gene_symbol || '—'}</span>
                <span className="text-xs font-mono-variant text-slate-500 flex-1">{p.chrom}:{p.pos?.toLocaleString()}</span>
                <span className="text-xs font-mono-variant text-slate-400 w-20">{p.ref} → {p.alt}</span>
                {p.variant_effect_score != null && (
                    <span className="text-xs font-headline font-bold text-slate-200 w-16 text-right">
                        {p.variant_effect_score.toFixed(4)}
                    </span>
                )}
                <ImpactBadge score={p.variant_effect_score} />
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            <AnimatePresence>
                {isExpanded && p.ref_tracks && p.alt_tracks && (
                    <motion.div
                        className="px-4 pb-4 border-t border-slate-700/20"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="pt-3">
                            <p className="text-xs text-slate-500 font-body mb-2">
                                REF (grey) vs ALT (indigo) — Prediction tracks for {p.output_type}
                            </p>
                            <MiniTrack refTracks={p.ref_tracks} altTracks={p.alt_tracks} />
                            {p.error_message && (
                                <p className="text-xs text-dna-magenta mt-2 font-body">{p.error_message}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function MiniTrack({ refTracks, altTracks }: { refTracks: number[]; altTracks: number[] }) {
    const w = 600, h = 100
    const pad = { t: 5, r: 5, b: 5, l: 5 }
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b
    const all = [...refTracks, ...altTracks]
    const mx = Math.max(...all, 1e-8)
    const n = Math.max(refTracks.length, altTracks.length)
    const toX = (i: number) => pad.l + (i / (n - 1)) * pw
    const toY = (v: number) => pad.t + ph - (v / mx) * ph

    const path = (data: number[]) => {
        if (!data.length) return ''
        let d = `M ${toX(0)} ${toY(data[0])}`
        const step = data.length > 200 ? 2 : 1
        for (let i = step; i < data.length; i += step) d += ` L ${toX(i)} ${toY(data[i])}`
        return d
    }
    const area = (data: number[]) => {
        const p = path(data)
        return p ? `${p} L ${toX(data.length - 1)} ${toY(0)} L ${toX(0)} ${toY(0)} Z` : ''
    }

    return (
        <div className="w-full overflow-hidden rounded-lg bg-slate-900/50 border border-slate-700/30">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="mRefG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(148,163,184)" stopOpacity="0.25" /><stop offset="100%" stopColor="rgb(148,163,184)" stopOpacity="0.02" /></linearGradient>
                    <linearGradient id="mAltG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(129,140,248)" stopOpacity="0.3" /><stop offset="100%" stopColor="rgb(129,140,248)" stopOpacity="0.02" /></linearGradient>
                </defs>
                <path d={area(refTracks)} fill="url(#mRefG)" />
                <path d={path(refTracks)} fill="none" stroke="rgb(148,163,184)" strokeWidth="1" opacity="0.6" />
                <path d={area(altTracks)} fill="url(#mAltG)" />
                <path d={path(altTracks)} fill="none" stroke="rgb(129,140,248)" strokeWidth="1.2" />
                <line x1={w / 2} y1={pad.t} x2={w / 2} y2={h - pad.b} stroke="rgb(239,68,68)" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
            </svg>
        </div>
    )
}
