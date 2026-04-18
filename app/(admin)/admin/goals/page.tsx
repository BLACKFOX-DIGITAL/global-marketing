'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Target, ChevronLeft, ChevronRight, Save, Activity,
    Trophy, TrendingUp, TrendingDown, CheckCircle2, X,
    BarChart3, Search, Users
} from 'lucide-react'
import { format, addMonths, subMonths, parse } from 'date-fns'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts'

interface UserGoal { userId: string; category: string; targetValue: number; period: string }

const CATEGORIES = [
    { id: 'DEALS', label: 'Closed Deals', icon: Target, color: '#10b981' },
    { id: 'TEST_JOBS', label: 'New Test Jobs', icon: Activity, color: '#3b82f6' }
]

function KpiCard({ label, value, sub, icon: Icon, color, highlight = false }: {
    label: string; value: string | number; sub: string
    icon: React.ElementType; color: string; highlight?: boolean
}) {
    return (
        <div style={{
            padding: '20px 24px', borderRadius: 20,
            background: highlight ? `${color}12` : 'rgba(30,41,59,0.45)',
            border: `1px solid ${highlight ? color + '30' : 'rgba(255,255,255,0.06)'}`,
            backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', gap: 8,
            boxShadow: highlight ? `inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 30px ${color}18` : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.1)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} strokeWidth={2.5} />
                </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: highlight ? color : '#f8fafc', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>{sub}</div>
        </div>
    )
}

function GoalBadge({ actual, target }: { actual: number; target: number }) {
    const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
    const color = pct >= 90 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 900, color, minWidth: 34 }}>{Math.round(pct)}%</span>
        </div>
    )
}

export default function GoalsPage() {
    const [loading, setLoading] = useState(true)
    const [goals, setGoals] = useState<UserGoal[]>([])
    const [goalUsers, setGoalUsers] = useState<{ id: string; name: string; role: string }[]>([])
    const [goalPeriod, setGoalPeriod] = useState(format(new Date(), 'yyyy-MM'))
    const [actuals, setActuals] = useState<any[]>([])
    const [trendData, setTrendData] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({})
    const [saving, setSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [chartMode, setChartMode] = useState<'DEALS' | 'TEST_JOBS'>('DEALS')

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/goals?period=${goalPeriod}`)
            if (res.ok) {
                const d = await res.json()
                setGoalUsers(d.users || [])
                setGoals(d.goals || [])
                setActuals(d.actuals || [])
                setTrendData(d.trendData || [])
                setStats(d.stats || null)
            } else {
                setError('Failed to load goals data')
            }
        } catch {
            setError('Failed to load goals data')
        } finally {
            setLoading(false)
        }
    }, [goalPeriod])

    useEffect(() => { fetchData() }, [fetchData])

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
        } catch {
            setError('Failed to save goals')
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

    const filteredUsers = useMemo(() =>
        goalUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase())),
        [goalUsers, search]
    )

    // Compute overall team achievement %
    const teamAchievement = useMemo(() => {
        const totalTarget = CATEGORIES.reduce((s, c) => s + (totals[c.id] || 0), 0)
        const totalActual = CATEGORIES.reduce((s, c) => s + (stats?.totalActuals?.[c.id] || 0), 0)
        return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0
    }, [totals, stats])

    const activeCat = CATEGORIES.find(c => c.id === chartMode)!

    return (
        <div style={{ padding: '14px 20px', maxWidth: 1400, margin: '0 auto', width: '100%', minHeight: '100vh' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: 7, borderRadius: 10, color: '#fff', boxShadow: '0 0 18px rgba(59,130,246,0.25)' }}>
                        <Target size={17} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.4px', margin: 0, color: '#f8fafc' }}>Team Performance Goals</h1>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Set and track monthly targets per rep</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Period nav */}
                    <div style={{ background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => adjustGoalPeriod(-1)} className="nav-btn"><ChevronLeft size={13} /></button>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9', minWidth: 90, textAlign: 'center' }}>
                            {format(parse(goalPeriod, 'yyyy-MM', new Date()), 'MMM yyyy')}
                        </div>
                        <button onClick={() => adjustGoalPeriod(1)} className="nav-btn"><ChevronRight size={13} /></button>
                    </div>

                    {hasChanges && (
                        <button onClick={() => setPendingChanges({})} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }} title="Discard">
                            <X size={17} />
                        </button>
                    )}

                    <button
                        onClick={handleSaveAll}
                        disabled={!hasChanges || saving}
                        style={{
                            background: hasChanges ? 'linear-gradient(to bottom, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.03)',
                            color: hasChanges ? '#fff' : '#475569',
                            border: 'none', padding: '7px 14px', borderRadius: 8, fontWeight: 800, fontSize: 11,
                            cursor: hasChanges ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: hasChanges ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                        }}
                    >
                        {saving ? <div className="mini-spin" /> : <Save size={13} />}
                        Save Changes
                        {hasChanges && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: 4, fontSize: 9 }}>{Object.keys(pendingChanges).length}</span>}
                    </button>
                </div>
            </div>

            {/* Success toast */}
            {showSuccess && (
                <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} /> Goals saved successfully
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 12, fontWeight: 700 }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                        <KpiCard
                            label="Team Achievement"
                            value={`${teamAchievement}%`}
                            sub="overall vs targets"
                            icon={Trophy}
                            color="#f59e0b"
                            highlight={teamAchievement >= 80}
                        />
                        <KpiCard
                            label="Closed Deals"
                            value={stats?.totalActuals?.DEALS || 0}
                            sub={`target: ${totals.DEALS}`}
                            icon={Target}
                            color="#10b981"
                            highlight={(stats?.totalActuals?.DEALS || 0) >= totals.DEALS && totals.DEALS > 0}
                        />
                        <KpiCard
                            label="New Test Jobs"
                            value={stats?.totalActuals?.TEST_JOBS || 0}
                            sub={`target: ${totals.TEST_JOBS}`}
                            icon={Activity}
                            color="#3b82f6"
                            highlight={(stats?.totalActuals?.TEST_JOBS || 0) >= totals.TEST_JOBS && totals.TEST_JOBS > 0}
                        />
                        <KpiCard
                            label="Win Rate"
                            value={`${stats?.winRate?.toFixed(1) || 0}%`}
                            sub="closed won vs lost"
                            icon={TrendingUp}
                            color="#6366f1"
                            highlight={(stats?.winRate || 0) >= 70}
                        />
                        <KpiCard
                            label="Deals vs Last Year"
                            value={`${(stats?.comparisons?.DEALS || 0) >= 0 ? '+' : ''}${stats?.comparisons?.DEALS?.toFixed(1) || 0}%`}
                            sub="same month YoY"
                            icon={(stats?.comparisons?.DEALS || 0) >= 0 ? TrendingUp : TrendingDown}
                            color={(stats?.comparisons?.DEALS || 0) >= 0 ? '#10b981' : '#f43f5e'}
                        />
                    </div>

                    {/* Chart */}
                    <div style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '24px 28px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BarChart3 size={14} color="#3b82f6" /> 6-Month Actuals vs Targets
                            </h3>
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                                {CATEGORIES.map(cat => (
                                    <button key={cat.id} onClick={() => setChartMode(cat.id as any)}
                                        style={{
                                            padding: '3px 12px', borderRadius: 6, border: 'none', fontSize: 9, fontWeight: 900,
                                            background: chartMode === cat.id ? cat.color : 'transparent',
                                            color: chartMode === cat.id ? '#fff' : '#475569',
                                            cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.4px'
                                        }}>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ height: 220, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} barSize={16} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                                    <Tooltip
                                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }}
                                        itemStyle={{ fontWeight: 800 }}
                                    />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 8 }} />
                                    <Bar dataKey={chartMode === 'DEALS' ? 'dealsActual' : 'testJobsActual'} name="Actual" fill={activeCat.color} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey={chartMode === 'DEALS' ? 'dealsTarget' : 'testJobsTarget'} name="Target" fill={`${activeCat.color}33`} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Users size={13} /> Rep Targets
                            </h3>
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Search size={11} color="#475569" />
                                <input
                                    placeholder="Search rep..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 10, outline: 'none', width: 120 }}
                                />
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Sales Representative</th>
                                        {CATEGORIES.map(cat => (
                                            <th key={cat.id} style={{ padding: '10px 20px', fontWeight: 900 }}>{cat.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan={3} style={{ padding: 60, textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: 700 }}>No reps found</td></tr>
                                    ) : filteredUsers.map(user => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="row-hover">
                                            <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #1e3a5f, #0f172a)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#60a5fa', flexShrink: 0 }}>
                                                        {user.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f1f5f9' }}>{user.name}</div>
                                                        <div style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>{user.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {CATEGORIES.map(cat => {
                                                const goal = goals.find(g => g.userId === user.id && g.category === cat.id)
                                                const actual = actuals.find(a => a.userId === user.id)?.[cat.id] || 0
                                                const key = `${user.id}_${cat.id}`
                                                const targetVal = pendingChanges[key] !== undefined ? pendingChanges[key] : (goal?.targetValue || 0)
                                                const changed = pendingChanges[key] !== undefined

                                                return (
                                                    <td key={cat.id} style={{ padding: '12px 20px', verticalAlign: 'middle', minWidth: 220 }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                                                <div style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>
                                                                    <span style={{ color: cat.color, fontWeight: 900 }}>{actual}</span> achieved
                                                                </div>
                                                            </div>
                                                            <GoalBadge actual={actual} target={targetVal} />
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

                    {/* Footer */}
                    <div style={{ display: 'flex', gap: 12, paddingBottom: 10 }}>
                        <div style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                            <Trophy size={13} color="#f59e0b" /> Targets influence quarterly tier bonuses
                        </div>
                    </div>

                </div>
            )}

            <style jsx global>{`
                .nav-btn { background: transparent; border: none; color: #64748b; cursor: pointer; display: flex; padding: 4px; border-radius: 6px; transition: all 0.2s; }
                .nav-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
                .row-hover:hover td { background: rgba(255,255,255,0.015); }
                .compact-input {
                    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; width: 60px; padding: 6px;
                    color: #fff; font-size: 13px; font-weight: 900; text-align: center; outline: none; transition: all 0.2s;
                }
                .compact-input:focus { border-color: #3b82f6; background: rgba(0,0,0,0.6); }
                .mini-spin {
                    width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%;
                    border-top-color: #fff; animation: spin 0.8s linear infinite;
                }
                .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: #3b82f6; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
