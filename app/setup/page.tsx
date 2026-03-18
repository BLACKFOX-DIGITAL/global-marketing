'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Server, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

// Wrap checking part in a separate component to allow Suspense
function SetupForm() {
    const router = useRouter()
    
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [setupNeeded, setSetupNeeded] = useState(true)
    const [error, setError] = useState('')
    
    // Form state
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

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
            <div className="auth-page" style={{ flexDirection: 'column', gap: 16 }}>
                <div className="spinner" style={{ width: 40, height: 40, borderColor: 'rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--accent-primary)' }} />
                <p style={{ color: 'var(--text-muted)', fontWeight: 500, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>Checking system status...</p>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }`}</style>
            </div>
        )
    }

    if (!setupNeeded) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center', maxWidth: 460 }}>
                    <div style={{ width: 80, height: 80, background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(16, 185, 129, 0.1)' }}>
                        <CheckCircle2 size={40} color="#10b981" />
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Setup Complete</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
                        The initial system setup has already been completed. An administrator account exists.
                    </p>
                    <button 
                        onClick={() => router.push('/login')}
                        className="btn-primary"
                        style={{ width: '100%', padding: '14px', fontSize: 16 }}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: 540, animation: 'slideUp 0.5s ease-out forwards' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ display: 'inline-flex', padding: 16, background: 'rgba(99, 102, 241, 0.1)', borderRadius: 20, marginBottom: 20, border: '1px solid rgba(99, 102, 241, 0.2)', boxShadow: '0 0 30px rgba(99,102,241,0.1)' }}>
                        <Server size={32} color="var(--accent-primary)" />
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.5px' }}>System Installation</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Create the primary administrator account as part of the initial CRM setup.</p>
                </div>

                {error && (
                    <div style={{ marginBottom: 24, padding: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 500, margin: 0 }}>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="form-group">
                        <label className="form-label">Administrator Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. System Admin"
                            required
                            disabled={isSubmitting}
                            style={{ padding: '12px 16px', fontSize: 15 }}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@yourcompany.com"
                            required
                            disabled={isSubmitting}
                            style={{ padding: '12px 16px', fontSize: 15 }}
                        />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min 8 characters"
                                required
                                disabled={isSubmitting}
                                style={{ padding: '12px 16px', fontSize: 15 }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat password"
                                required
                                disabled={isSubmitting}
                                style={{ padding: '12px 16px', fontSize: 15 }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary"
                            style={{ width: '100%', padding: '16px', fontSize: 16, gap: 12, position: 'relative', overflow: 'hidden' }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="spinner" style={{ borderTopColor: 'transparent', borderRightColor: 'white', borderBottomColor: 'transparent', borderLeftColor: 'white', borderWidth: 2 }} />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    <Shield size={20} />
                                    Initialize System & Create Admin
                                </>
                            )}
                        </button>
                        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
                            This action is irreversible via the web interface. Write down these credentials.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function SetupPage() {
    return (
        <Suspense fallback={<div className="auth-page"><div className="spinner" /></div>}>
            <SetupForm />
        </Suspense>
    )
}
