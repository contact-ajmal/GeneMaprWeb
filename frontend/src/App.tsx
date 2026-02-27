import { useState, useCallback } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast'
import ChatPanel from './components/ChatPanel'
import VariantDetailModal from './components/VariantDetailModal'
import type { Variant } from './types/variant'
import apiClient from './api/client'

function App() {
  const location = useLocation()
  const [chatVariant, setChatVariant] = useState<Variant | null>(null)

  const handleVariantClick = useCallback(async (variantId: string) => {
    try {
      const response = await apiClient.get<Variant>(`/variants/${variantId}`)
      setChatVariant(response.data)
    } catch {
      // Silently fail if variant not found
    }
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Layout>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<UploadPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Routes>
          </AnimatePresence>
        </Layout>
        <ChatPanel onVariantClick={handleVariantClick} />
        <VariantDetailModal
          variant={chatVariant}
          onClose={() => setChatVariant(null)}
        />
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
