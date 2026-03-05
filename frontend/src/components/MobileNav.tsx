import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Database,
  Dna,
  Pill,
  GitCompareArrows,
  Upload,
  Sparkles,
} from 'lucide-react'

const mobileNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/samples', label: 'Samples', icon: Database },
  { path: '/genome-view', label: 'Genome', icon: Dna },
  { path: '/pharmacogenomics', label: 'PGx', icon: Pill },
  { path: '/compare', label: 'Compare', icon: GitCompareArrows },
  { path: '/alphagenome', label: 'AlphaG', icon: Sparkles },
  { path: '/', label: 'Upload', icon: Upload },
]

export default function MobileNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden
        glass-panel-elevated border-t border-dna-cyan/10
        safe-area-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {mobileNavItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <Link key={item.path} to={item.path} className="flex-1">
              <motion.div
                className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors
                  ${isActive
                    ? 'text-dna-cyan'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                whileTap={{ scale: 0.9 }}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-dna-cyan"
                      layoutId="mobileNavDot"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-body font-medium">{item.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
