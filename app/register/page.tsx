'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

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
        <div className="auth-page">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                        <div className="sidebar-logo-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
                            <Zap size={22} color="white" fill="white" />
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 700 }}>Global Marketing</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Create your account</h2>
                    <p className="text-secondary" style={{ fontSize: 13 }}>Get started with Global Marketing today</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input type="text" placeholder="John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" placeholder="At least 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
                    </div>

                    <button type="submit" className="btn-primary w-full" disabled={loading} style={{ justifyContent: 'center', marginTop: 4 }}>
                        {loading ? <div className="spinner" /> : 'Create Account'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link href="/login" style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>Sign in</Link>
                </p>
            </div>
        </div>
    )
}
