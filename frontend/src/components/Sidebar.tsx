import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import DecodeText from './ui/DecodeText'
import {
  LayoutDashboard,
  Database,
  Dna,
  Activity,
  Pill,
  GitCompareArrows,
  FileText,
  Upload,
  Moon,
  Sun,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/samples', label: 'Sample Workspace', icon: Database },
  { path: '/genome-view', label: 'Genome View', icon: Dna },
  { path: '/analytics', label: 'Genome Analytics', icon: Activity },
  { path: '/pharmacogenomics', label: 'Pharmacogenomics', icon: Pill },
  { path: '/compare', label: 'Sample Comparison', icon: GitCompareArrows },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/alphagenome', label: 'AlphaGenome', icon: Sparkles },
  { path: '/', label: 'Upload', icon: Upload },
]

const SIDEBAR_EXPANDED_WIDTH = 240
const SIDEBAR_COLLAPSED_WIDTH = 68

export { SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH }

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Persist sidebar state
  useEffect(() => {
    const stored = localStorage.getItem('genemaprsidebar_collapsed')
    if (stored !== null) setIsCollapsed(stored === 'true')
  }, [])

  const toggleCollapse = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('genemaprsidebar_collapsed', String(next))
  }

  const expanded = !isCollapsed || isHovered

  return (
    <motion.aside
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col
        glass-panel-elevated border-r border-dna-cyan/10
        hidden lg:flex"
      animate={{ width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={() => isCollapsed && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b border-dna-cyan/10 flex-shrink-0">
        <Link to="/" className="flex items-center gap-3 group min-w-0">
          <motion.div
            className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-dna-cyan to-blue-600 rounded-xl
              flex items-center justify-center shadow-glow-cyan"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Dna className="w-5 h-5 text-white" />
          </motion.div>
          <AnimatePresence>
            {expanded && (
              <motion.div
                className="overflow-hidden whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-lg font-headline font-bold text-slate-100 group-hover:text-dna-cyan transition-colors">
                  <DecodeText text="GeneMapr" trigger="hover" speed={20} />
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Primary">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                  font-body font-medium text-sm
                  transition-colors duration-200
                  ${isActive
                    ? 'bg-dna-cyan/10 text-dna-cyan shadow-glow-cyan-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }
                `}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active left border */}
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-1 bottom-1 w-[3px] bg-gradient-to-b from-dna-cyan to-dna-magenta rounded-r"
                    layoutId="sidebarActive"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                <Icon className="w-5 h-5 flex-shrink-0" />

                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      className="overflow-hidden whitespace-nowrap"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip when collapsed */}
                {!expanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 rounded-md
                    bg-bg-elevated text-xs text-slate-200 font-body
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    whitespace-nowrap shadow-lg border border-dna-cyan/10 z-50"
                  >
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-dna-cyan/10 p-3 space-y-1 flex-shrink-0">
        {/* Collapse Toggle */}
        <motion.button
          onClick={toggleCollapse}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
            text-slate-500 hover:text-slate-300 hover:bg-white/5
            font-body text-sm transition-colors"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
          )}
          <AnimatePresence>
            {expanded && (
              <motion.span
                className="overflow-hidden whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
            text-slate-500 hover:text-slate-300 hover:bg-white/5
            font-body text-sm transition-colors"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Sun className="w-5 h-5 flex-shrink-0 text-dna-cyan" />
          )}
          <AnimatePresence>
            {expanded && (
              <motion.span
                className="overflow-hidden whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Settings */}
        <Link
          to="/settings"
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
            font-body text-sm transition-colors
            ${location.pathname === '/settings'
              ? 'text-dna-cyan bg-dna-cyan/10'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                className="overflow-hidden whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* User Info + Logout */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg
          bg-white/5 border border-dna-cyan/10">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-dna-cyan/30 to-dna-magenta/30
            flex items-center justify-center border border-dna-cyan/20">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div
                className="overflow-hidden whitespace-nowrap min-w-0 flex-1"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                <p className="text-xs font-body text-slate-300 truncate">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-slate-500 font-mono capitalize">{user?.role || 'researcher'}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {expanded && (
              <motion.button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-dna-magenta
                  hover:bg-dna-magenta/10 transition-colors flex-shrink-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
