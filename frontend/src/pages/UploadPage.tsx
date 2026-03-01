import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadVCFWithSample, getSamples, deleteSample } from '../api/samples'
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Database,
  TrendingUp,
  Zap,
  ArrowRight,
  Loader2,
  Users,
  Trash2,
  GitCompareArrows,
  Dna,
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import GlassCard from '../components/ui/GlassCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import DecodeText from '../components/ui/DecodeText'
import GlowBadge from '../components/ui/GlowBadge'

const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'proband', label: 'Proband' },
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'unrelated', label: 'Unrelated' },
]

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [sampleName, setSampleName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [uploadMode, setUploadMode] = useState<'quick' | 'sample'>('quick')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch existing samples
  const { data: samplesData } = useQuery({
    queryKey: ['samples'],
    queryFn: () => getSamples(),
  })
  const samples = samplesData?.samples

  // Quick upload — still creates a sample with auto-generated name
  const quickUploadMutation = useMutation({
    mutationFn: (f: File) => {
      const autoName = f.name.replace(/\.vcf(\.gz)?$/i, '')
      return uploadVCFWithSample(f, autoName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] })
      queryClient.invalidateQueries({ queryKey: ['samples-selector'] })
      setTimeout(() => navigate('/dashboard'), 2000)
    },
  })

  // Sample upload with metadata
  const sampleUploadMutation = useMutation({
    mutationFn: ({ file, name, rel }: { file: File; name: string; rel?: string }) =>
      uploadVCFWithSample(file, name, rel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] })
      queryClient.invalidateQueries({ queryKey: ['samples-selector'] })
      setFile(null)
      setSampleName('')
      setRelationship('')
    },
  })

  // Delete sample
  const deleteMutation = useMutation({
    mutationFn: deleteSample,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] })
    },
  })

  const activeMutation = uploadMode === 'quick' ? quickUploadMutation : sampleUploadMutation

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      const validExtensions = ['.vcf', '.vcf.gz']
      const fileName = selectedFile.name.toLowerCase()
      const isValid = validExtensions.some((ext) => fileName.endsWith(ext))
      if (isValid) {
        setFile(selectedFile)
        quickUploadMutation.reset()
        sampleUploadMutation.reset()
        // Auto-fill sample name from filename
        if (!sampleName) {
          const baseName = selectedFile.name.replace(/\.vcf(\.gz)?$/i, '')
          setSampleName(baseName)
        }
      }
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleUpload = () => {
    if (!file) return
    if (uploadMode === 'quick') {
      quickUploadMutation.mutate(file)
    } else {
      const name = sampleName.trim() || file.name.replace(/\.vcf(\.gz)?$/i, '')
      sampleUploadMutation.mutate({ file, name, rel: relationship || undefined })
    }
  }

  const isPending = quickUploadMutation.isPending || sampleUploadMutation.isPending
  const uploadProgress = isPending ? 65 : 0
  const stages = [
    { name: 'Parsing', active: uploadProgress > 0 },
    { name: 'Normalizing', active: uploadProgress > 25 },
    { name: 'Annotating', active: uploadProgress > 50 },
    { name: 'Scoring', active: uploadProgress > 75 },
  ]

  return (
    <PageTransition>
      <style>{`
        .upload-page .perspective-container {
          opacity: 0.25 !important;
        }
      `}</style>

      <div className="upload-page max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <motion.h1
            className="text-2xl font-headline font-bold text-slate-100 mb-3"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <DecodeText text="Decode Your Genome" speed={25} />
          </motion.h1>
          <motion.p
            className="text-sm text-slate-400 font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Upload VCF files for variant analysis or multi-sample comparison
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Card (2/3 width) */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <GlassCard variant="elevated" className="p-8">
              {/* Upload Mode Toggle */}
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setUploadMode('quick')}
                  className={`text-sm px-4 py-2 rounded-lg font-body font-medium transition-all ${
                    uploadMode === 'quick'
                      ? 'glass-panel-interactive text-dna-cyan shadow-glow-cyan-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Quick Upload
                </button>
                <button
                  onClick={() => setUploadMode('sample')}
                  className={`text-sm px-4 py-2 rounded-lg font-body font-medium transition-all flex items-center gap-2 ${
                    uploadMode === 'sample'
                      ? 'glass-panel-interactive text-dna-cyan shadow-glow-cyan-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Sample Upload
                </button>
              </div>

              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative rounded-xl p-12 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-2 border-solid border-dna-cyan bg-dna-cyan/10 shadow-glow-cyan-lg'
                    : file && !isPending
                      ? 'border-2 border-solid border-dna-green bg-dna-green/10 shadow-glow-green-lg'
                      : 'border-2 border-dashed border-dna-cyan/30 bg-bg-tertiary/30 hover:border-dna-cyan/50 hover:bg-bg-tertiary/50'
                }`}
                style={{
                  backgroundImage: dragActive
                    ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 212, 255, 0.05) 10px, rgba(0, 212, 255, 0.05) 20px)'
                    : 'none',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,.vcf.gz"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />

                <div className="space-y-6">
                  <motion.div
                    className="w-24 h-24 mx-auto"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-dna-cyan/20 to-dna-magenta/20 rounded-full flex items-center justify-center shadow-glow-cyan">
                      {file && !isPending ? (
                        <CheckCircle2 className="w-12 h-12 text-dna-green" />
                      ) : (
                        <Upload className="w-12 h-12 text-dna-cyan" />
                      )}
                    </div>
                  </motion.div>

                  <div>
                    <p className="text-sm font-body font-medium text-slate-200 mb-2">
                      {file ? (
                        'File ready to upload'
                      ) : (
                        <>
                          Drop your VCF file here
                          <br />
                          <span className="text-slate-400">or </span>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-dna-cyan hover:text-dna-cyan/80 font-semibold underline"
                          >
                            click to browse
                          </button>
                        </>
                      )}
                    </p>

                    <div className="flex items-center justify-center gap-2 mt-4">
                      <GlowBadge variant="score" severity={3}>
                        .vcf
                      </GlowBadge>
                      <GlowBadge variant="score" severity={3}>
                        .vcf.gz
                      </GlowBadge>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Display */}
              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 glass-panel-interactive rounded-lg flex items-center justify-between border border-dna-cyan/20"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-dna-cyan/30 to-blue-600/30 rounded-lg flex items-center justify-center shadow-glow-cyan-sm">
                      <FileText className="w-6 h-6 text-dna-cyan" />
                    </div>
                    <div>
                      <p className="font-body font-medium text-slate-100">{file.name}</p>
                      <p className="text-sm text-slate-400 font-mono-variant">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    disabled={isPending}
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </motion.div>
              )}

              {/* Sample Fields (sample mode only) */}
              <AnimatePresence>
                {uploadMode === 'sample' && file && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <div>
                      <label className="text-xs text-slate-400 font-body block mb-1">
                        Sample Name
                      </label>
                      <input
                        type="text"
                        value={sampleName}
                        onChange={(e) => setSampleName(e.target.value)}
                        placeholder="e.g., Proband, NA12878"
                        className="w-full px-4 py-2.5 rounded-lg bg-transparent border border-slate-700/50 text-slate-200 font-body text-sm focus:outline-none focus:border-dna-cyan/50 focus:shadow-glow-cyan-sm transition-all placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-body block mb-1">
                        Relationship
                      </label>
                      <select
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-slate-700/50 text-slate-200 font-body text-sm focus:outline-none focus:border-dna-cyan/50 focus:shadow-glow-cyan-sm transition-all"
                      >
                        {RELATIONSHIP_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress */}
              {isPending && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 space-y-4"
                >
                  <div className="relative h-3 bg-bg-tertiary rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-dna-cyan to-dna-green rounded-full shadow-glow-cyan"
                      initial={{ width: '0%' }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-4 h-4 text-dna-cyan" />
                      </motion.div>
                      <span className="text-sm font-mono-variant text-slate-400">Processing...</span>
                    </div>
                    <span className="text-sm font-headline font-bold text-dna-cyan">{uploadProgress}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {stages.map((stage, index) => (
                      <div key={stage.name} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              stage.active
                                ? 'bg-dna-cyan shadow-glow-cyan text-slate-900'
                                : 'bg-bg-tertiary text-slate-600'
                            }`}
                          >
                            {stage.active && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring' }}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </motion.div>
                            )}
                          </div>
                          <span
                            className={`text-xs mt-2 font-body ${stage.active ? 'text-dna-cyan' : 'text-slate-600'}`}
                          >
                            {stage.name}
                          </span>
                        </div>
                        {index < stages.length - 1 && (
                          <div className="w-12 h-0.5 bg-bg-tertiary mx-2 mb-6" />
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Upload Button */}
              {!isPending && (
                <AnimatedButton
                  onClick={handleUpload}
                  disabled={!file || (uploadMode === 'sample' && !sampleName.trim())}
                  variant="primary"
                  className="w-full mt-6"
                >
                  {uploadMode === 'sample' ? 'Upload Sample' : 'Begin Analysis'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </AnimatedButton>
              )}

              {/* Success */}
              {(quickUploadMutation.isSuccess || sampleUploadMutation.isSuccess) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-6 glass-panel-interactive rounded-xl border border-dna-green/30 shadow-glow-green relative overflow-hidden"
                >
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: ['#00d4ff', '#ff3366', '#00ff88'][i % 3],
                        left: `${20 + i * 7}%`,
                        top: '50%',
                      }}
                      animate={{
                        y: [-20, -60],
                        x: [0, (i % 2 ? 1 : -1) * 30],
                        opacity: [1, 0],
                        scale: [1, 0.5],
                      }}
                      transition={{ duration: 1.5, delay: i * 0.05, ease: 'easeOut' }}
                    />
                  ))}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="w-6 h-6 text-dna-green mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-headline font-semibold text-dna-green text-sm">
                            {uploadMode === 'sample' ? 'Sample Uploaded' : 'Analysis Complete'}
                          </p>
                          <GlowBadge variant="benign">Success</GlowBadge>
                        </div>
                        <p className="text-sm font-mono-variant text-slate-300">
                          {sampleUploadMutation.data?.message ||
                            quickUploadMutation.data?.message ||
                            'Upload complete'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {(quickUploadMutation.isError || sampleUploadMutation.isError) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 glass-panel-interactive rounded-lg border border-dna-magenta/30 shadow-glow-magenta"
                >
                  <div className="flex items-start space-x-3">
                    <XCircle className="w-5 h-5 text-dna-magenta mt-0.5" />
                    <div>
                      <p className="font-body font-medium text-dna-magenta">Upload failed</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {activeMutation.error?.message || 'An unexpected error occurred'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>

          {/* Sample Manager Sidebar (1/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <GlassCard variant="elevated" className="p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline font-semibold text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-dna-cyan" />
                  Samples
                </h3>
                {samples && samples.length > 0 && (
                  <span className="text-xs text-slate-500 font-mono-variant">
                    {samples.length} uploaded
                  </span>
                )}
              </div>

              {!samples || samples.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <Dna className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-body">
                    Upload files in Sample mode to enable multi-sample comparison.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {samples.map((sample) => (
                    <motion.div
                      key={sample.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel rounded-lg p-3 border border-slate-700/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-body font-medium text-slate-200 text-sm truncate">
                            {sample.name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono-variant truncate">
                            {sample.original_filename}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {sample.relationship_type && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-dna-cyan/10 text-dna-cyan border border-dna-cyan/20">
                                {sample.relationship_type}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 font-mono-variant">
                              {sample.total_variants} var
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(sample.id)}
                          className="text-slate-600 hover:text-dna-magenta transition-colors p-1"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {/* Compare Button */}
                  {samples.length >= 2 && (
                    <AnimatedButton
                      variant="ghost"
                      className="w-full mt-4 text-sm py-2"
                      onClick={() => navigate('/compare')}
                    >
                      <GitCompareArrows className="w-4 h-4 mr-2" />
                      Compare Samples
                    </AnimatedButton>
                  )}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Info Section */}
        <motion.div
          className="mt-12 grid md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {[
            {
              icon: Database,
              title: 'Comprehensive Annotation',
              description: 'Enriched with Ensembl, ClinVar, and gnomAD data',
              color: 'cyan',
            },
            {
              icon: TrendingUp,
              title: 'Risk Scoring',
              description: 'Intelligent pathogenicity assessment',
              color: 'magenta',
            },
            {
              icon: Zap,
              title: 'AI Insights',
              description: 'Natural language summaries powered by advanced AI',
              color: 'green',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
            >
              <GlassCard variant="default" className="p-6 h-full">
                <div
                  className={`w-12 h-12 bg-gradient-to-br from-dna-${item.color}/20 to-${item.color}-600/20 rounded-lg flex items-center justify-center mb-4 shadow-glow-${item.color}-sm`}
                >
                  <item.icon className={`w-6 h-6 text-dna-${item.color}`} />
                </div>
                <h3 className="font-headline font-semibold text-slate-100 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 font-body">{item.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </PageTransition>
  )
}
