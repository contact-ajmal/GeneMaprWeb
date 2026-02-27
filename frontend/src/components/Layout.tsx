import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { motion } from 'framer-motion'
import DNAHelix from './backgrounds/DNAHelix'
import ParticleField from './backgrounds/ParticleField'
import TopLoadingBar from './ui/TopLoadingBar'
import DecodeText from './ui/DecodeText'
import { Upload, BarChart3, Activity, Pill, Moon, Sun } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { path: '/', label: 'Upload', icon: Upload },
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/analytics', label: 'Analytics', icon: Activity },
    { path: '/pharmacogenomics', label: 'PGx', icon: Pill },
  ]

  return (
    <div className="min-h-screen">
      {/* Top Loading Bar */}
      <TopLoadingBar />

      {/* DNA Helix Background */}
      <DNAHelix />

      {/* Particle Field Background */}
      <ParticleField />

      {/* Glass Navigation Bar */}
      <nav className="glass-panel-elevated sticky top-0 z-40 border-b border-dna-cyan/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <motion.div
                className="w-10 h-10 bg-gradient-to-br from-dna-cyan to-blue-600 rounded-xl flex items-center justify-center shadow-glow-cyan"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-lg font-headline font-bold text-slate-100 group-hover:text-dna-cyan transition-colors">
                  <DecodeText text="GeneMapr" trigger="hover" speed={20} />
                </h1>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon

                return (
                  <Link key={item.path} to={item.path}>
                    <motion.div
                      className={`
                        relative px-4 py-2 rounded-lg font-body font-medium text-sm
                        flex items-center space-x-2
                        transition-all duration-200
                        ${
                          isActive
                            ? 'glass-panel-interactive text-dna-cyan shadow-glow-cyan'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-dna-cyan to-dna-magenta rounded-r"
                          layoutId="activeNav"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}

                      {/* Hover underline for inactive items */}
                      {!isActive && (
                        <motion.div
                          className="absolute bottom-0 left-2 right-2 h-0.5 bg-dna-cyan/50 rounded-full origin-left"
                          initial={{ scaleX: 0 }}
                          whileHover={{ scaleX: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}

                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>

                      {/* Glow effect on active */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 bg-dna-cyan/5 rounded-lg -z-10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                )
              })}
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Tagline */}
              <p className="text-sm text-slate-500 hidden lg:block font-body">
                Premium Genomic Analysis Platform
              </p>

              {/* Theme Toggle */}
              <motion.button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg glass-panel hover:glass-panel-interactive transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-slate-400" />
                ) : (
                  <Sun className="w-5 h-5 text-dna-cyan" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-auto py-6 glass-panel border-t border-dna-cyan/5">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p className="font-body">
              © 2026 GeneMapr. Premium Variant Interpretation.
            </p>
            <div className="flex items-center space-x-4">
              <span className="px-2 py-1 rounded bg-dna-cyan/10 text-dna-cyan text-xs font-mono-variant">
                v2.0
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono-variant text-xs">
                Powered by Claude Sonnet 4.5
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
