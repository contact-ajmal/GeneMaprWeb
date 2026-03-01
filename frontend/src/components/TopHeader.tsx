import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search,
  Bell,
  ChevronRight,
  Sliders,
} from 'lucide-react'
import ActiveSampleSelector from './ActiveSampleSelector'

interface TopHeaderProps {
  sidebarWidth: number
  onOpenCommandPalette: () => void
  activeProfile?: string | null
}

const routeLabels: Record<string, { label: string; parent?: string }> = {
  '/': { label: 'Upload' },
  '/dashboard': { label: 'Dashboard' },
  '/samples': { label: 'Sample Workspace' },
  '/genome-view': { label: 'Genome View' },
  '/analytics': { label: 'Genome Analytics' },
  '/pharmacogenomics': { label: 'Pharmacogenomics' },
  '/compare': { label: 'Sample Comparison' },
  '/reports': { label: 'Reports' },
}

export default function TopHeader({ sidebarWidth, onOpenCommandPalette, activeProfile }: TopHeaderProps) {
  const location = useLocation()
  const currentRoute = routeLabels[location.pathname] || { label: 'GeneMapr' }
  const isMac = navigator.platform.includes('Mac')

  return (
    <motion.header
      className="fixed top-0 right-0 z-20 h-14
        glass-panel-elevated border-b border-dna-cyan/10"
      animate={{ left: sidebarWidth }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      role="banner"
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <span className="text-slate-500 font-body">GeneMapr</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-200 font-body font-medium">
            {currentRoute.label}
          </span>
        </nav>

        {/* Center: Search Bar */}
        <motion.button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-lg
            bg-white/5 border border-slate-700/50
            hover:border-dna-cyan/30 hover:bg-white/8
            transition-all cursor-pointer group
            min-w-[280px] max-w-[400px]"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          aria-label="Open search (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-slate-500 group-hover:text-dna-cyan transition-colors" />
          <span className="flex-1 text-left text-sm text-slate-500 font-body">
            Search variants, genes, rsIDs...
          </span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded
            bg-white/5 border border-slate-700/50
            text-[10px] font-mono text-slate-500">
            {isMac ? '⌘' : 'Ctrl'}+K
          </kbd>
        </motion.button>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Active Sample Selector */}
          <ActiveSampleSelector />

          {/* Active Scoring Profile */}
          {activeProfile && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg
              bg-dna-cyan/5 border border-dna-cyan/15">
              <Sliders className="w-3.5 h-3.5 text-dna-cyan" />
              <span className="text-xs font-body text-dna-cyan font-medium">
                {activeProfile}
              </span>
            </div>
          )}

          {/* Search button for mobile */}
          <motion.button
            onClick={onOpenCommandPalette}
            className="md:hidden p-2 rounded-lg glass-panel hover:glass-panel-interactive transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5 text-slate-400" />
          </motion.button>

          {/* Notifications */}
          <motion.button
            className="relative p-2 rounded-lg glass-panel hover:glass-panel-interactive transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5 text-slate-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-dna-magenta rounded-full" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  )
}
