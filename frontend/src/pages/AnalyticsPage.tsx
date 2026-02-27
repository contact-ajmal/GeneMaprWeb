import { motion } from 'framer-motion'
import DashboardAnalytics from '../components/DashboardAnalytics'
import PageTransition from '../components/PageTransition'
import DecodeText from '../components/ui/DecodeText'

export default function AnalyticsPage() {
  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Hero Section */}
        <div>
          <motion.h1
            className="text-xl md:text-2xl font-headline font-bold text-slate-100 mb-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <DecodeText text="Genomic Analytics" speed={20} />
          </motion.h1>
          <motion.p
            className="text-sm text-slate-400 font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Comprehensive statistics and visualizations of your variant data
          </motion.p>
        </div>

        {/* Analytics Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <DashboardAnalytics />
        </motion.div>
      </div>
    </PageTransition>
  )
}
