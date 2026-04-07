import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import './LandingPage.css';

// ─── Reusable fade-up wrapper ───────────────────────────────────────────────
const FadeUp = ({ children, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
        {children}
    </motion.div>
);

// ─── Agent Card ──────────────────────────────────────────────────────────────
const AgentCard = ({ index, icon, title, description, tag }) => (
    <motion.div
        whileHover={{ backgroundColor: 'var(--landing-bg-highlight)' }}
        className="landing-card"
        style={{
            borderRight: '1px solid var(--landing-border)',
            borderBottom: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRadius: 0,
            boxShadow: 'none',
            cursor: 'default',
        }}
    >
        <p style={{ fontFamily: 'var(--landing-font-mono)', fontSize: '0.75rem', color: 'var(--landing-text-tertiary)', marginBottom: 20, letterSpacing: '0.08em' }}>
            AGENT {index} / 04
        </p>
        <div style={{ fontSize: '1.5rem', marginBottom: 14 }}>{icon}</div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 8, lineHeight: 1.2 }}>{title}</h3>
        <p style={{ fontSize: '0.94rem', color: 'var(--landing-text-secondary)', lineHeight: 1.60 }}>{description}</p>
        <span style={{
            display: 'inline-block', marginTop: 16,
            fontFamily: 'var(--landing-font-sans)', fontSize: '0.75rem',
            color: 'var(--landing-text-secondary)',
            border: '1px solid var(--landing-border)',
            padding: '4px 8px', borderRadius: 6,
        }}>{tag}</span>
    </motion.div>
);

// ─── Pricing Card ────────────────────────────────────────────────────────────
const PricingCard = ({ title, price, period, description, features, highlighted = false }) => (
    <div className="landing-card" style={{
        flex: 1, minWidth: 280, maxWidth: 340,
        backgroundColor: highlighted ? 'var(--landing-bg-tertiary)' : 'var(--landing-bg-secondary)',
        border: highlighted ? '1px solid var(--landing-border-strong)' : '1px solid var(--landing-border)',
        position: 'relative',
        borderRadius: '12px',
    }}>
        {highlighted && (
            <span style={{
                position: 'absolute', top: 0, right: 24,
                background: 'var(--landing-cta-bg)', color: 'var(--landing-cta-text)',
                fontSize: '0.75rem', fontWeight: 500,
                padding: '4px 12px', borderRadius: '0 0 8px 8px',
                letterSpacing: '0.06em',
            }}>POPULAR</span>
        )}
        <h3 style={{ fontSize: '1.25rem', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: '0.94rem', color: 'var(--landing-text-secondary)', marginBottom: 28, lineHeight: 1.60 }}>{description}</p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: '2.5rem', fontFamily: 'var(--landing-font-serif)', fontWeight: 500 }}>{price}</span>
            <span style={{ fontSize: '0.94rem', color: 'var(--landing-text-tertiary)' }}>{period}</span>
        </div>

        <motion.button
            whileHover={{ opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            className={highlighted ? "landing-btn-primary" : "landing-btn-secondary"}
            style={{ width: '100%', marginBottom: 28 }}
        >
            Get started
        </motion.button>

        <div style={{ height: 1, background: 'var(--landing-border)', marginBottom: 24 }} />

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {features.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: '0.94rem', color: 'var(--landing-text-secondary)', lineHeight: 1.4 }}>
                    <span style={{ color: 'var(--landing-text-primary)' }}>✓</span>
                    {f}
                </li>
            ))}
        </ul>
    </div>
);

// ─── Main Landing Page ───────────────────────────────────────────────────────
const LandingPage = ({ onGetStarted }) => {
    // Theme logic isolated to landing page
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('lummina_landing_theme');
        return saved === 'dark';
    });

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            localStorage.setItem('lummina_landing_theme', next ? 'dark' : 'light');
            return next;
        });
    };

    return (
        <div className={`landing-theme ${isDark ? 'dark' : ''}`}>
            {/* ── NAV ── */}
            <nav className="landing-nav">
                <span style={{ fontSize: '1.25rem', fontFamily: 'var(--landing-font-serif)', fontWeight: 500 }}>Lummina</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    {['Learning Ecosystem', 'Agents', 'For Teachers', 'For Students'].map(link => (
                        <a href={`#${link.toLowerCase().replace(' ', '-')}`} key={link}>
                            {link}
                        </a>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
                        {isDark ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        )}
                    </button>
                    <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onGetStarted}
                        className="landing-btn-secondary"
                    >
                        Sign In →
                    </motion.button>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section style={{
                minHeight: '100vh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center',
                padding: '120px 24px 80px',
                borderBottom: '1px solid var(--landing-border)',
            }}>
                <FadeUp delay={0}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        border: '1px solid var(--landing-border-strong)',
                        borderRadius: '24px', padding: '6px 16px',
                        fontSize: '0.88rem', color: 'var(--landing-text-secondary)',
                        marginBottom: 40,
                    }}>
                        <span style={{ 
                            background: 'var(--landing-bg-tertiary)', 
                            color: 'var(--landing-text-primary)', 
                            fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px' 
                        }}>NEW</span>
                        Viva Mode — voice oral exams are now live
                    </div>
                </FadeUp>

                <FadeUp delay={0.08}>
                    <h1 style={{
                        fontSize: 'clamp(3rem, 6vw, 4rem)',
                        lineHeight: 1.10,
                        maxWidth: 860,
                        marginBottom: 32,
                    }}>
                        AI that teaches.<br />
                        <span style={{ color: 'var(--landing-text-tertiary)' }}>Not just answers.</span>
                    </h1>
                </FadeUp>

                <FadeUp delay={0.16}>
                    <p style={{
                        fontSize: 'clamp(1rem, 1.25vw, 1.25rem)',
                        color: 'var(--landing-text-secondary)', maxWidth: 540,
                        marginBottom: 48, lineHeight: 1.60,
                    }}>
                        Upload your lectures. Lummina quizzes you, finds your weak spots, and builds a study plan — until you actually know the material.
                    </p>
                </FadeUp>

                <FadeUp delay={0.24}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={onGetStarted}
                            className="landing-btn-primary"
                            style={{ padding: '12px 24px', fontSize: '1.06rem', borderRadius: '12px' }}
                        >
                            Start for free →
                        </motion.button>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={onGetStarted}
                            className="landing-btn-secondary"
                            style={{ padding: '12px 24px', fontSize: '1.06rem', borderRadius: '12px' }}
                        >
                            Explore Content Analyzer
                        </motion.button>
                    </div>
                </FadeUp>

                <FadeUp delay={0.32}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginTop: 80 }}>
                        {[
                            '4 AI agents working for you',
                            'Works with any PDF or slide deck',
                            'No hallucinations — grounded in your files',
                        ].map((item, i) => (
                            <React.Fragment key={item}>
                                {i > 0 && <div style={{ width: 1, height: 24, background: 'var(--landing-border-strong)' }} />}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.94rem', color: 'var(--landing-text-secondary)' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--landing-text-accent)' }} />
                                    {item}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </FadeUp>
            </section>

            {/* ── AGENTS ── */}
            <section className="landing-section" style={{ background: 'var(--landing-bg-secondary)' }}>
                <div style={{ maxWidth: 1080, margin: '0 auto' }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                        gap: 60, alignItems: 'end',
                        paddingBottom: 56, marginBottom: 56,
                        borderBottom: '1px solid var(--landing-border)',
                    }}>
                        <h2 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.25rem)', lineHeight: 1.20 }}>
                            Four agents.<br />One goal: mastery.
                        </h2>
                        <p style={{ fontSize: '1.06rem', color: 'var(--landing-text-secondary)', lineHeight: 1.60 }}>
                            Every phase of learning has a dedicated AI agent — each with a single job, executed precisely. Together they replace the private tutor most students can't afford.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', borderLeft: '1px solid var(--landing-border)', borderTop: '1px solid var(--landing-border)' }}>
                        <AgentCard index="01" icon="📄" title="Content Analyzer" description="Upload any lecture PDF or slide deck. Ask anything. Get answers grounded in your actual course material." tag="knowledge acquisition" />
                        <AgentCard index="02" icon="🧠" title="Quiz Architect" description="Generates fresh questions from your specific lectures every time. Wrong answers get a full logic breakdown." tag="active recall" />
                        <AgentCard index="03" icon="📝" title="Study Guide Architect" description="Tracks every mistake. Builds a personalized one-page cheat sheet focused on your weak spots." tag="remediation" />
                        <AgentCard index="04" icon="🎙️" title="Viva Examiner" description="Voice-to-voice oral exam. The AI professor listens, pushes back on vague answers, and builds confidence." tag="oral validation" />
                    </div>
                </div>
            </section>

            {/* ── PLANS ── */}
            <section className="landing-section">
                <div style={{ maxWidth: 1080, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 64 }}>
                        <p style={{ fontFamily: 'var(--landing-font-sans)', fontSize: '0.88rem', color: 'var(--landing-text-tertiary)', letterSpacing: '0.12px', textTransform: 'uppercase', marginBottom: 16 }}>pricing</p>
                        <h2 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.25rem)', lineHeight: 1.20 }}>Straightforward pricing.</h2>
                        <p style={{ fontSize: '1.06rem', color: 'var(--landing-text-secondary)', marginTop: 16, lineHeight: 1.60 }}>Start free. No credit card required.</p>
                    </div>

                    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <PricingCard
                            title="Free"
                            description="Everything you need to get started."
                            price="$0"
                            period="/ month"
                            features={['Content Analyzer', 'AI-generated quizzes', 'Interactive Viva Mode', 'Deep document research']}
                        />
                        <PricingCard
                            title="Lummina AI Plus"
                            description="More power for serious students."
                            price="$3.99"
                            period="/ month"
                            highlighted
                            features={['Everything in Free', 'Intelligent model access', 'Deep Research mode', '200 monthly AI credits']}
                        />
                        <PricingCard
                            title="Lummina AI Pro"
                            description="The full experience. No limits."
                            price="$19.99"
                            period="/ month"
                            features={['Everything in Plus', 'Highest-tier model access', '1,000 monthly AI credits', 'Priority processing']}
                        />
                    </div>
                </div>
            </section>

            {/* ── CTA BAND ── */}
            <section className="landing-section" style={{ textAlign: 'center', background: 'var(--landing-bg-secondary)' }}>
                <h2 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.25rem)', lineHeight: 1.20, marginBottom: 24 }}>
                    Study smart with Lummina.
                </h2>
                <p style={{ fontSize: '1.25rem', color: 'var(--landing-text-secondary)', marginBottom: 48, lineHeight: 1.60 }}>
                    Join students who stopped re-reading and started actually learning.
                </p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onGetStarted}
                        className="landing-btn-primary"
                        style={{ padding: '12px 24px', fontSize: '1.06rem', borderRadius: '12px' }}
                    >
                        Start for free →
                    </motion.button>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--landing-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                    <span style={{ fontSize: '1.06rem', fontFamily: 'var(--landing-font-serif)', fontWeight: 500 }}>Lummina</span>
                    {['Privacy', 'Terms', 'Docs', 'Contact'].map(link => (
                        <a key={link} href="#" style={{ fontSize: '0.94rem', color: 'var(--landing-text-secondary)', textDecoration: 'none' }}>
                            {link}
                        </a>
                    ))}
                </div>
                <span style={{ fontFamily: 'var(--landing-font-mono)', fontSize: '0.88rem', color: 'var(--landing-text-tertiary)' }}>© 2025 Lummina</span>
            </footer>

        </div>
    );
};

LandingPage.propTypes = {
    onGetStarted: PropTypes.func.isRequired,
};

export default LandingPage;