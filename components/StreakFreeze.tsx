'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function StreakFreeze() {
    const { data, mutate } = useSWR('/api/gamification/streak-freeze', fetcher, { revalidateOnFocus: false })
    const [usingFreeze, setUsingFreeze] = useState(false)
    const [message, setMessage] = useState('')

    const handleUseFreeze = async () => {
        setUsingFreeze(true)
        try {
            const res = await fetch('/api/gamification/streak-freeze', { method: 'POST' })
            const json = await res.json()
            if (res.ok) {
                setMessage('Streak preserved! 🛡️')
                mutate()
            } else {
                setMessage(json.error || 'Failed to use freeze')
            }
        } catch {
            setMessage('Failed to use freeze')
        } finally {
            setUsingFreeze(false)
            setTimeout(() => setMessage(''), 3000)
        }
    }

    if (!data) return null

    const { available, streakAtRisk, currentStreak } = data

    // If streak is 0, freeze isn't really needed/useful
    if (currentStreak === 0) return null

    return (
        <div style={{
            background: streakAtRisk ? 'rgba(239,68,68,0.15)' : 'var(--bg-card)',
            border: streakAtRisk ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: streakAtRisk ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 30px rgba(239,68,68,0.2)' : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.1)',
            animation: streakAtRisk ? 'streak-risk-pulse 2s infinite' : 'none',
            backdropFilter: 'blur(20px)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: available ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {streakAtRisk ? (
                        <ShieldAlert size={20} color="#ef4444" />
                    ) : available ? (
                        <ShieldCheck size={20} color="#10b981" />
                    ) : (
                        <Shield size={20} color="var(--text-muted)" />
                    )}
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        Streak Freeze {available ? <span style={{ fontSize: 10, background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>Ready</span> : <span style={{ fontSize: 10, background: 'var(--text-muted)', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>Used</span>}
                    </div>
                    <div style={{ fontSize: 11, color: streakAtRisk ? '#ef4444' : 'var(--text-muted)', marginTop: 2 }}>
                        {streakAtRisk 
                            ? 'Your streak is at risk! Use your freeze to save it.' 
                            : available 
                                ? 'Available to protect your streak once a week.' 
                                : 'Will recharge next week.'}
                    </div>
                </div>
            </div>
            
            {available && streakAtRisk && (
                <button 
                    onClick={handleUseFreeze} 
                    disabled={usingFreeze}
                    style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none',
                        background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700,
                        cursor: usingFreeze ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                    }}
                >
                    {usingFreeze ? 'Freezing...' : 'Use Freeze 🛡️'}
                </button>
            )}
            {message && <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{message}</div>}

        </div>
    )
}
