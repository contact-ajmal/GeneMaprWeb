import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ExternalLink, Upload, Database, ShieldAlert, Brain, Dna, FileText, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const screenshots = [
    { src: '/screenshots/02_dashboard.png', label: 'Variant Dashboard' },
    { src: '/screenshots/04_genome_view.png', label: 'Genome View' },
    { src: '/screenshots/06_pharmacogenomics.png', label: 'Pharmacogenomics' },
    { src: '/screenshots/05_genome_analytics.png', label: 'Genome Analytics' },
    { src: '/screenshots/03_sample_workspace.png', label: 'Sample Workspace' },
]

const quickFeatures = [
    { icon: Sparkles, label: 'AlphaGenome (DeepMind)', color: '#a78bfa' },
    { icon: Upload, label: 'VCF Upload', color: '#00d4ff' },
    { icon: Database, label: 'Multi-Source Annotation', color: '#10b981' },
    { icon: ShieldAlert, label: 'Risk Scoring', color: '#f59e0b' },
    { icon: Brain, label: 'AI Summaries', color: '#8b5cf6' },
    { icon: Dna, label: 'Genome View', color: '#06b6d4' },
    { icon: FileText, label: 'PDF Reports', color: '#14b8a6' },
]

export function Hero() {
    const [activeSlide, setActiveSlide] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => setActiveSlide(prev => (prev + 1) % screenshots.length), 4000)
        return () => clearInterval(timer)
    }, [])

    return (
        <section style={{ paddingTop: 60, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
            {/* Background */}
            <div style={{ position: 'absolute', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -100, left: -150, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,51,102,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} id="hero-grid">
                {/* Left */}
                <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 100, fontSize: '0.8rem', fontWeight: 600, color: '#00d4ff', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', marginBottom: 24 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 8px rgba(0,212,255,0.6)' }} />
                        OPEN SOURCE • v1.0
                    </div>

                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
                        <span className="gradient-text">Genomic Variant</span><br />
                        <span style={{ color: '#e2e8f0' }}>Interpretation</span><br />
                        <span style={{ color: '#e2e8f0' }}>Platform</span>
                    </h1>

                    <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: 24, maxWidth: 520 }}>
                        Parse, annotate, and interpret genomic variants from VCF files.
                        Integrates <strong style={{ color: '#e2e8f0' }}>ClinVar</strong>,{' '}
                        <strong style={{ color: '#e2e8f0' }}>gnomAD</strong>, and{' '}
                        <strong style={{ color: '#e2e8f0' }}>Ensembl</strong> with{' '}
                        <strong style={{ color: '#00d4ff' }}>AI-powered clinical summaries</strong>.
                    </p>

                    {/* AlphaGenome callout */}
                    <Link to="/alphagenome" style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 20px', marginBottom: 28, maxWidth: 520,
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.06))',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        borderRadius: 12, transition: 'all 0.3s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.25)'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                        <Sparkles size={20} color="#a78bfa" />
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa', marginBottom: 2 }}>
                                ✦ Powered by Google DeepMind's AlphaGenome
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                AI variant effect predictions — gene expression, splicing, chromatin & more
                            </div>
                        </div>
                        <ChevronRight size={16} color="#a78bfa" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                    </Link>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
                        <a href="https://github.com/contact-ajmal/GeneMapr" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                            View on GitHub <ExternalLink size={16} />
                        </a>
                        <Link to="/alphagenome" className="btn btn-secondary" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}>
                            AlphaGenome <ChevronRight size={16} />
                        </Link>
                    </div>

                    {/* Quick feature icons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {quickFeatures.map(f => (
                            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: `${f.color}10`, border: `1px solid ${f.color}20`, borderRadius: 8, fontSize: '0.78rem', color: f.color, fontWeight: 500 }}>
                                <f.icon size={14} />{f.label}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Right: Slider */}
                <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                    <Link to="/screenshots" style={{ display: 'block' }}>
                        <div className="screenshot-frame" style={{ position: 'relative' }}>
                            {screenshots.map((shot, i) => (
                                <motion.img
                                    key={shot.src} src={shot.src} alt={shot.label}
                                    initial={false}
                                    animate={{ opacity: i === activeSlide ? 1 : 0, scale: i === activeSlide ? 1 : 1.02 }}
                                    transition={{ duration: 0.6 }}
                                    style={{ display: 'block', width: '100%', position: i === 0 ? 'relative' : 'absolute', top: i === 0 ? undefined : 36, left: 0 }}
                                />
                            ))}
                        </div>
                    </Link>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                        {screenshots.map((shot, i) => (
                            <button key={i} onClick={() => setActiveSlide(i)}
                                style={{ width: i === activeSlide ? 32 : 8, height: 8, borderRadius: 4, border: 'none', background: i === activeSlide ? '#00d4ff' : 'rgba(148,163,184,0.3)', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: i === activeSlide ? '0 0 12px rgba(0,212,255,0.4)' : 'none' }}
                                title={shot.label}
                            />
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.85rem', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                        {screenshots[activeSlide].label}
                    </div>
                </motion.div>
            </div>

            {/* Quick navigation cards */}
            <div className="container" style={{ marginTop: 80 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {[
                        { label: '✦ AlphaGenome', desc: 'Google DeepMind AI', to: '/alphagenome', color: '#a78bfa', special: true },
                        { label: 'Features', desc: '12+ capabilities', to: '/features', color: '#00d4ff' },
                        { label: 'Screenshots', desc: 'See every screen', to: '/screenshots', color: '#8b5cf6' },
                        { label: 'Architecture', desc: 'System design', to: '/architecture', color: '#f59e0b' },
                        { label: 'Tech Stack', desc: 'Technologies used', to: '/tech-stack', color: '#10b981' },
                        { label: 'Get Started', desc: 'Setup in minutes', to: '/get-started', color: '#ff3366' },
                    ].map((card: any) => (
                        <Link key={card.to} to={card.to} className="glass-card" style={{
                            padding: '20px 24px', textAlign: 'center',
                            ...(card.special ? { borderColor: 'rgba(139, 92, 246, 0.25)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.04))' } : {}),
                        }}>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: card.special ? '#a78bfa' : '#e2e8f0', marginBottom: 4 }}>{card.label}</div>
                            <div style={{ fontSize: '0.8rem', color: card.color }}>{card.desc}</div>
                        </Link>
                    ))}
                </div>
            </div>

            <style>{`@media (max-width: 900px) { #hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
        </section>
    )
}
