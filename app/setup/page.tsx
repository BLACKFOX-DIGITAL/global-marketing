'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Server, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

function SetupForm() {
    const router = useRouter()
    
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [setupNeeded, setSetupNeeded] = useState(true)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)
    
    // Form state
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    useEffect(() => { setMounted(true) }, [])

    // Check if setup is needed
    useEffect(() => {
        const checkSetupStatus = async () => {
            try {
                const res = await fetch('/api/setup-admin')
                const data = await res.json()
                
                if (data.setupNeeded === false) {
                    setSetupNeeded(false)
                }
            } catch (err) {
                console.error('Failed to check setup status:', err)
            } finally {
                setIsLoading(false)
            }
        }
        
        checkSetupStatus()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        
        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setIsSubmitting(true)
        
        try {
            const res = await fetch('/api/setup-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            })
            
            const data = await res.json()
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create admin account')
            }
            
            // Redirect to login after successful creation
            router.push('/login?setup=success')
            
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="auth-page" style={{ flexDirection: 'column', gap: 16, background: 'radial-gradient(ellipse at 50% 0%, #1a1f35 0%, #08090f 70%)' }}>
                <div className="spinner" style={{ width: 40, height: 40, borderColor: 'rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--accent-primary)' }} />
                <p style={{ color: 'var(--text-muted)', fontWeight: 500, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>Checking system status...</p>
            </div>
        )
    }

    if (!setupNeeded) {
        return (
            <div className="auth-page" style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a1f35 0%, #08090f 70%)' }}>
                <div style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    borderRadius: 24, padding: '48px 44px',
                    width: '100%', maxWidth: 460,
                    textAlign: 'center',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 24px 48px -12px rgba(0,0,0,0.5)',
                }}>
                    <div style={{
                        width: 72, height: 72,
                        background: 'rgba(16, 185, 129, 0.12)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        boxShadow: '0 0 40px rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                    }}>
                        <CheckCircle2 size={36} color="#10b981" />
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.5px' }}>Setup Complete</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6, fontSize: 14 }}>
                        The initial system setup has already been completed. An administrator account exists.
                    </p>
                    <button 
                        onClick={() => router.push('/login')}
                        className="btn-primary"
                        style={{
                            width: '100%', padding: '14px', fontSize: 15, fontWeight: 700,
                            borderRadius: 14, height: 50,
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25)',
                        }}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>

            <div className="auth-page" style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a1f35 0%, #08090f 70%)' }}>
                {/* Floating orbs */}
                <div style={{
                    position: 'absolute', width: 500, height: 500,
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                    top: '-10%', right: '-5%', pointerEvents: 'none',
                    animation: 'auth-glow 10s ease-in-out infinite alternate',
                }} />
                <div style={{
                    position: 'absolute', width: 400, height: 400,
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
                    bottom: '-10%', left: '-5%', pointerEvents: 'none',
                    animation: 'auth-glow 10s ease-in-out infinite alternate-reverse',
                }} />

                <div
                    className={mounted ? 'auth-card-enter' : ''}
                    style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(99, 102, 241, 0.1)',
                        borderRadius: 24, padding: '48px 44px',
                        width: '100%', maxWidth: 540,
                        position: 'relative', zIndex: 1,
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 24px 48px -12px rgba(0,0,0,0.5), 0 0 80px -20px rgba(99,102,241,0.12)',
                        opacity: mounted ? undefined : 0,
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: 36 }}>
                        <div style={{
                            display: 'inline-flex', padding: 14,
                            background: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: 18, marginBottom: 20,
                            border: '1px solid rgba(99, 102, 241, 0.15)',
                            boxShadow: '0 0 30px rgba(99,102,241,0.08)',
                        }}>
                            <Server size={28} color="var(--accent-primary)" />
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.5px' }}>
                            System Installation
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
                            Create the primary administrator account as part of the initial CRM setup.
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            marginBottom: 24, padding: '14px 16px',
                            background: 'rgba(239, 68, 68, 0.06)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12,
                        }}>
                            <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                            <p style={{ color: '#f87171', fontSize: 13, fontWeight: 500, margin: 0 }}>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="form-group auth-field-enter" style={{ animationDelay: '0.15s' }}>
                            <label className="form-label">Administrator Name</label>
                            <input 
                                className="auth-input"
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. System Admin"
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        <div className="form-group auth-field-enter" style={{ animationDelay: '0.25s' }}>
                            <label className="form-label">Email Address</label>
                            <input 
                                className="auth-input"
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@yourcompany.com"
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        <div className="auth-field-enter" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, animationDelay: '0.35s' }}>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input 
                                    className="auth-input"
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 8 characters"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input 
                                    className="auth-input"
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat password"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="auth-field-enter" style={{ animationDelay: '0.45s', marginTop: 8, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-primary auth-submit"
                                style={{
                                    width: '100%', padding: '14px', fontSize: 15, fontWeight: 700,
                                    gap: 10, borderRadius: 14, height: 50,
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25)',
                                }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <Shield size={18} />
                                        Initialize System & Create Admin
                                    </>
                                )}
                            </button>
                            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 16, opacity: 0.7 }}>
                                This action is irreversible via the web interface. Write down these credentials.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

export default function SetupPage() {
    return (
        <Suspense fallback={<div className="auth-page" style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a1f35 0%, #08090f 70%)' }}><div className="spinner" /></div>}>
            <SetupForm />
        </Suspense>
    )
}
