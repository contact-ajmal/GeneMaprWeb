import { motion, AnimatePresence } from 'framer-motion'
import { useIsFetching } from '@tanstack/react-query'

export default function TopLoadingBar() {
  const isFetching = useIsFetching()

  return (
    <AnimatePresence>
      {isFetching > 0 && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[60] h-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="h-full rounded-r-full"
            style={{
              background: 'linear-gradient(90deg, #00d4ff, #a855f7, #ff3366)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: '90%' }}
            exit={{ width: '100%' }}
            transition={{
              width: {
                duration: 8,
                ease: [0.1, 0.45, 0.2, 0.8],
              },
            }}
          />
          {/* Glow effect */}
          <div
            className="absolute top-0 left-0 right-0 h-1 blur-sm"
            style={{
              background: 'linear-gradient(90deg, rgba(0,212,255,0.4), rgba(168,85,247,0.4), rgba(255,51,102,0.4))',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
