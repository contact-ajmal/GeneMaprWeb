import { useMemo } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  duration: number
  delay: number
}

/**
 * Floating Particle Background
 * CSS-only animated particles with connecting lines
 */
export default function ParticleField() {
  // Generate particles with random positions and properties
  const particles = useMemo(() => {
    const colors = [
      'rgba(0, 212, 255, 0.6)', // Cyan
      'rgba(255, 51, 102, 0.6)', // Magenta
      'rgba(255, 255, 255, 0.4)', // White
      'rgba(0, 255, 136, 0.4)', // Green
    ]

    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 3, // 3-5px (slightly larger)
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 10 + 10, // 10-20s
      delay: Math.random() * -20, // Start at random point in animation
    }))
  }, [])

  // Generate connection lines between nearby particles
  const connections = useMemo(() => {
    const lines: { from: Particle; to: Particle }[] = []
    const maxDistance = 15 // Only connect particles within 15% of viewport

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < maxDistance) {
          lines.push({
            from: particles[i],
            to: particles[j],
          })
        }
      }
    }

    return lines.slice(0, 30) // Limit to 30 connections for performance
  }, [particles])

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 51, 102, 0.1)" />
          </linearGradient>
        </defs>

        {connections.map((connection, index) => (
          <line
            key={index}
            x1={`${connection.from.x}%`}
            y1={`${connection.from.y}%`}
            x2={`${connection.to.x}%`}
            y2={`${connection.to.y}%`}
            stroke="url(#lineGradient)"
            strokeWidth="1"
            strokeOpacity="0.3"
            strokeDasharray="2,2"
          />
        ))}
      </svg>

      {/* Floating Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: particle.color,
            boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
            animation: `particle-float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* Additional larger glowing orbs */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          top: '10%',
          left: '15%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%)',
          animation: 'float 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          bottom: '20%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255, 51, 102, 0.08) 0%, transparent 70%)',
          animation: 'float-delayed 25s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          top: '60%',
          left: '70%',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.06) 0%, transparent 70%)',
          animation: 'float 18s ease-in-out infinite',
          animationDelay: '-5s',
        }}
      />
    </div>
  )
}
