import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlowBadgeProps {
  children: ReactNode
  variant:
    | 'pathogenic'
    | 'likely-pathogenic'
    | 'vus'
    | 'likely-benign'
    | 'benign'
    | 'score'
  severity?: number // For score badges: 0-10
  pulse?: boolean
  className?: string
}

/**
 * Glow Badge Component
 * For risk scores and variant classifications with colored glows
 */
export default function GlowBadge({
  children,
  variant,
  severity,
  pulse = false,
  className = '',
}: GlowBadgeProps) {
  const variantStyles = {
    pathogenic: {
      bg: 'bg-gradient-to-r from-dna-magenta/20 to-red-600/20',
      text: 'text-dna-magenta',
      border: 'border-dna-magenta/50',
      shadow: 'shadow-glow-magenta',
    },
    'likely-pathogenic': {
      bg: 'bg-gradient-to-r from-orange-500/20 to-red-500/20',
      text: 'text-orange-400',
      border: 'border-orange-400/50',
      shadow: 'shadow-[0_0_15px_rgba(255,107,53,0.3)]',
    },
    vus: {
      bg: 'bg-gradient-to-r from-dna-amber/20 to-yellow-500/20',
      text: 'text-dna-amber',
      border: 'border-dna-amber/50',
      shadow: 'shadow-[0_0_15px_rgba(255,170,0,0.3)]',
    },
    'likely-benign': {
      bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
      text: 'text-blue-400',
      border: 'border-blue-400/50',
      shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    },
    benign: {
      bg: 'bg-gradient-to-r from-dna-green/20 to-green-500/20',
      text: 'text-dna-green',
      border: 'border-dna-green/50',
      shadow: 'shadow-glow-green',
    },
    score: getScoreStyles(severity || 0),
  }

  const styles = variantStyles[variant]

  return (
    <motion.span
      className={`
        inline-flex items-center justify-center
        px-3 py-1 rounded-full
        text-xs font-semibold font-mono-variant
        border backdrop-blur-sm
        ${styles.bg}
        ${styles.text}
        ${styles.border}
        ${styles.shadow}
        ${pulse ? 'animate-glow-pulse' : ''}
        ${className}
      `}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      whileHover={{ scale: 1.05 }}
    >
      {children}
    </motion.span>
  )
}

/**
 * Get styles based on score severity (0-10)
 */
function getScoreStyles(score: number) {
  if (score >= 9) {
    return {
      bg: 'bg-gradient-to-r from-red-900/30 to-dna-magenta/30',
      text: 'text-red-400',
      border: 'border-red-500/50',
      shadow: 'shadow-glow-magenta',
    }
  }
  if (score >= 6) {
    return {
      bg: 'bg-gradient-to-r from-orange-900/30 to-red-600/30',
      text: 'text-orange-400',
      border: 'border-orange-500/50',
      shadow: 'shadow-[0_0_15px_rgba(255,107,53,0.3)]',
    }
  }
  if (score >= 3) {
    return {
      bg: 'bg-gradient-to-r from-yellow-900/30 to-dna-amber/30',
      text: 'text-yellow-400',
      border: 'border-yellow-500/50',
      shadow: 'shadow-[0_0_15px_rgba(255,170,0,0.2)]',
    }
  }
  return {
    bg: 'bg-gradient-to-r from-blue-900/30 to-dna-cyan/30',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
    shadow: 'shadow-glow-cyan-sm',
  }
}
