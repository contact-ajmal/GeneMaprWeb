import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Sample } from '../types/variant'

interface ActiveSampleContextType {
  activeSampleIds: string[]
  activeSamples: Sample[]
  setActiveSampleIds: (ids: string[]) => void
  toggleSample: (id: string) => void
  clearSelection: () => void
  setActiveSamples: (samples: Sample[]) => void
  primarySampleId: string | null
}

const ActiveSampleContext = createContext<ActiveSampleContextType | undefined>(undefined)

const STORAGE_KEY = 'genemappr_active_samples'

export function ActiveSampleProvider({ children }: { children: ReactNode }) {
  const [activeSampleIds, setActiveSampleIdsState] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [activeSamples, setActiveSamples] = useState<Sample[]>([])

  // Persist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(activeSampleIds))
  }, [activeSampleIds])

  const setActiveSampleIds = useCallback((ids: string[]) => {
    setActiveSampleIdsState(ids)
  }, [])

  const toggleSample = useCallback((id: string) => {
    setActiveSampleIdsState(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }, [])

  const clearSelection = useCallback(() => {
    setActiveSampleIdsState([])
    setActiveSamples([])
  }, [])

  const primarySampleId = activeSampleIds.length > 0 ? activeSampleIds[0] : null

  return (
    <ActiveSampleContext.Provider
      value={{
        activeSampleIds,
        activeSamples,
        setActiveSampleIds,
        toggleSample,
        clearSelection,
        setActiveSamples,
        primarySampleId,
      }}
    >
      {children}
    </ActiveSampleContext.Provider>
  )
}

export function useActiveSample() {
  const context = useContext(ActiveSampleContext)
  if (!context) {
    throw new Error('useActiveSample must be used within ActiveSampleProvider')
  }
  return context
}
