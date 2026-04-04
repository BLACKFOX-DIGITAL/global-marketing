'use client'
import { useState } from 'react'
import { Zap, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

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
        <div className="auth-page" style={{ background: 'radial-gradient(circle at 50% 50%, #1a1f35 0%, #08090f 100%)' }}>
            <div className="auth-card glass">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #6366f1, #06b6d4)', marginBottom: 20, boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)' }}>
                        <Zap size={30} color="white" fill="white" />
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>Sign In</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Sign in to your account</p>
                </div>

                {error && (
                    <div className="glass" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ShieldAlert size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ fontSize: 14, height: 48, borderRadius: 12 }} />
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                        </div>
                        <div style={{ position: 'relative', marginTop: 10 }}>
                            <input
                                type={showPw ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                style={{ paddingRight: 44, fontSize: 14, height: 48, borderRadius: 12 }}
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary w-full" disabled={loading} style={{ justifyContent: 'center', marginTop: 10, padding: '14px 20px', fontSize: 16, fontWeight: 800, borderRadius: 14, boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)' }}>
                        {loading ? <div className="spinner" /> : <><span>Sign In</span> <ArrowRight size={18} /></>}
                    </button>
                </form>

            </div>
        </div>
    )
}
