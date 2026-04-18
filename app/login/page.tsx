'use client'
import { useState, useEffect } from 'react'
import { Zap, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const d = await res.json()

            if (!res.ok) {
                setError(d.error || 'Invalid credentials')
                return
            }

            if (d.role === 'Administrator') {
                window.location.href = '/admin/dashboard'
            } else {
                window.location.href = '/dashboard'
            }
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>

            <div className="auth-page" style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a1f35 0%, #08090f 70%)' }}>
                {/* Animated grid background */}
                <div style={{
                    position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
                }}>
                    <div style={{
                        position: 'absolute', inset: '-60px',
                        backgroundImage: `
                            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                        animation: 'auth-grid-scroll 20s linear infinite',
                    }} />
                    {/* Radial fade mask over the grid */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at center, transparent 0%, #08090f 75%)',
                    }} />
                </div>

                {/* Floating orbs */}
                <div style={{
                    position: 'absolute', width: 500, height: 500,
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
                    top: '-10%', right: '-5%', pointerEvents: 'none',
                    animation: 'auth-glow 10s ease-in-out infinite alternate',
                }} />
                <div style={{
                    position: 'absolute', width: 400, height: 400,
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
                    bottom: '-10%', left: '-5%', pointerEvents: 'none',
                    animation: 'auth-glow 10s ease-in-out infinite alternate-reverse',
                }} />
                <div style={{
                    position: 'absolute', width: 300, height: 300,
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)',
                    top: '60%', right: '20%', pointerEvents: 'none',
                    animation: 'login-pulse 6s ease-in-out infinite',
                }} />

                {/* Card */}
                    <div
                    className={mounted ? 'auth-card-enter' : ''}
                    style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 32, padding: '48px 44px',
                        width: '100%', maxWidth: 420,
                        position: 'relative', zIndex: 1,
                        boxShadow: `
                            0 0 0 1px rgba(255, 255, 255, 0.05) inset,
                            0 24px 60px -12px rgba(0, 0, 0, 0.6),
                            0 0 80px -20px rgba(99, 102, 241, 0.15)
                        `,
                        opacity: mounted ? undefined : 0,
                    }}
                >
                    {/* Logo + Brand */}
                    <div style={{ textAlign: 'center', marginBottom: 36 }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 56, height: 56, borderRadius: 16,
                            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                            marginBottom: 20,
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
                        }}>
                            <Zap size={26} color="white" fill="white" />
                        </div>
                        <h1 style={{
                            fontSize: 26, fontWeight: 800, marginBottom: 6,
                            letterSpacing: '-0.5px', lineHeight: 1.2,
                        }}>
                            Welcome back
                        </h1>
                        <p style={{
                            fontSize: 14, color: 'var(--text-muted)', margin: 0,
                            lineHeight: 1.5,
                        }}>
                            Sign in to your Global Marketing account
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="auth-error-shake" style={{
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            background: 'rgba(239, 68, 68, 0.06)',
                            borderRadius: 12, padding: '12px 16px',
                            color: '#f87171', fontSize: 13, marginBottom: 24,
                            display: 'flex', alignItems: 'center', gap: 10,
                            fontWeight: 500,
                        }}>
                            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="form-group auth-field-enter" style={{ animationDelay: '0.15s' }}>
                            <label className="form-label">Email</label>
                            <input
                                id="login-email"
                                className="auth-input"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group auth-field-enter" style={{ animationDelay: '0.25s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                            </div>
                            <div style={{ position: 'relative', marginTop: 10 }}>
                                <input
                                    id="login-password"
                                    className="auth-input"
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    style={{ paddingRight: 44 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="pw-toggle"
                                    style={{
                                        position: 'absolute', right: 14, top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none', border: 'none',
                                        color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
                                    }}
                                >
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="auth-field-enter" style={{ animationDelay: '0.35s' }}>
                            <button
                                id="auth-submit"
                                type="submit"
                                className="btn-primary w-full auth-submit"
                                disabled={loading}
                                style={{
                                    justifyContent: 'center', marginTop: 8,
                                    padding: '14px 20px', fontSize: 15, fontWeight: 700,
                                    borderRadius: 14, height: 50,
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25)',
                                    letterSpacing: '-0.2px',
                                }}
                            >
                                {loading ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight size={18} style={{ marginLeft: 4 }} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer hint */}
                    <div className="auth-field-enter" style={{
                        animationDelay: '0.45s',
                        textAlign: 'center', marginTop: 28,
                        fontSize: 12, color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 8px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            fontSize: 10, fontWeight: 600, letterSpacing: '0.3px',
                            textTransform: 'uppercase',
                        }}>
                            ↵ Enter
                        </span>
                        to sign in
                    </div>
                </div>
            </div>
        </>
    )
}
