'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, User, Mail, Lock, ArrowRight, ShieldAlert } from 'lucide-react'

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const d = await res.json()
                setError(d.error || 'Registration failed')
                return
            }
            window.location.href = '/dashboard'
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
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                    <div style={{
                        position: 'absolute', inset: '-60px',
                        backgroundImage: `
                            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                        animation: 'auth-grid-scroll 20s linear infinite',
                    }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 0%, #08090f 75%)' }} />
                </div>

                {/* Floating orbs */}
                <div style={{
                    position: 'absolute', width: 500, height: 500,
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
                    top: '-10%', left: '-5%', pointerEvents: 'none',
                    animation: 'auth-glow 10s ease-in-out infinite alternate',
                }} />
                <div style={{
                    position: 'absolute', width: 400, height: 400,
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                    bottom: '-10%', right: '-5%', pointerEvents: 'none',
                    animation: 'auth-glow 10s ease-in-out infinite alternate-reverse',
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
                            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                            marginBottom: 20,
                            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
                        }}>
                            <Zap size={26} color="white" fill="white" />
                        </div>
                        <h1 style={{
                            fontSize: 26, fontWeight: 800, marginBottom: 6,
                            letterSpacing: '-0.5px', lineHeight: 1.2,
                        }}>
                            Create your account
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                            Get started with Global Marketing today
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="auth-error-shake" style={{
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            background: 'rgba(239, 68, 68, 0.06)',
                            borderRadius: 12, padding: '12px 16px',
                            color: '#f87171', fontSize: 13, marginBottom: 24,
                            display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500,
                        }}>
                            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="form-group auth-field-enter" style={{ animationDelay: '0.15s' }}>
                            <label className="form-label">Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input
                                    id="register-name"
                                    className="auth-input"
                                    type="text"
                                    placeholder="John Smith"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    required
                                    autoFocus
                                    style={{ paddingLeft: 40 }}
                                />
                            </div>
                        </div>

                        <div className="form-group auth-field-enter" style={{ animationDelay: '0.25s' }}>
                            <label className="form-label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input
                                    id="register-email"
                                    className="auth-input"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    required
                                    autoComplete="email"
                                    style={{ paddingLeft: 40 }}
                                />
                            </div>
                        </div>

                        <div className="form-group auth-field-enter" style={{ animationDelay: '0.35s' }}>
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input
                                    id="register-password"
                                    className="auth-input"
                                    type="password"
                                    placeholder="At least 6 characters"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    style={{ paddingLeft: 40 }}
                                />
                            </div>
                        </div>

                        <div className="auth-field-enter" style={{ animationDelay: '0.45s' }}>
                            <button
                                id="register-submit"
                                type="submit"
                                className="btn-primary w-full auth-submit"
                                disabled={loading}
                                style={{
                                    justifyContent: 'center', marginTop: 8,
                                    padding: '14px 20px', fontSize: 15, fontWeight: 700,
                                    borderRadius: 14, height: 50,
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)',
                                    letterSpacing: '-0.2px',
                                }}
                            >
                                {loading ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <span>Create Account</span>
                                        <ArrowRight size={18} style={{ marginLeft: 4 }} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="auth-field-enter" style={{ animationDelay: '0.55s' }}>
                        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--text-muted)' }}>
                            Already have an account?{' '}
                            <Link href="/login" style={{
                                color: '#6366f1', fontWeight: 600,
                                textDecoration: 'none',
                                borderBottom: '1px solid rgba(99,102,241,0.3)',
                                paddingBottom: 1,
                                transition: 'border-color 0.2s',
                            }}>
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
