import { useEffect, useState } from 'react'

interface DecodeTextProps {
  text: string
  className?: string
  trigger?: 'mount' | 'hover'
  speed?: number
}

/**
 * Decode Text Animation
 * Text that "decodes" like DNA sequencing
 * Characters cycle through random letters before resolving
 */
export default function DecodeText({
  text,
  className = '',
  trigger = 'mount',
  speed = 30,
}: DecodeTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isDecoding, setIsDecoding] = useState(trigger === 'mount')

  const letters = 'ACGTACGTACGT0123456789' // DNA bases + numbers

  useEffect(() => {
    if (!isDecoding || trigger !== 'mount') return

    let iteration = 0
    const maxIterations = 5

    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' '
            if (index < iteration) return text[index]

            return letters[Math.floor(Math.random() * letters.length)]
          })
          .join('')
      )

      iteration += 1 / maxIterations

      if (iteration >= text.length) {
        clearInterval(interval)
        setDisplayText(text)
        setIsDecoding(false)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, isDecoding, trigger, speed])

  const handleMouseEnter = () => {
    if (trigger === 'hover' && !isDecoding) {
      setIsDecoding(true)
      let iteration = 0
      const maxIterations = 3

      const interval = setInterval(() => {
        setDisplayText(() =>
          text
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' '
              if (index < iteration) return text[index]

              return letters[Math.floor(Math.random() * letters.length)]
            })
            .join('')
        )

        iteration += 1 / maxIterations

        if (iteration >= text.length) {
          clearInterval(interval)
          setDisplayText(text)
          setIsDecoding(false)
        }
      }, speed)
    }
  }

  return (
    <span
      className={`font-mono-variant tracking-wider ${
        isDecoding ? 'text-dna-green' : 'text-current'
      } ${className}`}
      onMouseEnter={trigger === 'hover' ? handleMouseEnter : undefined}
      style={{
        transition: 'color 0.3s ease',
      }}
    >
      {displayText}
    </span>
  )
}
