import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

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
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        style={{
            padding: '28px 24px',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
            cursor: 'default',
        }}
    >
        <p style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginBottom: 20, letterSpacing: '0.08em' }}>
            AGENT {index} / 04
        </p>
        <div style={{ fontSize: '1.1rem', marginBottom: 14 }}>{icon}</div>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, fontWeight: 300 }}>{description}</p>
        <span style={{
            display: 'inline-block', marginTop: 16,
            fontFamily: 'monospace', fontSize: '0.62rem',
            color: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '3px 8px', borderRadius: 3,
        }}>{tag}</span>
    </motion.div>
);

// ─── Pricing Card ────────────────────────────────────────────────────────────
const PricingCard = ({ title, price, period, description, features, highlighted = false, featIcon = '✓' }) => (
    <div style={{
        flex: 1, minWidth: 280, maxWidth: 340,
        padding: '36px 28px',
        backgroundColor: highlighted ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: highlighted ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
    }}>
        {highlighted && (
            <span style={{
                position: 'absolute', top: 0, right: 24,
                background: '#2563eb', color: '#fff',
                fontSize: '0.6rem', fontWeight: 700,
                padding: '3px 10px', borderRadius: '0 0 5px 5px',
                letterSpacing: '0.06em',
            }}>POPULAR</span>
        )}
        <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 28, lineHeight: 1.5, fontWeight: 300 }}>{description}</p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em', color: highlighted ? '#3b82f6' : '#fff' }}>{price}</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>{period}</span>
        </div>

        <motion.button
            whileHover={{ opacity: 0.88 }}
            whileTap={{ scale: 0.98 }}
            style={{
                width: '100%', padding: '10px 0',
                borderRadius: 5, marginBottom: 28,
                fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', letterSpacing: '-0.01em',
                backgroundColor: highlighted ? '#fff' : 'transparent',
                color: highlighted ? '#000' : 'rgba(255,255,255,0.6)',
                border: highlighted ? 'none' : '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.15s',
            }}>
            Get started
        </motion.button>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {features.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', fontWeight: 300 }}>
                    <span style={{ color: highlighted ? '#3b82f6' : '#10b981', marginTop: 2, flexShrink: 0 }}>{featIcon}</span>
                    {f}
                </li>
            ))}
        </ul>
    </div>
);

// ─── Main Landing Page ───────────────────────────────────────────────────────
const LandingPage = ({ onGetStarted }) => {
    const particlesInit = useCallback(async engine => {
        await loadSlim(engine);
    }, []);

    const LINE = 'rgba(255,255,255,0.06)';
    const MUTED = 'rgba(255,255,255,0.4)';
    const MUTED2 = 'rgba(255,255,255,0.6)';

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            width: '100%', minHeight: '100vh',
            backgroundColor: '#000',
            fontFamily: "'Bricolage Grotesque', 'DM Sans', system-ui, sans-serif",
            color: '#fff',
            overflowX: 'hidden',
        }}>

            {/* ── Particles ── */}
            <Particles
                id="tsparticles"
                init={particlesInit}
                options={{
                    background: { color: { value: 'transparent' } },
                    fpsLimit: 60,
                    particles: {
                        color: { value: ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#9AA0A6'] },
                        move: { enable: true, speed: 0.6, random: true, outModes: { default: 'bounce' } },
                        number: { density: { enable: true, area: 1000 }, value: 160 },
                        opacity: { value: 0.7, random: true, anim: { enable: true, speed: 0.4, opacity_min: 0.15 } },
                        shape: { type: 'circle' },
                        size: { value: { min: 1, max: 2.2 } },
                    },
                    detectRetina: true,
                }}
                style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
            />

            {/* ── NAV ── */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 40px',
                borderBottom: `1px solid ${LINE}`,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(16px)',
            }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Lummina</span>

                <div style={{ display: 'flex', gap: 0 }}>
                    {['Learning Ecosystem', 'Agents', 'For Teachers', 'For Students'].map(link => (
                        <span key={link} style={{
                            color: MUTED2, fontSize: '0.82rem',
                            padding: '0 18px', height: 56,
                            display: 'flex', alignItems: 'center',
                            borderRight: `1px solid ${LINE}`,
                            cursor: 'pointer', transition: 'color 0.15s',
                        }}
                            onMouseEnter={e => e.target.style.color = '#fff'}
                            onMouseLeave={e => e.target.style.color = MUTED2}
                        >{link}</span>
                    ))}
                </div>

                <motion.button
                    whileHover={{ opacity: 0.85 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onGetStarted}
                    style={{
                        background: '#fff', color: '#000',
                        border: 'none', padding: '7px 18px',
                        borderRadius: 6, fontFamily: 'inherit',
                        fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer', letterSpacing: '-0.01em',
                    }}>
                    Sign In →
                </motion.button>
            </nav>

            {/* ── HERO ── */}
            <section style={{
                position: 'relative', zIndex: 1,
                minHeight: '100vh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center',
                padding: '100px 24px 80px',
                borderBottom: `1px solid ${LINE}`,
            }}>
                {/* subtle grid */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
                    backgroundSize: '80px 80px',
                    WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 100%)',
                    maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 100%)',
                }} />

                <FadeUp delay={0}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        border: `1px solid rgba(255,255,255,0.1)`,
                        borderRadius: 4, padding: '5px 12px',
                        fontFamily: 'monospace', fontSize: '0.7rem', color: MUTED2,
                        marginBottom: 40,
                    }}>
                        <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.05em' }}>NEW</span>
                        Viva Mode — voice oral exams are now live
                    </div>
                </FadeUp>

                <FadeUp delay={0.08}>
                    <h1 style={{
                        fontSize: 'clamp(3.2rem, 7vw, 6.5rem)',
                        fontWeight: 800, lineHeight: 0.95,
                        letterSpacing: '-0.04em', maxWidth: 860,
                        marginBottom: 24,
                    }}>
                        AI that teaches.<br />
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>Not just answers.</span>
                    </h1>
                </FadeUp>

                <FadeUp delay={0.16}>
                    <p style={{
                        fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)',
                        color: MUTED2, maxWidth: 440,
                        marginBottom: 36, fontWeight: 300, lineHeight: 1.65,
                    }}>
                        Upload your lectures. Lummina quizzes you, finds your weak spots, and builds a study plan — until you actually know the material.
                    </p>
                </FadeUp>

                <FadeUp delay={0.24}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <motion.button
                            whileHover={{ opacity: 0.88, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={onGetStarted}
                            style={{
                                background: '#fff', color: '#000',
                                border: 'none', padding: '11px 24px',
                                borderRadius: 6, fontFamily: 'inherit',
                                fontSize: '0.9rem', fontWeight: 600,
                                cursor: 'pointer', letterSpacing: '-0.01em',
                            }}>
                            Start for free →
                        </motion.button>
                        <motion.button
                            whileHover={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}
                            onClick={onGetStarted}
                            style={{
                                background: 'transparent', color: MUTED2,
                                border: `1px solid rgba(255,255,255,0.12)`,
                                padding: '11px 24px', borderRadius: 6,
                                fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 400,
                                cursor: 'pointer', letterSpacing: '-0.01em',
                                transition: 'all 0.15s',
                            }}>
                            Explore Content Analyzer
                        </motion.button>
                    </div>
                </FadeUp>

                <FadeUp delay={0.32}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 64 }}>
                        {[
                            '4 AI agents working for you',
                            'Works with any PDF or slide deck',
                            'No hallucinations — grounded in your files',
                        ].map((item, i) => (
                            <React.Fragment key={item}>
                                {i > 0 && <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem', color: MUTED }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                                    {item}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </FadeUp>
            </section>

            {/* ── AGENTS ── */}
            <section style={{ position: 'relative', zIndex: 1, padding: '96px 40px', borderBottom: `1px solid ${LINE}` }}>
                <div style={{ maxWidth: 1080, margin: '0 auto' }}>
                    {/* header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: 40, alignItems: 'end',
                        paddingBottom: 40, marginBottom: 56,
                        borderBottom: `1px solid ${LINE}`,
                    }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                            Four agents.<br />One goal: mastery.
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: MUTED2, fontWeight: 300, lineHeight: 1.7 }}>
                            Every phase of learning has a dedicated AI agent — each with a single job, executed precisely. Together they replace the private tutor most students can't afford.
                        </p>
                    </div>

                    {/* cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: LINE, border: `1px solid ${LINE}` }}>
                        <AgentCard index="01" icon="📄" title="Content Analyzer" description="Upload any lecture PDF or slide deck. Ask anything. Get answers grounded in your actual course material — not the internet." tag="knowledge acquisition" />
                        <AgentCard index="02" icon="🧠" title="Quiz Architect" description="Generates fresh questions from your specific lectures every time. Wrong answers get a full logic breakdown with source references." tag="active recall" />
                        <AgentCard index="03" icon="📝" title="Study Guide Architect" description="Tracks every mistake. Builds a personalized one-page cheat sheet focused on your weak spots — with trap warnings and examples." tag="remediation" />
                        <AgentCard index="04" icon="🎙️" title="Viva Examiner" description="Voice-to-voice oral exam. The AI professor listens, pushes back on vague answers, and builds verbal confidence before the real thing." tag="oral validation" />
                    </div>
                </div>
            </section>

            {/* ── PLANS ── */}
            <section style={{ position: 'relative', zIndex: 1, padding: '96px 40px', borderBottom: `1px solid ${LINE}` }}>
                <div style={{ maxWidth: 1080, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 56 }}>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>// pricing</p>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.04em' }}>Straightforward pricing.</h2>
                        <p style={{ fontSize: '0.9rem', color: MUTED2, marginTop: 12, fontWeight: 300 }}>Start free. No credit card required.</p>
                    </div>

                    <div style={{ display: 'flex', gap: 0, justifyContent: 'center', background: LINE, border: `1px solid ${LINE}` }}>
                        <PricingCard
                            title="Free"
                            description="Everything you need to get started."
                            price="$0"
                            period="/ month"
                            features={['Content Analyzer', 'AI-generated quizzes', 'Interactive Viva Mode', 'Deep document research', 'Fast Lummina models']}
                        />
                        <PricingCard
                            title="Lummina AI Plus"
                            description="More power for serious students."
                            price="$3.99"
                            period="/ month · 2 month offer"
                            highlighted
                            featIcon="+"
                            features={['Everything in Free', 'Intelligent model access', 'Deep Research mode', 'Video study content creation', '200 monthly AI credits']}
                        />
                        <PricingCard
                            title="Lummina AI Pro"
                            description="The full experience. No limits."
                            price="$19.99"
                            period="/ month"
                            features={['Everything in Plus', 'Highest-tier model access', '1,000 monthly AI credits', 'Priority processing', 'Advanced learning analytics']}
                        />
                    </div>
                </div>
            </section>

            {/* ── CTA BAND ── */}
            <section style={{
                position: 'relative', zIndex: 1,
                padding: '96px 40px', textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: `1px solid ${LINE}`,
            }}>
                <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 16 }}>
                    Study smart.<br />Not hard.
                </h2>
                <p style={{ fontSize: '0.9rem', color: MUTED2, fontWeight: 300, marginBottom: 36 }}>
                    Join students who stopped re-reading and started actually learning.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <motion.button
                        whileHover={{ opacity: 0.88 }}
                        onClick={onGetStarted}
                        style={{ background: '#fff', color: '#000', border: 'none', padding: '11px 24px', borderRadius: 6, fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                        Start for free →
                    </motion.button>
                    <motion.button
                        whileHover={{ color: '#fff' }}
                        onClick={onGetStarted}
                        style={{ background: 'transparent', color: MUTED2, border: `1px solid rgba(255,255,255,0.12)`, padding: '11px 24px', borderRadius: 6, fontFamily: 'inherit', fontSize: '0.9rem', cursor: 'pointer', transition: 'color 0.15s' }}>
                        Read the Architecture
                    </motion.button>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ position: 'relative', zIndex: 1, padding: '0 40px', borderTop: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, marginRight: 0 }}>Lummina</span>
                    {['Privacy', 'Terms', 'Docs', 'Contact'].map(link => (
                        <span key={link} style={{ fontSize: '0.75rem', color: MUTED, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', borderLeft: `1px solid ${LINE}`, cursor: 'pointer', marginLeft: 0 }}
                            onMouseEnter={e => e.target.style.color = MUTED2}
                            onMouseLeave={e => e.target.style.color = MUTED}
                        >{link}</span>
                    ))}
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: MUTED }}>© 2025 Lummina</span>
            </footer>

        </div>
    );
};

LandingPage.propTypes = {
    onGetStarted: PropTypes.func.isRequired,
};

export default LandingPage;