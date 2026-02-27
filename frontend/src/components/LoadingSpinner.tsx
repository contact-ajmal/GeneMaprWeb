import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizeConfig = {
  sm: { width: 32, height: 32, nucleotideR: 3 },
  md: { width: 48, height: 48, nucleotideR: 4 },
  lg: { width: 72, height: 72, nucleotideR: 5 },
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const { width, height, nucleotideR } = sizeConfig[size]
  const cx = width / 2
  const cy = height / 2

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative" style={{ width, height }}>
        {/* Outer glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* DNA Helix SVG */}
        <motion.svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          {/* Strand 1 - Cyan */}
          <motion.circle
            cx={cx}
            cy={cy - height * 0.35}
            r={nucleotideR}
            fill="#00d4ff"
            filter="url(#glowCyan)"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.circle
            cx={cx + width * 0.35}
            cy={cy}
            r={nucleotideR}
            fill="#00d4ff"
            filter="url(#glowCyan)"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.375 }}
          />
          <motion.circle
            cx={cx}
            cy={cy + height * 0.35}
            r={nucleotideR}
            fill="#00d4ff"
            filter="url(#glowCyan)"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
          />
          <motion.circle
            cx={cx - width * 0.35}
            cy={cy}
            r={nucleotideR}
            fill="#00d4ff"
            filter="url(#glowCyan)"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1.125 }}
          />

          {/* Strand 2 - Magenta (offset) */}
          <motion.circle
            cx={cx}
            cy={cy + height * 0.35}
            r={nucleotideR * 0.8}
            fill="#ff3366"
            filter="url(#glowMagenta)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.circle
            cx={cx - width * 0.35}
            cy={cy}
            r={nucleotideR * 0.8}
            fill="#ff3366"
            filter="url(#glowMagenta)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.375 }}
          />
          <motion.circle
            cx={cx}
            cy={cy - height * 0.35}
            r={nucleotideR * 0.8}
            fill="#ff3366"
            filter="url(#glowMagenta)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
          />
          <motion.circle
            cx={cx + width * 0.35}
            cy={cy}
            r={nucleotideR * 0.8}
            fill="#ff3366"
            filter="url(#glowMagenta)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1.125 }}
          />

          {/* Base pair connections */}
          <motion.line
            x1={cx} y1={cy - height * 0.35}
            x2={cx} y2={cy + height * 0.35}
            stroke="rgba(0,212,255,0.2)"
            strokeWidth={1}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.line
            x1={cx - width * 0.35} y1={cy}
            x2={cx + width * 0.35} y2={cy}
            stroke="rgba(255,51,102,0.2)"
            strokeWidth={1}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />

          {/* Orbital path */}
          <circle
            cx={cx}
            cy={cy}
            r={width * 0.35}
            fill="none"
            stroke="rgba(0,212,255,0.08)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* Glow filters */}
          <defs>
            <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowMagenta" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </motion.svg>
      </div>
      {text && (
        <motion.p
          className="text-sm text-slate-400 font-body"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
