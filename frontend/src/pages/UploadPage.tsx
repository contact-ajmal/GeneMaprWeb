import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { uploadVCF } from '../api/variants'
import { Upload, FileText, CheckCircle2, XCircle, Database, TrendingUp, Zap, ArrowRight, Loader2 } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import GlassCard from '../components/ui/GlassCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import DecodeText from '../components/ui/DecodeText'
import GlowBadge from '../components/ui/GlowBadge'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const uploadMutation = useMutation({
    mutationFn: uploadVCF,
    onSuccess: () => {
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    },
  })

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      const validExtensions = ['.vcf', '.vcf.gz']
      const fileName = selectedFile.name.toLowerCase()
      const isValid = validExtensions.some((ext) => fileName.endsWith(ext))

      if (isValid) {
        setFile(selectedFile)
        uploadMutation.reset()
      } else {
        uploadMutation.reset()
        uploadMutation.mutate(selectedFile)
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
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  // Simulated progress (in real app, this would come from backend)
  const uploadProgress = uploadMutation.isPending ? 65 : 0
  const stages = [
    { name: 'Parsing', active: uploadProgress > 0 },
    { name: 'Normalizing', active: uploadProgress > 25 },
    { name: 'Annotating', active: uploadProgress > 50 },
    { name: 'Scoring', active: uploadProgress > 75 },
  ]

  return (
    <PageTransition>
      {/* Enhanced DNA Helix Visibility on Upload Page */}
      <style>{`
        .upload-page .perspective-container {
          opacity: 0.25 !important;
        }
      `}</style>

      <div className="upload-page max-w-4xl mx-auto">
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
            Upload a VCF file to begin variant analysis
          </motion.p>
        </div>

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <GlassCard variant="elevated" className="p-8 max-w-2xl mx-auto">
            {/* Animated Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-2 border-solid border-dna-cyan bg-dna-cyan/10 shadow-glow-cyan-lg'
                  : file && !uploadMutation.isPending
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
                {/* Animated DNA Icon */}
                <motion.div
                  className="w-24 h-24 mx-auto"
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-dna-cyan/20 to-dna-magenta/20 rounded-full flex items-center justify-center shadow-glow-cyan">
                    {file && !uploadMutation.isPending ? (
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

                  {/* Supported Formats Pill */}
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

            {/* Selected File Display */}
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
                  disabled={uploadMutation.isPending}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* Upload Progress */}
            {uploadMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 space-y-4"
              >
                {/* Progress Bar */}
                <div className="relative h-3 bg-bg-tertiary rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-dna-cyan to-dna-green rounded-full shadow-glow-cyan"
                    initial={{ width: '0%' }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Percentage Counter */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="w-4 h-4 text-dna-cyan" />
                    </motion.div>
                    <span className="text-sm font-mono-variant text-slate-400">
                      Processing...
                    </span>
                  </div>
                  <span className="text-sm font-headline font-bold text-dna-cyan">
                    {uploadProgress}%
                  </span>
                </div>

                {/* Stage Indicators */}
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
                          className={`text-xs mt-2 font-body ${
                            stage.active ? 'text-dna-cyan' : 'text-slate-600'
                          }`}
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
            {!uploadMutation.isPending && (
              <AnimatedButton
                onClick={handleUpload}
                disabled={!file}
                variant="primary"
                className="w-full mt-6"
              >
                Begin Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </AnimatedButton>
            )}

            {/* Success State */}
            {uploadMutation.isSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-6 glass-panel-interactive rounded-xl border border-dna-green/30 shadow-glow-green relative overflow-hidden"
              >
                {/* Confetti particles */}
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
                    transition={{
                      duration: 1.5,
                      delay: i * 0.05,
                      ease: 'easeOut',
                    }}
                  />
                ))}

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-dna-green mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-headline font-semibold text-dna-green text-sm">
                          Analysis Complete
                        </p>
                        <GlowBadge variant="benign">Success</GlowBadge>
                      </div>
                      <div className="flex gap-4 text-sm font-mono-variant text-slate-300">
                        <span>
                          {uploadMutation.data?.variants_parsed} variants detected
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {uploadMutation.isError && (
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
                      {uploadMutation.error?.message || 'An unexpected error occurred'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </GlassCard>
        </motion.div>

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
                <h3 className="font-headline font-semibold text-slate-100 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 font-body">{item.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </PageTransition>
  )
}
