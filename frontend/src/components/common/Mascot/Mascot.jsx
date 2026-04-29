import React from 'react';

/**
 * LumminaMascot — the purple robot mascot for the chat input bar.
 *
 * Props:
 * size        {number}  — rendered size in px (default 64)
 * isFocused   {bool}    — input is focused  → excited/attention animation
 * trickNumber {number}  — 0 (none), 1 (wave)
 * className   {string}  — extra class names
 * style       {object}  — extra inline styles
 */
const LumminaMascot = ({
    size = 64,
    isFocused = false,
    trickNumber = 0,
    className = '',
    style = {},
}) => {
    // State logic: trick 1 overrides, then focused, else idle
    const state = trickNumber === 1
        ? 'trick1'
        : isFocused
            ? 'focused'
            : 'idle';

    return (
        <>
            <style>{`
                /* ── Mascot wrapper ── */
                .lm-mascot-wrap {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    user-select: none;
                    pointer-events: none;
                    transform-origin: center bottom;
                }

                /* ── Base Body Animations ── */
                @keyframes lm-pulse {
                    0%, 100% { transform: translateY(0px) scale(1); }
                    30%      { transform: translateY(-2px) scale(1.06); }
                    60%      { transform: translateY(0px) scale(0.97); }
                }

                /* ── Eye blink ── */
                @keyframes lm-blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95%           { transform: scaleY(0.1); }
                }

                /* ── State-driven body animation ── */
                /* Idle state has no body animation, it only blinks */
                .lm-body[data-state='idle'] {
                    transform: translateY(0px);
                }
                .lm-body[data-state='focused'] {
                    animation: lm-pulse 1.4s ease-in-out infinite;
                }

                /* ── Eye blink logic ── */
                .lm-eyes {
                    animation: lm-blink 4s ease-in-out infinite;
                    transform-origin: 50% 51.5px; 
                }

                /* =========================================
                   🐙 TENTACLE TRICK 1: THE WAVE
                   ========================================= */

                .t1 { transform-origin: 25.5px 65px; }
                .t2 { transform-origin: 41.5px 65px; }
                .t3 { transform-origin: 58.5px 65px; }
                .t4 { transform-origin: 74.5px 65px; }

                @keyframes lm-wave {
                    0%, 100% { transform: rotate(0deg); }
                    25%      { transform: rotate(25deg); }
                    75%      { transform: rotate(-25deg); }
                }
                .lm-body[data-state='trick1'] .lm-tentacle {
                    animation: lm-wave 0.8s ease-in-out infinite;
                }
                .lm-body[data-state='trick1'] .t1 { animation-delay: 0.0s; }
                .lm-body[data-state='trick1'] .t2 { animation-delay: 0.1s; }
                .lm-body[data-state='trick1'] .t3 { animation-delay: 0.2s; }
                .lm-body[data-state='trick1'] .t4 { animation-delay: 0.3s; }
                
            `}</style>

            <div
                className={`lm-mascot-wrap ${className}`}
                style={{ width: size, height: size, position: 'relative', ...style }}
            >
                <div
                    className="lm-body"
                    data-state={state}
                    style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
                >
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ width: '100%', height: '100%', overflow: 'visible' }}
                    >
                        {/* ── Tentacles (Split from main body for animation) ── */}
                        <g fill="#5F5DB6">
                            <rect className="lm-tentacle t1" x="20" y="60" width="11" height="26" rx="5.5" />
                            <rect className="lm-tentacle t2" x="36" y="60" width="11" height="26" rx="5.5" />
                            <rect className="lm-tentacle t3" x="53" y="60" width="11" height="26" rx="5.5" />
                            <rect className="lm-tentacle t4" x="69" y="60" width="11" height="26" rx="5.5" />
                        </g>

                        {/* ── Main head ── */}
                        <path
                            fill="#5F5DB6"
                            d="M 28,20
                               L 72,20
                               C 77,20 80,23 80,28
                               L 80,68
                               L 20,68
                               L 20,28
                               C 20,23 23,20 28,20
                               Z"
                        />

                        {/* ── Eyes ── */}
                        <g className="lm-eyes">
                            <path
                                fill="#2D364A"
                                d="M 28,45 L 34,45 C 35,45 36,46 36,47 L 36,56 C 36,57 35,58 34,58 L 28,58 C 27,58 26,57 26,56 L 26,47 C 26,46 27,45 28,45 Z"
                            />
                            <path
                                fill="#2D364A"
                                d="M 66,45 L 72,45 C 73,45 74,46 74,47 L 74,56 C 74,57 73,58 72,58 L 66,58 C 65,58 64,57 64,56 L 64,47 C 64,46 65,45 66,45 Z"
                            />
                        </g>
                    </svg>
                </div>
            </div>
        </>
    );
};

export default LumminaMascot;