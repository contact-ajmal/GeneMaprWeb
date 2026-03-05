import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    Dna, Brain, BarChart3, Zap, FlaskConical,
    ArrowRight, ExternalLink, Sparkles, Layers,
    Activity, GitCompare, Globe
} from 'lucide-react'

const capabilities = [
    {
        icon: Activity,
        title: 'Gene Expression Prediction',
        description: 'Predict how a variant affects RNA-seq gene expression levels. AlphaGenome analyzes how mutations alter transcriptional output across tissues and cell types, enabling functional impact assessment.',
        color: '#00d4ff',
    },
    {
        icon: Layers,
        title: 'Splicing Pattern Analysis',
        description: 'Predict effects on splicing patterns including exon skipping, intron retention, and alternative splice site usage. Identifies variants that may disrupt normal mRNA processing.',
        color: '#8b5cf6',
    },
    {
        icon: BarChart3,
        title: 'Chromatin Feature Prediction',
        description: 'Assess impact on chromatin accessibility, histone modifications, and regulatory element activity. Understand how variants affect the epigenetic landscape and gene regulation.',
        color: '#f59e0b',
    },
    {
        icon: GitCompare,
        title: 'Contact Map Prediction',
        description: 'Predict effects on 3D genome organization and chromatin contact maps. Identify variants that may disrupt topological domains and long-range regulatory interactions.',
        color: '#10b981',
    },
]

const pipelineSteps = [
    { step: '1', title: 'Upload VCF', desc: 'Upload your VCF file containing genomic variants through GeneMapr\'s drag-and-drop interface.', color: '#00d4ff' },
    { step: '2', title: 'Annotate Variants', desc: 'GeneMapr annotates each variant with ClinVar, gnomAD, and Ensembl data plus risk scores.', color: '#10b981' },
    { step: '3', title: 'AlphaGenome Analysis', desc: 'One click triggers batch AlphaGenome predictions for all variants via Google DeepMind\'s API.', color: '#8b5cf6' },
    { step: '4', title: 'View Predictions', desc: 'Browse variant effect scores, REF vs ALT expression tracks, and score distributions in a rich dashboard.', color: '#ff3366' },
]

const highlights = [
    { value: '1M bp', label: 'Input Length', desc: 'Analyzes sequences up to 1 million base pairs' },
    { value: '1 bp', label: 'Resolution', desc: 'Single base-pair resolution predictions' },
    { value: '4+', label: 'Output Types', desc: 'Gene expression, splicing, chromatin, contact maps' },
    { value: 'SOTA', label: 'Performance', desc: 'State-of-the-art across genomic benchmarks' },
]

export function AlphaGenomePage() {
    const headerRef = useRef(null)
    const headerInView = useInView(headerRef, { once: true, margin: '-50px' })
    const capRef = useRef(null)
    const capInView = useInView(capRef, { once: true, margin: '-60px' })
    const pipeRef = useRef(null)
    const pipeInView = useInView(pipeRef, { once: true, margin: '-60px' })
    const intRef = useRef(null)
    const intInView = useInView(intRef, { once: true, margin: '-60px' })

    return (
        <div className="section" style={{ paddingTop: 60 }}>
            <div className="container">
                {/* Hero-style header */}
                <motion.div
                    ref={headerRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={headerInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7 }}
                    style={{ textAlign: 'center', marginBottom: 80 }}
                >
                    {/* Google DeepMind badge */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <span className="section-label" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}>
                            <Sparkles size={14} /> Powered by Google DeepMind
                        </span>
                        <span className="section-label">
                            <Dna size={14} /> AlphaGenome API
                        </span>
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                        fontWeight: 900,
                        lineHeight: 1.1,
                        marginBottom: 24,
                    }}>
                        <span className="gradient-text">AI-Powered</span> Variant Effect
                        <br />Prediction with{' '}
                        <span style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>AlphaGenome</span>
                    </h1>

                    <p style={{
                        fontSize: '1.15rem',
                        color: '#94a3b8',
                        lineHeight: 1.7,
                        maxWidth: 750,
                        margin: '0 auto 32px',
                    }}>
                        GeneMapr integrates Google DeepMind's{' '}
                        <strong style={{ color: '#a78bfa' }}>AlphaGenome</strong> — a unifying deep learning model
                        that deciphers the regulatory code within DNA sequences. Predict how your genomic variants
                        affect gene expression, splicing, chromatin features, and 3D genome organization,
                        all from within GeneMapr's interface.
                    </p>

                    {/* Stat highlights */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 16,
                        maxWidth: 800,
                        margin: '0 auto 40px',
                    }}>
                        {highlights.map((h, i) => (
                            <motion.div
                                key={h.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={headerInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                                className="glass-card"
                                style={{ padding: '20px 16px', textAlign: 'center' }}
                            >
                                <div style={{
                                    fontSize: '1.8rem',
                                    fontWeight: 800,
                                    fontFamily: "'Outfit', sans-serif",
                                    background: 'linear-gradient(135deg, #8b5cf6, #00d4ff)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    marginBottom: 4,
                                }}>
                                    {h.value}
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                                    {h.label}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{h.desc}</div>
                            </motion.div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/get-started" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}>
                            Get Started <ArrowRight size={16} />
                        </Link>
                        <a href="https://github.com/google-deepmind/alphagenome" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                            AlphaGenome Docs <ExternalLink size={16} />
                        </a>
                    </div>
                </motion.div>

                {/* What is AlphaGenome */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={headerInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="glass-card"
                    style={{
                        padding: '40px 48px',
                        marginBottom: 80,
                        borderColor: 'rgba(139, 92, 246, 0.15)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: -60,
                        right: -60,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }} className="ag-about-grid">
                        <div>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 16 }}>
                                What is <span style={{ color: '#a78bfa' }}>AlphaGenome</span>?
                            </h2>
                            <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>
                                AlphaGenome is Google DeepMind's unifying deep learning model for deciphering the regulatory
                                code within DNA sequences. Published in <strong style={{ color: '#e2e8f0' }}>Nature (2026)</strong>,
                                it achieves state-of-the-art performance across diverse genomic prediction benchmarks.
                            </p>
                            <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>
                                The model analyzes DNA sequences of up to <strong style={{ color: '#00d4ff' }}>1 million base pairs</strong> and
                                delivers predictions at <strong style={{ color: '#00d4ff' }}>single base-pair resolution</strong>,
                                offering multimodal outputs including gene expression, splicing patterns, chromatin features, and contact maps.
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, fontStyle: 'italic' }}>
                                Avsec, Ž. et al. "Advancing regulatory variant effect prediction with AlphaGenome."
                                Nature 649, 1206–1218 (2026).
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Developed by', value: 'Google DeepMind', color: '#8b5cf6' },
                                { label: 'Published in', value: 'Nature (2026)', color: '#00d4ff' },
                                { label: 'Model type', value: 'Deep Learning DNA Model', color: '#10b981' },
                                { label: 'Input', value: 'DNA sequences (up to 1M bp)', color: '#f59e0b' },
                                { label: 'API access', value: 'Free for non-commercial use', color: '#ff3366' },
                            ].map(item => (
                                <div key={item.label} style={{
                                    padding: '14px 20px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.label}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: item.color }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <style>{`@media (max-width: 768px) { .ag-about-grid { grid-template-columns: 1fr !important; } }`}</style>
                </motion.div>

                {/* Capabilities grid */}
                <div ref={capRef} style={{ marginBottom: 80 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={capInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        style={{ textAlign: 'center', marginBottom: 48 }}
                    >
                        <span className="section-label" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}>
                            <Brain size={14} /> Prediction Capabilities
                        </span>
                        <h2 className="section-title" style={{ margin: '0 auto 16px' }}>
                            Multimodal <span className="gradient-text">Genomic Predictions</span>
                        </h2>
                        <p className="section-subtitle" style={{ margin: '0 auto' }}>
                            AlphaGenome delivers predictions across four major genomic modalities,
                            all accessible through GeneMapr's integrated interface.
                        </p>
                    </motion.div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                        {capabilities.map((cap, i) => {
                            const ref = useRef(null)
                            const inView = useInView(ref, { once: true, margin: '-50px' })
                            return (
                                <motion.div
                                    key={cap.title}
                                    ref={ref}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={inView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    className="glass-card"
                                    style={{ padding: 32, position: 'relative', overflow: 'hidden' }}
                                >
                                    <div style={{
                                        position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
                                        background: `radial-gradient(circle, ${cap.color}12 0%, transparent 70%)`, pointerEvents: 'none',
                                    }} />
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 12,
                                        background: `${cap.color}15`, border: `1px solid ${cap.color}28`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                                    }}>
                                        <cap.icon size={22} color={cap.color} />
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 10, color: '#e2e8f0' }}>{cap.title}</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.65 }}>{cap.description}</p>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {/* How it works pipeline */}
                <div ref={pipeRef} style={{ marginBottom: 80 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={pipeInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        style={{ textAlign: 'center', marginBottom: 48 }}
                    >
                        <span className="section-label">
                            <Zap size={14} /> How It Works
                        </span>
                        <h2 className="section-title" style={{ margin: '0 auto 16px' }}>
                            From VCF Upload to <span className="gradient-text">AI Predictions</span>
                        </h2>
                        <p className="section-subtitle" style={{ margin: '0 auto' }}>
                            GeneMapr seamlessly integrates AlphaGenome into the variant analysis workflow —
                            no separate tools or complex setup required.
                        </p>
                    </motion.div>

                    <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
                        {pipelineSteps.map((s, i) => (
                            <motion.div
                                key={s.step}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={pipeInView ? { opacity: 1, scale: 1 } : {}}
                                transition={{ duration: 0.4, delay: i * 0.12 }}
                                className="glass-card"
                                style={{ padding: '24px 20px', textAlign: 'center', borderColor: `${s.color}20` }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%', margin: '0 auto 16px',
                                    background: `${s.color}20`, border: `2px solid ${s.color}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1rem', fontWeight: 800, color: s.color,
                                    fontFamily: "'Outfit', sans-serif",
                                }}>
                                    {s.step}
                                </div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>{s.title}</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{s.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* GeneMapr integration details */}
                <div ref={intRef}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={intInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        style={{ textAlign: 'center', marginBottom: 48 }}
                    >
                        <span className="section-label" style={{ background: 'rgba(0, 212, 255, 0.15)', borderColor: 'rgba(0, 212, 255, 0.3)', color: '#00d4ff' }}>
                            <FlaskConical size={14} /> GeneMapr Integration
                        </span>
                        <h2 className="section-title" style={{ margin: '0 auto 16px' }}>
                            What You Get in <span className="gradient-text">GeneMapr</span>
                        </h2>
                    </motion.div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 24,
                        maxWidth: 1000,
                        margin: '0 auto 64px',
                    }}>
                        {[
                            {
                                title: 'Variant Effect Scores',
                                desc: 'Each variant receives a computed effect score — the mean absolute log2 fold-change between ALT and REF tracks. Higher scores indicate greater predicted functional impact.',
                                icon: BarChart3, color: '#00d4ff',
                            },
                            {
                                title: 'REF vs ALT Expression Tracks',
                                desc: 'Interactive visualization comparing the reference and alternate allele expression profiles. See exactly where and how the variant alters predicted gene expression.',
                                icon: Activity, color: '#8b5cf6',
                            },
                            {
                                title: 'Batch Prediction Engine',
                                desc: 'Run AlphaGenome predictions for all variants in a sample with one click. Automatic rate limiting, retry logic, and progress tracking built in.',
                                icon: Zap, color: '#f59e0b',
                            },
                            {
                                title: 'Score Distribution Dashboard',
                                desc: 'Histogram visualization of variant effect scores across your sample. Quickly identify high-impact variants and overall sample characteristics.',
                                icon: BarChart3, color: '#10b981',
                            },
                            {
                                title: 'Top-Impact Variant Table',
                                desc: 'Sortable table showing the most impactful variants with effect scores, chromosome positions, and mini expression track previews.',
                                icon: Layers, color: '#ff3366',
                            },
                            {
                                title: 'Persistent Results',
                                desc: 'All AlphaGenome predictions are stored in PostgreSQL. Results persist across sessions — run once, access forever. No need to re-query the API.',
                                icon: Globe, color: '#ec4899',
                            },
                        ].map((feat, i) => (
                            <motion.div
                                key={feat.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={intInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.4, delay: i * 0.08 }}
                                className="glass-card"
                                style={{ padding: 28, display: 'flex', alignItems: 'flex-start', gap: 16 }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                    background: `${feat.color}15`, border: `1px solid ${feat.color}25`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <feat.icon size={18} color={feat.color} />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{feat.title}</h4>
                                    <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>{feat.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={intInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="glass-card"
                    style={{
                        padding: '48px 40px',
                        textAlign: 'center',
                        borderColor: 'rgba(139, 92, 246, 0.2)',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(0, 212, 255, 0.04))',
                        marginBottom: 40,
                    }}
                >
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                        Ready to Try <span style={{ color: '#a78bfa' }}>AlphaGenome</span> with GeneMapr?
                    </h2>
                    <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: 28, maxWidth: 600, margin: '0 auto 28px' }}>
                        Get started in minutes. Upload your VCF file, run AlphaGenome predictions, and gain deeper
                        insights into your genomic variants.
                    </p>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/get-started" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}>
                            Get Started <ArrowRight size={16} />
                        </Link>
                        <a href="https://github.com/contact-ajmal/GeneMapr" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                            View Source Code <ExternalLink size={16} />
                        </a>
                        <a href="https://deepmind.google.com/science/alphagenome" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                            Get AlphaGenome API Key <ExternalLink size={16} />
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
