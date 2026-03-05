import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Menu, X, Github, Dna } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'AlphaGenome', path: '/alphagenome', highlight: true },
    { label: 'Screenshots', path: '/screenshots' },
    { label: 'Architecture', path: '/architecture' },
    { label: 'Tech Stack', path: '/tech-stack' },
    { label: 'Get Started', path: '/get-started' },
]

export function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        setMobileOpen(false)
        window.scrollTo(0, 0)
    }, [location.pathname])

    return (
        <motion.header
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                padding: '0 24px',
                height: 72,
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.3s ease',
                background: scrolled ? 'rgba(10, 14, 26, 0.88)' : 'rgba(10, 14, 26, 0.65)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: scrolled ? '1px solid rgba(0, 212, 255, 0.1)' : '1px solid rgba(255,255,255,0.04)',
            }}
        >
            <div style={{
                maxWidth: 1200,
                margin: '0 auto',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                {/* Logo */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Dna size={20} color="#0a0e1a" strokeWidth={2.5} />
                    </div>
                    <span style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: '#e2e8f0',
                        letterSpacing: '-0.5px',
                    }}>
                        Gene<span style={{ color: '#00d4ff' }}>Mapr</span>
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="desktop-nav">
                    {navLinks.map((link: any) => {
                        const isActive = location.pathname === link.path
                        const isHighlight = link.highlight
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                style={{
                                    fontSize: '0.88rem',
                                    fontWeight: isActive || isHighlight ? 600 : 500,
                                    color: isActive ? (isHighlight ? '#a78bfa' : '#00d4ff') : isHighlight ? '#a78bfa' : '#94a3b8',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    paddingBottom: 4,
                                    ...(isHighlight && !isActive ? {
                                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    } : {}),
                                }}
                                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.opacity = '0.8' } }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                            >
                                {isHighlight && '✦ '}{link.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="navIndicator"
                                        style={{
                                            position: 'absolute',
                                            bottom: -2,
                                            left: 0,
                                            right: 0,
                                            height: 2,
                                            background: isHighlight ? '#8b5cf6' : '#00d4ff',
                                            borderRadius: 1,
                                            boxShadow: isHighlight ? '0 0 8px rgba(139, 92, 246, 0.4)' : '0 0 8px rgba(0, 212, 255, 0.4)',
                                        }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                    <a
                        href="https://github.com/contact-ajmal/GeneMapr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Github size={16} />
                        GitHub
                    </a>
                </nav>

                {/* Mobile toggle */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="mobile-nav-toggle"
                    style={{
                        display: 'none',
                        background: 'none',
                        border: 'none',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        padding: 4,
                    }}
                >
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        position: 'absolute',
                        top: 72,
                        left: 0,
                        right: 0,
                        background: 'rgba(10, 14, 26, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                    }}
                >
                    {navLinks.map(link => {
                        const isActive = location.pathname === link.path
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                style={{
                                    fontSize: '1rem',
                                    color: isActive ? '#00d4ff' : '#94a3b8',
                                    fontWeight: isActive ? 600 : 400,
                                    padding: '10px 0',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                }}
                            >
                                {link.label}
                            </Link>
                        )
                    })}
                    <a
                        href="https://github.com/contact-ajmal/GeneMapr"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#e2e8f0',
                            fontSize: '0.95rem',
                            padding: '10px 0',
                        }}
                    >
                        <Github size={18} />
                        View on GitHub
                    </a>
                </motion.div>
            )}

            <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav-toggle { display: block !important; }
        }
      `}</style>
        </motion.header>
    )
}
