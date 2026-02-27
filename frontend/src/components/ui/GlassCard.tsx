import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'interactive'
  className?: string
}

/**
 * Glassmorphism Card Component
 * Reusable glass effect card with variants
 */
export default function GlassCard({
  children,
  variant = 'default',
  className = '',
  ...props
}: GlassCardProps) {
  const variantStyles = {
    default: 'glass-panel',
    elevated: 'glass-panel-elevated shadow-glow-cyan-sm',
    interactive:
      'glass-panel-interactive shadow-glow-cyan cursor-pointer hover:shadow-glow-cyan-lg hover:border-dna-cyan/30',
  }

  return (
    <motion.div
      className={`rounded-xl ${variantStyles[variant]} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={
        variant === 'interactive'
          ? { scale: 1.01, transition: { duration: 0.2 } }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  )
}
