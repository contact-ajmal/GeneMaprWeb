import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  className?: string
}

/**
 * Animated Button Component
 * Gradient backgrounds with glow effects and smooth animations
 */
export default function AnimatedButton({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  disabled,
  ...props
}: AnimatedButtonProps) {
  const variantStyles = {
    primary: `
      bg-gradient-to-r from-dna-cyan to-blue-600
      shadow-glow-cyan hover:shadow-glow-cyan-lg
      text-white font-semibold
    `,
    secondary: `
      glass-panel
      hover:glass-panel-interactive
      shadow-glow-cyan-sm hover:shadow-glow-cyan
      text-slate-200 font-medium
    `,
    danger: `
      bg-gradient-to-r from-dna-magenta to-red-600
      shadow-glow-magenta hover:shadow-glow-magenta-lg
      text-white font-semibold
    `,
    ghost: `
      bg-transparent border border-dna-cyan/30
      hover:bg-dna-cyan/10 hover:border-dna-cyan/50
      text-dna-cyan font-medium
    `,
  }

  return (
    <motion.button
      className={`
        relative px-6 py-3 rounded-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        overflow-hidden
        ${variantStyles[variant]}
        ${className}
      `}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      disabled={disabled || loading}
      {...props}
    >
      {/* Loading shimmer effect */}
      {loading && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </span>
    </motion.button>
  )
}
