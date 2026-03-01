import { useState, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast'
import { ActiveSampleProvider } from './contexts/ActiveSampleContext'
import ChatPanel from './components/ChatPanel'
import VariantEvidenceWorkspace from './components/VariantEvidenceWorkspace'
import { SkeletonPage } from './components/ui/Skeleton'
import type { Variant } from './types/variant'
import apiClient from './api/client'

// Lazy-loaded route components
const UploadPage = lazy(() => import('./pages/UploadPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const PharmacogenomicsPage = lazy(() => import('./pages/PharmacogenomicsPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const GenomeViewPage = lazy(() => import('./pages/GenomeViewPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SampleManagerPage = lazy(() => import('./pages/SampleManagerPage'))

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

  const handleVariantSelect = useCallback((variant: Variant) => {
    setChatVariant(variant)
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ActiveSampleProvider>
          <Layout onVariantSelect={handleVariantSelect}>
            <Suspense fallback={<SkeletonPage />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<UploadPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/samples" element={<SampleManagerPage />} />
                  <Route path="/genome-view" element={<GenomeViewPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/pharmacogenomics" element={<PharmacogenomicsPage />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </Layout>
          <ChatPanel onVariantClick={handleVariantClick} />
          <VariantEvidenceWorkspace
            variant={chatVariant}
            onClose={() => setChatVariant(null)}
          />
        </ActiveSampleProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
