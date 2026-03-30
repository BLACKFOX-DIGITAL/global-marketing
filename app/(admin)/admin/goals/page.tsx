'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import {
    Target,
    Users,
    ChevronLeft,
    ChevronRight,
    Save,
    Activity
} from 'lucide-react'
import { format, addMonths, subMonths, parse } from 'date-fns'

interface UserGoal { userId: string; category: string; targetValue: number; period: string; }

const CATEGORIES = [
    { id: 'DEALS', label: 'Closed Deals', icon: Target, color: 'var(--accent-emerald)' },
    { id: 'TEST_JOBS', label: 'New Test Jobs', icon: Activity, color: 'var(--accent-primary)' }
]

export default function GoalsPage() {
    const [loading, setLoading] = useState(true)
    const [goals, setGoals] = useState<UserGoal[]>([])
    const [goalUsers, setGoalUsers] = useState<{ id: string, name: string, role: string }[]>([])
    const [goalPeriod, setGoalPeriod] = useState(format(new Date(), 'yyyy-MM'))
    const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({})

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/goals?period=${goalPeriod}`)
            if (res.ok) {
                const d = await res.json()
                setGoalUsers(d.users || [])
                setGoals(d.goals || [])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [goalPeriod])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleGoalSave = async (userId: string, category: string) => {
        const key = `${userId}_${category}`
        const targetValue = pendingChanges[key]
        if (targetValue === undefined) return
        
        try {
            const res = await fetch('/api/admin/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, category, targetValue, period: goalPeriod })
            })
            if (res.ok) {
                const newChanges = { ...pendingChanges }
                delete newChanges[key]
                setPendingChanges(newChanges)
                fetchData()
            }
        } catch (err) {
            console.error('Failed to save goal', err)
        }
    }

    const adjustGoalPeriod = (dir: number) => {
        const date = parse(goalPeriod, 'yyyy-MM', new Date())
        const nextDate = dir > 0 ? addMonths(date, 1) : subMonths(date, 1)
        setGoalPeriod(format(nextDate, 'yyyy-MM'))
        setPendingChanges({})
    }

    return (
        <div style={{ padding: '20px 32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Target size={24} color="var(--accent-primary)" /> Sales Goals
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>Strategic monthly objectives and performance tracking.</p>
                </div>
                
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <button onClick={() => adjustGoalPeriod(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}><ChevronLeft size={16} /></button>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', minWidth: 120, textAlign: 'center', letterSpacing: '0.2px' }}>{format(parse(goalPeriod, 'yyyy-MM', new Date()), 'MMMM yyyy')}</div>
                    <button onClick={() => adjustGoalPeriod(1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}><ChevronRight size={16} /></button>
                </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                        <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            <th style={{ padding: '12px 24px', fontWeight: 700 }}>Sales Professional</th>
                            {CATEGORIES.map(cat => (
                                <th key={cat.id} style={{ padding: '12px 24px', fontWeight: 700, textAlign: 'center' }}>{cat.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={CATEGORIES.length + 1} style={{ textAlign: 'center', padding: 60 }}>
                                    <div className="spinner" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : goalUsers.length === 0 ? (
                            <tr>
                                <td colSpan={CATEGORIES.length + 1} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                                    No sales representatives found.
                                </td>
                            </tr>
                        ) : goalUsers.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '10px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                            {user.name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{user.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{user.role}</div>
                                        </div>
                                    </div>
                                </td>
                                {CATEGORIES.map(cat => {
                                    const goal = goals.find(g => g.userId === user.id && g.category === cat.id)
                                    const key = `${user.id}_${cat.id}`
                                    const val = pendingChanges[key] !== undefined ? pendingChanges[key] : (goal?.targetValue || 0)
                                    const changed = pendingChanges[key] !== undefined

                                    return (
                                        <td key={cat.id} style={{ padding: '10px 24px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                <input
                                                    type="number"
                                                    value={val}
                                                    onChange={e => setPendingChanges(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                                                    style={{
                                                        width: 70, padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: changed ? `1px solid ${cat.color}` : '1px solid var(--border)',
                                                        textAlign: 'center', color: 'var(--text-primary)', fontWeight: 700, outline: 'none', fontSize: 13,
                                                        transition: 'all 0.2s', boxShadow: changed ? `0 0 0 2px ${cat.color}20` : 'none'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleGoalSave(user.id, cat.id)}
                                                    disabled={!changed}
                                                    style={{ 
                                                        width: 28, height: 28, borderRadius: 8, border: 'none', 
                                                        background: changed ? cat.color : 'rgba(255,255,255,0.05)', 
                                                        color: changed ? '#fff' : 'var(--text-muted)', 
                                                        cursor: changed ? 'pointer' : 'not-allowed',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Save size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    )
}
