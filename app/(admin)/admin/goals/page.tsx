'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Target,
    Users,
    ChevronLeft,
    ChevronRight,
    Save,
    Activity,
    Trophy,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    X
} from 'lucide-react'
import { format, addMonths, subMonths, parse } from 'date-fns'

interface UserGoal { userId: string; category: string; targetValue: number; period: string; }

const CATEGORIES = [
    { id: 'DEALS', label: 'Closed Deals', icon: Target, color: '#10b981' },
    { id: 'TEST_JOBS', label: 'New Test Jobs', icon: Activity, color: '#3b82f6' }
]

export default function GoalsPage() {
    const [loading, setLoading] = useState(true)
    const [goals, setGoals] = useState<UserGoal[]>([])
    const [goalUsers, setGoalUsers] = useState<{ id: string, name: string, role: string }[]>([])
    const [goalPeriod, setGoalPeriod] = useState(format(new Date(), 'yyyy-MM'))
    const [actuals, setActuals] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({})
    const [saving, setSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/goals?period=${goalPeriod}`)
            if (res.ok) {
                const d = await res.json()
                setGoalUsers(d.users || [])
                setGoals(d.goals || [])
                setActuals(d.actuals || [])
                setStats(d.stats || null)
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

    const handleSaveAll = async () => {
        if (Object.keys(pendingChanges).length === 0) return
        setSaving(true)
        const bulk = Object.entries(pendingChanges).map(([key, val]) => {
            const [userId, category] = key.split('_')
            return { userId, category, targetValue: val, period: goalPeriod }
        })

        try {
            const res = await fetch('/api/admin/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bulk })
            })
            if (res.ok) {
                setPendingChanges({})
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 3000)
                fetchData()
            }
        } catch (err) {
            console.error('Failed to save goals', err)
        } finally {
            setSaving(false)
        }
    }

    const adjustGoalPeriod = (dir: number) => {
        const date = parse(goalPeriod, 'yyyy-MM', new Date())
        const nextDate = dir > 0 ? addMonths(date, 1) : subMonths(date, 1)
        setGoalPeriod(format(nextDate, 'yyyy-MM'))
        setPendingChanges({})
    }

    const totals = useMemo(() => {
        return CATEGORIES.reduce((acc, cat) => {
            acc[cat.id] = goalUsers.reduce((sum, user) => {
                const key = `${user.id}_${cat.id}`
                const goal = goals.find(g => g.userId === user.id && g.category === cat.id)
                const val = pendingChanges[key] !== undefined ? pendingChanges[key] : (goal?.targetValue || 0)
                return sum + val
            }, 0)
            return acc
        }, {} as Record<string, number>)
    }, [goals, goalUsers, pendingChanges])

    const hasChanges = Object.keys(pendingChanges).length > 0

    return (
        <div style={{ padding: '16px 24px', maxWidth: 1200, margin: '0 auto', width: '100%', minHeight: '100vh', background: 'radial-gradient(circle at top right, #0f172a 0%, #020617 100%)' }}>
            
            {/* COMPACT HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: 7, borderRadius: 10, color: '#fff', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                        <Target size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', margin: 0, color: '#f8fafc' }}>Team Performance Goals</h1>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => adjustGoalPeriod(-1)} className="nav-btn"><ChevronLeft size={14} /></button>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', minWidth: 100, textAlign: 'center' }}>{format(parse(goalPeriod, 'yyyy-MM', new Date()), 'MMM yyyy')}</div>
                        <button onClick={() => adjustGoalPeriod(1)} className="nav-btn"><ChevronRight size={14} /></button>
                    </div>

                    <button 
                        onClick={handleSaveAll}
                        disabled={!hasChanges || saving}
                        style={{
                            background: hasChanges ? 'linear-gradient(to bottom, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.03)',
                            color: hasChanges ? '#fff' : '#475569',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: hasChanges ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', gap: 8,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: hasChanges ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                        }}
                    >
                        {saving ? <div className="mini-spin" /> : <Save size={14} />}
                        Save Changes
                        {hasChanges && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{Object.keys(pendingChanges).length}</span>}
                    </button>
                    
                    {hasChanges && (
                        <button onClick={() => setPendingChanges({})} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }} title="Discard Changes">
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* CONDENSED STATS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
                {CATEGORIES.map(cat => (
                    <div key={cat.id} style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: '16px 20px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', marginBottom: 4 }}>TOTAL {cat.label.toUpperCase()}</div>
                                <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    {stats?.totalActuals?.[cat.id] || 0}
                                    <span style={{ fontSize: 11, color: (stats?.comparisons?.[cat.id] || 0) >= 0 ? '#10b981' : '#f43f5e', fontWeight: 700 }}>
                                        {(stats?.comparisons?.[cat.id] || 0) >= 0 ? '+' : ''}{stats?.comparisons?.[cat.id]?.toFixed(1) || 0}% vs LY
                                    </span>
                                </div>
                            </div>
                            <div style={{ background: `${cat.color}15`, padding: 8, borderRadius: 10, color: cat.color }}>
                                <cat.icon size={16} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div style={{ marginTop: 12, height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${Math.min(((stats?.totalActuals?.[cat.id] || 0) / (totals[cat.id] || 1)) * 100, 100)}%`, 
                                height: '100%', 
                                background: `linear-gradient(90deg, ${cat.color}, ${cat.color}80)`, 
                                borderRadius: 2,
                                transition: 'width 1s ease-out'
                            }} />
                        </div>
                    </div>
                ))}
                
                {/* SYSTEM METADATA CARD */}
                <div style={{ background: 'rgba(30, 41, 59, 0.2)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 4 }}>WIN RATE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{stats?.winRate?.toFixed(1) || 0}%</div>
                        <div style={{ display: 'flex', gap: 2 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} style={{ 
                                    width: 3, 
                                    height: 10, 
                                    borderRadius: 1, 
                                    background: (i + 1) * 20 <= (stats?.winRate || 0) ? '#10b981' : '#1e293b' 
                                }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* COMPACT TABLE */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <tr style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <th style={{ padding: '14px 24px', fontWeight: 900 }}>Sales Representative</th>
                            {CATEGORIES.map(cat => (
                                <th key={cat.id} style={{ padding: '14px 24px', fontWeight: 900 }}>{cat.label} Tracking</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} style={{ padding: 60, textAlign: 'center' }}><div className="mini-spin" style={{ margin: '0 auto', width: 24, height: 24 }} /></td></tr>
                        ) : goalUsers.map(user => (
                            <tr key={user.id} className="row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '12px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 11, fontWeight: 900 }}>
                                            {user.name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 13, color: '#f1f5f9' }}>{user.name}</div>
                                            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{user.role}</div>
                                        </div>
                                    </div>
                                </td>
                                {CATEGORIES.map(cat => {
                                    const goal = goals.find(g => g.userId === user.id && g.category === cat.id)
                                    const actual = actuals.find(a => a.userId === user.id)?.[cat.id] || 0
                                    const key = `${user.id}_${cat.id}`
                                    const targetVal = pendingChanges[key] !== undefined ? pendingChanges[key] : (goal?.targetValue || 0)
                                    const changed = pendingChanges[key] !== undefined
                                    const perc = targetVal > 0 ? Math.min((actual/targetVal)*100, 100) : 0

                                    return (
                                        <td key={cat.id} style={{ padding: '12px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        value={targetVal}
                                                        onChange={e => setPendingChanges(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                                                        className="compact-input"
                                                        style={{ borderColor: changed ? cat.color : 'rgba(255,255,255,0.1)', boxShadow: changed ? `0 0 10px ${cat.color}20` : 'none' }}
                                                    />
                                                    {changed && <div style={{ position: 'absolute', top: -3, right: -3, background: cat.color, width: 8, height: 8, borderRadius: '50%', border: '2px solid #020617' }} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, marginBottom: 4 }}>
                                                        <span style={{ color: '#475569' }}>ACHIEVED</span>
                                                        <span style={{ color: cat.color, fontVariantNumeric: 'tabular-nums' }}>{actual} / {targetVal}</span>
                                                    </div>
                                                    <div style={{ height: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 1, overflow: 'hidden' }}>
                                                        <div style={{ width: `${perc}%`, height: '100%', background: cat.color, transition: 'width 0.8s ease-out' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MINI METHODOLOGY FOOTER */}
            <div style={{ marginTop: 20, display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
                <div className="mini-card"><Trophy size={14} color="#f59e0b" /> <span>Targets influence quarterly tier bonuses</span></div>
            </div>

            <style jsx global>{`
                .nav-btn { background: transparent; border: none; color: #64748b; cursor: pointer; display: flex; padding: 4px; border-radius: 6px; transition: all 0.2s; }
                .nav-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
                .row-hover:hover { background: rgba(255,255,255,0.015); }
                .compact-input {
                    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; width: 60px; padding: 6px;
                    color: #fff; font-size: 13px; font-weight: 900; text-align: center; outline: none; transition: all 0.2s;
                }
                .compact-input:focus { border-color: #3b82f6; background: rgba(0,0,0,0.6); }
                .mini-card {
                    background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255,255,255,0.03); border-radius: 10px; padding: 8px 12px;
                    display: flex; alignItems: center; gap: 10px; color: #94a3b8; font-size: 11px; font-weight: 700; white-space: nowrap;
                }
                .mini-spin {
                    width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%;
                    border-top-color: #fff; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
