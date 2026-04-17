'use client'
import { useState, useEffect, useMemo } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import dynamic from 'next/dynamic'
import {
    TrendingUp, TrendingDown, ShieldAlert, Briefcase, BadgeDollarSign,
    Target, Users, Zap, BarChart3, Search, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import NotificationCenter from '@/components/NotificationCenter'
import ActivityHeatmap from '@/components/ActivityHeatmap'

// Dynamically import Recharts to prevent hydration/lazy element issues in React 19/Next 15+
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })


function StatCard({ label, value, trend, icon: Icon, color, isPrimary = false, sparklineData, href }: any) {
    const isPositive = (trend || 0) >= 0
    
    // Extremely robust icon check to prevent any 'Element type is invalid' crashes
    const renderIcon = () => {
        try {
            if (!Icon) return <ShieldAlert size={12} strokeWidth={2.5} />
            if (typeof Icon === 'function' || typeof Icon === 'object') {
                return <Icon size={12} strokeWidth={2.5} />
            }
            return <ShieldAlert size={12} strokeWidth={2.5} />
        } catch (e) {
            console.error("Icon render error in StatCard:", e)
            return <ShieldAlert size={12} strokeWidth={2.5} />
        }
    }

    const inner = (
        <div style={{
            padding: '12px 16px', borderRadius: 16,
            background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)',
            border: isPrimary ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', gap: 4,
            position: 'relative', overflow: 'hidden',
            cursor: href ? 'pointer' : 'default',
            transition: 'border-color 0.2s',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderIcon()}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>{value}</div>
                {trend !== undefined && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: isPositive ? '#10b981' : '#f43f5e', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        <span style={{ marginLeft: 2 }}>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <div style={{ height: 24, width: '100%', marginTop: 2, opacity: (sparklineData && sparklineData.length > 0) ? 1 : 0 }}>
                {sparklineData && sparklineData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
            {isPrimary && (
                <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, background: `radial-gradient(circle at top right, ${color}30, transparent)`, pointerEvents: 'none' }} />
            )}
        </div>
    )
    return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}


function AlertBadge({ label, value, color, href }: { label: string, value: number, color: string, href: string }) {
    if (value === 0) return null
    return (
        <Link href={href} style={{ textDecoration: 'none' }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `${color}08`, border: `1px solid ${color}20`,
                borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
                transition: 'background 0.2s',
            }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color, background: `${color}15`, padding: '2px 10px', borderRadius: 8 }}>{value}</span>
            </div>
        </Link>
    )
}

export default function ExecutiveDashboard() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        fetch('/api/admin/dashboard')
            .then(res => res.json())
            .then(d => { setData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const sparklines = useMemo(() => {
        if (!data?.dailyTrends) return null
        return {
            deals: data.dailyTrends.map((d: any) => ({ value: d.closed })),
            pipeline: data.dailyTrends.map((d: any) => ({ value: d.leads })),
            leads: data.dailyTrends.map((d: any) => ({ value: d.leads })),
        }
    }, [data])

    const filteredLeaderboard = data?.leaderboard?.filter((r: any) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    const alerts = data?.alerts || {}
    const totalAlerts = (alerts.poolCount || 0) + (alerts.overdueTasks || 0) + (alerts.pendingLeave || 0) + (alerts.staleLeads || 0)

    if (!mounted) return <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }} />

    return (
        <ErrorBoundary>
            <div style={{ padding: '20px 30px', maxWidth: 1400, margin: '0 auto', width: '100%', minHeight: '100vh' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: 7, borderRadius: 10, color: '#fff', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
                            <Zap size={20} strokeWidth={2.5} fill="currentColor" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', margin: 0, color: '#f8fafc' }}>Admin Dashboard</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                                Live · This month vs last month
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {totalAlerts > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#f43f5e' }}>
                                <ShieldAlert size={14} /> {totalAlerts} item{totalAlerts !== 1 ? 's' : ''} need attention
                            </div>
                        )}
                        <NotificationCenter />
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 140 }}>
                        <div style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,0.05)', borderRadius: '50%', borderTopColor: '#10b981', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : data && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* KPI Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                            <StatCard
                                label="Deals Closed (Month)"
                                value={data.globalGoals?.DEALS?.actual || 0}
                                trend={data.trends?.deals}
                                icon={BadgeDollarSign}
                                color="#10b981"
                                isPrimary
                                sparklineData={sparklines?.deals || []}
                            />
                            <StatCard
                                label="Total Pipeline"
                                value={data.totalOpportunities || 0}
                                trend={data.trends?.pipeline}
                                icon={Target}
                                color="#3b82f6"
                                sparklineData={sparklines?.pipeline || []}
                                href="/admin/reports"
                            />
                            <StatCard
                                label="New Leads (Month)"
                                value={data.globalGoals?.LEADS?.actual || 0}
                                trend={data.trends?.leads}
                                icon={Users}
                                color="#f59e0b"
                                sparklineData={sparklines?.leads || []}
                                href="/admin/leads"
                            />
                            <StatCard
                                label="Active Sales Reps"
                                value={data.totalUsers || 0}
                                icon={Briefcase}
                                color="#ec4899"
                                sparklineData={[]}
                                href="/admin/settings"
                            />
                        </div>

                        {/* Alerts + Goal Progress */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                            {/* Actionable Alerts */}
                            <div style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '18px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <AlertTriangle size={14} color="#f59e0b" />
                                    <h3 style={{ fontSize: 12, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Items Needing Action</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <AlertBadge label="Unassigned Leads in Pool" value={alerts.poolCount || 0} color="#06b6d4" href="/admin/leads" />
                                    <AlertBadge label="Overdue Tasks" value={alerts.overdueTasks || 0} color="#ef4444" href="/admin/workforce" />
                                    <AlertBadge label="Pending Leave Requests" value={alerts.pendingLeave || 0} color="#f59e0b" href="/admin/workforce" />
                                    <AlertBadge label="Stale Leads (30+ days idle)" value={alerts.staleLeads || 0} color="#8b5cf6" href="/admin/leads" />
                                    {totalAlerts === 0 && (
                                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textAlign: 'center', padding: '16px 0' }}>
                                            ✓ All clear — no items need attention
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Monthly Goal Progress */}
                            <div style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '18px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <BarChart3 size={14} color="#3b82f6" />
                                    <h3 style={{ fontSize: 12, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Monthly Team Goals</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { label: 'Deals Closed', key: 'DEALS', color: '#10b981' },
                                        { label: 'Test Jobs', key: 'TEST_JOBS', color: '#3b82f6' },
                                    ].map(({ label, key, color }) => {
                                        const g = data.globalGoals?.[key]
                                        if (!g || g.target === 0) return null
                                        const pct = Math.min(100, Math.round((g.actual / g.target) * 100))
                                        return (
                                            <div key={key}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontWeight: 700 }}>
                                                    <span style={{ color: '#94a3b8' }}>{label}</span>
                                                    <span style={{ color: pct >= 100 ? color : '#94a3b8' }}>{g.actual} / {g.target} ({pct}%)</span>
                                                </div>
                                                <div style={{ height: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 10, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10, transition: 'width 0.8s ease' }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {(!data.globalGoals?.DEALS?.target && !data.globalGoals?.LEADS?.target) && (
                                        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '10px 0' }}>No goals set for this month. <Link href="/admin/goals" style={{ color: '#3b82f6' }}>Set goals →</Link></div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 14-Day Trend Chart */}
                        <div style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '20px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <TrendingUp size={16} color="#10b981" /> Team Activity (Last 14 Days)
                                    </h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b', fontWeight: 600 }}>New leads added vs deals closed per day</p>
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    {[['#10b981', 'Deals Closed'], ['#3b82f6', 'Leads Added']].map(([color, label]) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} /> {label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ height: 200, width: '100%', marginLeft: -20 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.dailyTrends || []}>
                                        <defs>
                                            <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} itemStyle={{ fontWeight: 800 }} />
                                        <Area type="monotone" dataKey="closed" name="Deals Closed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorClosed)" />
                                        <Area type="monotone" dataKey="leads" name="Leads Added" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Leaderboard + Pipeline */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

                            {/* Leaderboard */}
                            <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>
                                        Team Performance · This Month
                                    </h3>
                                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Search size={14} color="#475569" />
                                        <input
                                            placeholder="Search member..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none', width: 120 }}
                                        />
                                    </div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            <th style={{ padding: '10px 20px', fontWeight: 900 }}>#</th>
                                            <th style={{ padding: '10px 20px', fontWeight: 900 }}>Member</th>
                                            <th style={{ padding: '10px 20px', fontWeight: 900 }}>Deals Won</th>
                                            <th style={{ padding: '10px 20px', fontWeight: 900 }}>Leads</th>
                                            <th style={{ padding: '10px 20px', fontWeight: 900 }}>Tasks Done</th>
                                            <th style={{ padding: '10px 20px', fontWeight: 900 }}>XP / Lvl</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLeaderboard.length === 0 ? (
                                            <tr><td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', color: '#475569', fontSize: 12 }}>No members found</td></tr>
                                        ) : filteredLeaderboard.map((rep: any, idx: number) => (
                                            <tr key={rep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                <td style={{ padding: '10px 20px', fontSize: 13, fontWeight: 900, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#64748b' }}>
                                                    {idx + 1}
                                                </td>
                                                <td style={{ padding: '10px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: 10, fontWeight: 900 }}>
                                                            {rep.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, fontSize: 13, color: '#f1f5f9' }}>{rep.name}</div>
                                                            {rep.currentStreak >= 3 && (
                                                                <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>🔥 {rep.currentStreak}d streak</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 20px' }}>
                                                    <span style={{ fontSize: 15, fontWeight: 900, color: rep.closedWon > 0 ? '#10b981' : '#475569' }}>
                                                        {rep.closedWon}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 20px', fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>{rep.leadsAssigned}</td>
                                                <td style={{ padding: '10px 20px', fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>{rep.tasksCompleted}</td>
                                                <td style={{ padding: '10px 20px' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#6366f1' }}>{rep.xp.toLocaleString()} XP</div>
                                                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>Lvl {rep.level}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pipeline + Recent Leads */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                {/* Pipeline by Stage */}
                                <div style={{ background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 20 }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 900, margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Pipeline by Stage</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {Object.entries(data.stageBreakdown || {})
                                            .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
                                            .map(([stage, count]) => {
                                                const total = data.totalOpportunities || 1
                                                const ratio = ((count as number) / total) * 100
                                                return (
                                                    <div key={stage}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, fontWeight: 700 }}>
                                                            <span style={{ color: '#94a3b8' }}>{stage}</span>
                                                            <span style={{ color: '#f8fafc' }}>{count as number}</span>
                                                        </div>
                                                        <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 2, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', width: `${ratio}%`, transition: 'width 0.8s ease' }} />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        {Object.keys(data.stageBreakdown || {}).length === 0 && (
                                            <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '10px 0' }}>No pipeline data</div>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Leads */}
                                <div style={{ background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h3 style={{ fontSize: 12, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Recent Leads</h3>
                                        <Link href="/admin/leads" style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {(data.recentLeads || []).map((lead: any) => (
                                            <Link key={lead.id} href={`/admin/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}>
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{lead.company || lead.name}</div>
                                                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{lead.owner?.name || 'Unassigned'}</div>
                                                    </div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: 6 }}>{lead.status}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

                    {/* Activity Heatmap */}
                    <div style={{ padding: '0 24px 24px' }}>
                        <ActivityHeatmap />
                    </div>

        </ErrorBoundary>
    )
}
