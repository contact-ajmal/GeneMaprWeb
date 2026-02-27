import { useMemo } from 'react'

interface HelixConfig {
  id: number
  x: number
  y: number
  scale: number
  opacity: number
  speed: number
  rotationOffset: number
  basePairs: number
}

const BASE_PAIRS: [string, string][] = [
  ['A', 'T'],
  ['T', 'A'],
  ['C', 'G'],
  ['G', 'C'],
  ['A', 'T'],
  ['G', 'C'],
  ['C', 'G'],
  ['T', 'A'],
]

/**
 * DNA Double Helix Background
 * SVG-based realistic double helix with base pair letters
 */
export default function DNAHelix() {
  const helixes: HelixConfig[] = useMemo(() => [
    { id: 0, x: 3,  y: 2,  scale: 1.1,  opacity: 0.35, speed: 35, rotationOffset: 0,   basePairs: 14 },
    { id: 1, x: 78, y: 5,  scale: 0.8,  opacity: 0.22, speed: 42, rotationOffset: 90,  basePairs: 12 },
    { id: 2, x: 20, y: 40, scale: 0.9,  opacity: 0.28, speed: 38, rotationOffset: 45,  basePairs: 13 },
    { id: 3, x: 65, y: 50, scale: 1.0,  opacity: 0.3,  speed: 32, rotationOffset: 180, basePairs: 14 },
    { id: 4, x: 88, y: 35, scale: 0.65, opacity: 0.18, speed: 45, rotationOffset: 135, basePairs: 10 },
    { id: 5, x: 45, y: 72, scale: 0.75, opacity: 0.22, speed: 40, rotationOffset: 270, basePairs: 11 },
    { id: 6, x: 8,  y: 70, scale: 0.85, opacity: 0.25, speed: 36, rotationOffset: 60,  basePairs: 12 },
    { id: 7, x: 55, y: 8,  scale: 0.7,  opacity: 0.2,  speed: 44, rotationOffset: 200, basePairs: 10 },
  ], [])

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {helixes.map((helix) => (
        <HelixSVG key={helix.id} config={helix} />
      ))}
    </div>
  )
}

function HelixSVG({ config }: { config: HelixConfig }) {
  const { x, y, scale, opacity, speed, rotationOffset, basePairs } = config

  const width = 120 * scale
  const height = basePairs * 32 * scale
  const amplitude = 40 * scale
  const centerX = width / 2

  // Generate helix strand paths and base pairs
  const { strand1, strand2, rungs } = useMemo(() => {
    const s1Points: string[] = []
    const s2Points: string[] = []
    const rungData: { y: number; x1: number; x2: number; pair: [string, string]; depth: number }[] = []

    const steps = basePairs * 8
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const py = t * height
      const phase = t * Math.PI * 3 + (rotationOffset * Math.PI) / 180
      const x1 = centerX + Math.sin(phase) * amplitude
      const x2 = centerX + Math.sin(phase + Math.PI) * amplitude

      if (i === 0) {
        s1Points.push(`M ${x1.toFixed(1)} ${py.toFixed(1)}`)
        s2Points.push(`M ${x2.toFixed(1)} ${py.toFixed(1)}`)
      } else {
        s1Points.push(`L ${x1.toFixed(1)} ${py.toFixed(1)}`)
        s2Points.push(`L ${x2.toFixed(1)} ${py.toFixed(1)}`)
      }

      // Add base pair rungs at regular intervals
      if (i > 0 && i < steps && i % 8 === 0) {
        const pairIndex = Math.floor(i / 8) % BASE_PAIRS.length
        const depth = Math.cos(phase) // -1 to 1, indicates front/back
        rungData.push({
          y: py,
          x1,
          x2,
          pair: BASE_PAIRS[pairIndex],
          depth,
        })
      }
    }

    return {
      strand1: s1Points.join(' '),
      strand2: s2Points.join(' '),
      rungs: rungData,
    }
  }, [basePairs, height, centerX, amplitude, rotationOffset])

  // Sort rungs by depth so back ones render first
  const sortedRungs = [...rungs].sort((a, b) => a.depth - b.depth)

  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        opacity,
        width: `${width + 20}px`,
        height: `${height + 20}px`,
      }}
    >
      <svg
        width={width + 20}
        height={height + 20}
        viewBox={`-10 -10 ${width + 20} ${height + 20}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: `helix-drift ${speed}s ease-in-out infinite`,
        }}
      >
        <defs>
          {/* Strand gradients */}
          <linearGradient id={`strandCyan-${config.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#00a8cc" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`strandMagenta-${config.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff3366" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#cc2952" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff3366" stopOpacity="0.9" />
          </linearGradient>
          {/* Glow filters */}
          <filter id={`glow-${config.id}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`softGlow-${config.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base pair rungs (back ones first) */}
        {sortedRungs.map((rung, i) => {
          const depthOpacity = 0.3 + (rung.depth + 1) * 0.35 // 0.3 to 1.0
          const letterSize = Math.max(6, 9 * scale)
          const midX = (rung.x1 + rung.x2) / 2
          const leftLetterX = rung.x1 + (midX - rung.x1) * 0.35
          const rightLetterX = rung.x2 + (midX - rung.x2) * 0.35

          // Color based on base type
          const leftColor = rung.pair[0] === 'A' || rung.pair[0] === 'T' ? '#00d4ff' : '#ff3366'
          const rightColor = rung.pair[1] === 'A' || rung.pair[1] === 'T' ? '#00d4ff' : '#ff3366'

          return (
            <g key={i} opacity={depthOpacity}>
              {/* Rung connecting line */}
              <line
                x1={rung.x1}
                y1={rung.y}
                x2={rung.x2}
                y2={rung.y}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth={1.5 * scale}
                strokeDasharray={`${3 * scale} ${2 * scale}`}
              />

              {/* Hydrogen bond dots in center */}
              <circle cx={midX - 2 * scale} cy={rung.y} r={1 * scale} fill="rgba(255,255,255,0.3)" />
              <circle cx={midX + 2 * scale} cy={rung.y} r={1 * scale} fill="rgba(255,255,255,0.3)" />

              {/* Left base letter */}
              <text
                x={leftLetterX}
                y={rung.y + letterSize * 0.35}
                fill={leftColor}
                fontSize={letterSize}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
                textAnchor="middle"
                filter={`url(#softGlow-${config.id})`}
              >
                {rung.pair[0]}
              </text>

              {/* Right base letter */}
              <text
                x={rightLetterX}
                y={rung.y + letterSize * 0.35}
                fill={rightColor}
                fontSize={letterSize}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
                textAnchor="middle"
                filter={`url(#softGlow-${config.id})`}
              >
                {rung.pair[1]}
              </text>
            </g>
          )
        })}

        {/* Strand 1 (Cyan) - backbone */}
        <path
          d={strand1}
          fill="none"
          stroke={`url(#strandCyan-${config.id})`}
          strokeWidth={2.5 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${config.id})`}
        />

        {/* Strand 2 (Magenta) - backbone */}
        <path
          d={strand2}
          fill="none"
          stroke={`url(#strandMagenta-${config.id})`}
          strokeWidth={2.5 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${config.id})`}
        />

        {/* Nucleotide dots along strands */}
        {rungs.map((rung, i) => {
          const depthOpacity = 0.4 + (rung.depth + 1) * 0.3
          const dotSize = 3 * scale
          return (
            <g key={`dots-${i}`} opacity={depthOpacity}>
              <circle
                cx={rung.x1}
                cy={rung.y}
                r={dotSize}
                fill="#00d4ff"
                filter={`url(#glow-${config.id})`}
              />
              <circle
                cx={rung.x2}
                cy={rung.y}
                r={dotSize}
                fill="#ff3366"
                filter={`url(#glow-${config.id})`}
              />
            </g>
          )
        })}
      </svg>

      {/* CSS animation */}
      <style>{`
        @keyframes helix-drift {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-${8 * scale}px) rotate(${1.5}deg);
          }
          50% {
            transform: translateY(-${3 * scale}px) rotate(0deg);
          }
          75% {
            transform: translateY(${5 * scale}px) rotate(-${1.5}deg);
          }
        }
      `}</style>
    </div>
  )
}
