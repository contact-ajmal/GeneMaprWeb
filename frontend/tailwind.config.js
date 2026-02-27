/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GeneMapr Design System v2.0
        bg: {
          primary: '#0a0e1a',
          secondary: '#0f1628',
          tertiary: '#141b2d',
          elevated: '#1a2332',
        },
        dna: {
          cyan: '#00d4ff',
          magenta: '#ff3366',
          green: '#00ff88',
          amber: '#ffaa00',
        },
        glow: {
          cyan: 'rgba(0, 212, 255, 0.1)',
          'cyan-md': 'rgba(0, 212, 255, 0.2)',
          'cyan-strong': 'rgba(0, 212, 255, 0.4)',
          magenta: 'rgba(255, 51, 102, 0.1)',
          'magenta-md': 'rgba(255, 51, 102, 0.2)',
          'magenta-strong': 'rgba(255, 51, 102, 0.4)',
          green: 'rgba(0, 255, 136, 0.1)',
          'green-md': 'rgba(0, 255, 136, 0.2)',
          'green-strong': 'rgba(0, 255, 136, 0.4)',
        },
        // Keep existing slate for backward compatibility
        slate: {
          850: '#1a202e',
        },
      },
      fontFamily: {
        headline: ['Outfit', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan-sm': '0 2px 10px rgba(0, 212, 255, 0.1)',
        'glow-cyan': '0 4px 20px rgba(0, 212, 255, 0.15)',
        'glow-cyan-lg': '0 8px 30px rgba(0, 212, 255, 0.2)',
        'glow-cyan-xl': '0 12px 40px rgba(0, 212, 255, 0.25)',
        'glow-magenta-sm': '0 2px 10px rgba(255, 51, 102, 0.1)',
        'glow-magenta': '0 4px 20px rgba(255, 51, 102, 0.15)',
        'glow-magenta-lg': '0 8px 30px rgba(255, 51, 102, 0.2)',
        'glow-magenta-xl': '0 12px 40px rgba(255, 51, 102, 0.25)',
        'glow-green-sm': '0 2px 10px rgba(0, 255, 136, 0.1)',
        'glow-green': '0 4px 20px rgba(0, 255, 136, 0.15)',
        'glow-green-lg': '0 8px 30px rgba(0, 255, 136, 0.2)',
        'glow-green-xl': '0 12px 40px rgba(0, 255, 136, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '20px',
        xl: '24px',
        '2xl': '40px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out infinite',
        'decode-text': 'decode-text 0.5s steps(3) forwards',
        'helix-spin': 'helix-spin 20s linear infinite',
        'particle-float': 'particle-float 15s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.2s ease-out forwards',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            opacity: '0.5',
            filter: 'drop-shadow(0 0 8px currentColor)',
          },
          '50%': {
            opacity: '1',
            filter: 'drop-shadow(0 0 20px currentColor)',
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px) translateX(0px)',
          },
          '25%': {
            transform: 'translateY(-20px) translateX(10px)',
          },
          '50%': {
            transform: 'translateY(-10px) translateX(-10px)',
          },
          '75%': {
            transform: 'translateY(-30px) translateX(5px)',
          },
        },
        'particle-float': {
          '0%, 100%': {
            transform: 'translate(0, 0)',
          },
          '33%': {
            transform: 'translate(30px, -30px)',
          },
          '66%': {
            transform: 'translate(-20px, 20px)',
          },
        },
        'decode-text': {
          '0%': {
            content: '"▓▓▓▓▓▓▓▓"',
          },
          '50%': {
            content: '"█▓▒░█▓▒░"',
          },
          '100%': {
            content: 'attr(data-text)',
          },
        },
        'helix-spin': {
          '0%': {
            transform: 'rotateY(0deg)',
          },
          '100%': {
            transform: 'rotateY(360deg)',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        'slide-up': {
          '0%': {
            transform: 'translateY(20px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'scale-in': {
          '0%': {
            transform: 'scale(0.95)',
            opacity: '0',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
    },
  },
  plugins: [],
}
