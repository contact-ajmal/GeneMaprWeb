import { motion } from 'framer-motion'

interface SkeletonProps {
  variant?: 'text' | 'card' | 'chart' | 'table-row' | 'badge'
  className?: string
  lines?: number
}

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded-lg ${className || ''}`} />
  )
}

export function Skeleton({ variant = 'text', className, lines = 1 }: SkeletonProps) {
  switch (variant) {
    case 'text':
      return (
        <div className={`space-y-2 ${className || ''}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <ShimmerBlock
              key={i}
              className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
            />
          ))}
        </div>
      )

    case 'badge':
      return <ShimmerBlock className={`h-6 w-16 rounded-full ${className || ''}`} />

    case 'card':
      return (
        <div className={`glass-panel rounded-xl p-6 space-y-4 ${className || ''}`}>
          <ShimmerBlock className="h-4 w-1/3" />
          <ShimmerBlock className="h-8 w-1/2" />
          <ShimmerBlock className="h-3 w-2/3" />
        </div>
      )

    case 'chart':
      return (
        <div className={`glass-panel rounded-xl p-6 ${className || ''}`}>
          <ShimmerBlock className="h-5 w-1/3 mb-6" />
          <div className="flex items-end gap-2 h-48">
            {[40, 65, 30, 80, 55, 70, 45, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 skeleton-shimmer rounded-t-md"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      )

    case 'table-row':
      return (
        <div className={`grid grid-cols-12 gap-4 px-6 py-4 ${className || ''}`}>
          <ShimmerBlock className="col-span-1 h-5" />
          <ShimmerBlock className="col-span-2 h-5" />
          <ShimmerBlock className="col-span-1 h-5" />
          <ShimmerBlock className="col-span-1 h-5" />
          <ShimmerBlock className="col-span-1 h-5" />
          <ShimmerBlock className="col-span-2 h-5" />
          <ShimmerBlock className="col-span-2 h-5" />
          <ShimmerBlock className="col-span-1 h-5" />
          <ShimmerBlock className="col-span-1 h-5" />
        </div>
      )

    default:
      return <ShimmerBlock className={className} />
  }
}

export function SkeletonKPICards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <div className="glass-panel rounded-xl p-6 border-l-4 border-l-slate-700 space-y-3">
            <ShimmerBlock className="h-3 w-2/3" />
            <ShimmerBlock className="h-8 w-1/2" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function SkeletonCharts() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
        >
          <div className="glass-panel rounded-xl p-6">
            <ShimmerBlock className="h-5 w-1/3 mb-6" />
            <div className="flex items-end gap-2 h-56">
              {[40, 65, 30, 80, 55, 70, 45, 60].map((h, j) => (
                <div
                  key={j}
                  className="flex-1 skeleton-shimmer rounded-t-md"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="glass-panel-elevated rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-700/50 bg-bg-tertiary/30">
        {[1, 2, 1, 1, 1, 2, 2, 1, 1].map((span, i) => (
          <ShimmerBlock key={i} className={`col-span-${span} h-4`} />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-700/30">
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <Skeleton variant="table-row" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
