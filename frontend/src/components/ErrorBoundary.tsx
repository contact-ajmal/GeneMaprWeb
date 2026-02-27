import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{
            background: '#0a0e1a',
            backgroundImage:
              'radial-gradient(at 0% 0%, rgba(0, 212, 255, 0.05) 0%, transparent 50%), radial-gradient(at 100% 100%, rgba(255, 51, 102, 0.05) 0%, transparent 50%)',
          }}
        >
          <div className="glass-panel-elevated rounded-2xl p-8 max-w-lg w-full border border-dna-magenta/20 shadow-[0_0_30px_rgba(255,51,102,0.1)]">
            {/* Animated error icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-dna-magenta/20 to-red-900/20 flex items-center justify-center border border-dna-magenta/30">
                  {/* Broken DNA strand SVG */}
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path
                      d="M12 8C12 8 16 12 20 12C24 12 28 8 28 8"
                      stroke="#ff3366"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                    <path
                      d="M12 16C12 16 16 20 20 20C24 20 28 16 28 16"
                      stroke="#00d4ff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                    {/* Break */}
                    <line x1="18" y1="22" x2="15" y2="28" stroke="#ff3366" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                    <line x1="22" y1="22" x2="25" y2="28" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                    {/* Particles */}
                    <circle cx="14" cy="30" r="1.5" fill="#ff3366" opacity="0.6" />
                    <circle cx="26" cy="30" r="1.5" fill="#00d4ff" opacity="0.6" />
                    <circle cx="20" cy="33" r="1" fill="#ffaa00" opacity="0.4" />
                  </svg>
                </div>
                {/* Pulse ring */}
                <div
                  className="absolute inset-0 rounded-full border border-dna-magenta/20"
                  style={{
                    animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                  }}
                />
              </div>
            </div>

            <h2 className="text-lg font-headline font-bold text-center text-slate-100 mb-2">
              Sequence Error Detected
            </h2>
            <p className="text-slate-400 text-center mb-6 font-body">
              An unexpected mutation occurred in the application. Please reload to restore normal operation.
            </p>

            {this.state.error && (
              <div className="glass-panel rounded-xl p-4 mb-6 border border-slate-700/50">
                <p className="text-xs font-mono-variant text-dna-magenta break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 rounded-xl font-headline font-semibold text-white
                bg-gradient-to-r from-dna-cyan to-blue-600
                hover:from-dna-cyan hover:to-dna-cyan
                shadow-[0_0_20px_rgba(0,212,255,0.2)]
                hover:shadow-[0_0_30px_rgba(0,212,255,0.3)]
                transition-all duration-300
                active:scale-[0.98]"
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
