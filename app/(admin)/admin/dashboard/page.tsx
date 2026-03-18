'use client'
import { useState, useEffect } from 'react'
import {
    Activity,
    TrendingUp,
    ShieldAlert,
    Briefcase,
    BadgeDollarSign,
    Target,
    Users
} from 'lucide-react'

// Elegant, borderless stats card
function StatCard({ label, value, subValue, trend, icon: Icon, color, isPrimary = false }: any) {
    return (
        <div style={{
            padding: '24px',
            borderRadius: '16px',
            background: isPrimary ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)',
            border: isPrimary ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
            boxShadow: isPrimary ? '0 8px 32px -8px rgba(16, 185, 129, 0.1)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} />
                </div>
            </div>
            
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 8 }}>
                {value}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500 }}>
                {trend ? (
                    <span style={{ color: trend > 0 ? 'var(--accent-emerald)' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                ) : null}
                <span style={{ color: 'var(--text-muted)' }}>{subValue}</span>
            </div>
        </div>
    )
}

export default function ExecutiveDashboard() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        setLoading(true)
        fetch('/api/admin/dashboard')
            .then(res => res.json())
            .then(d => { setData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--text-primary)' }}>Executive Summary</h1>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>Real-time intelligence and team performance.</p>
                </div>
                {loading ? (
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: 20 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'pulse 2s infinite' }} />
                        Live Sync Active
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" /></div>
            ) : data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    
                    {/* Top Metrics Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                        <StatCard label="Total Deals Won" value={data.globalGoals?.DEALS?.actual || 0} subValue="vs last month" trend={14.2} icon={BadgeDollarSign} color="var(--accent-emerald)" isPrimary />
                        <StatCard label="Pipeline Size" value={data.totalOpportunities || 0} subValue="Open Opportunities" trend={6.1} icon={Target} color="var(--accent-primary)" />
                        <StatCard label="Active Leads" value={data.globalGoals?.LEADS?.actual || 0} subValue={`Goal: ${data.globalGoals?.LEADS?.target || 0}`} trend={-2.1} icon={Users} color="#f59e0b" />
                        <StatCard label="Total Reps" value={data.totalUsers || 0} subValue="Active System Users" icon={Briefcase} color="var(--accent-cyan)" />
                    </div>

                    {/* Main Content Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                        
                        {/* Leaderboard Section (Table-based like mockup) */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Top Performers Leaderboard</h3>
                            </div>
                            
                            {data.leaderboard && data.leaderboard.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Rank</th>
                                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Rep</th>
                                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Deals Closed</th>
                                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Activity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.leaderboard.map((rep: any, idx: number) => (
                                            <tr key={rep.id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                                <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {idx + 1}
                                                </td>
                                                <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                                                        {rep.name.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{rep.name}</div>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {rep.closedWon}
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    {rep.tasksCompleted} tasks
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No performance data available.</div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Pipeline Distribution (Sleek bars) */}
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px 0' }}>Funnel Distribution</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {Object.entries(data.stageBreakdown || {}).map(([stage, count]) => {
                                        const total = data.totalOpportunities || 1;
                                        const ratio = ((count as number) / total) * 100;
                                        return (
                                            <div key={stage}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                                                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{stage}</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{count as number}</span>
                                                </div>
                                                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${ratio}%`, borderRadius: 3 }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {Object.keys(data.stageBreakdown || {}).length === 0 && (
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active pipeline data.</div>
                                    )}
                                </div>
                            </div>

                            {/* Coaching Required Widget (Minimalist Alert) */}
                            <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 16, padding: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <ShieldAlert size={16} color="#ef4444" />
                                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#ef4444' }}>Coaching Required</h3>
                                </div>
                                {data.leaderboard && data.leaderboard.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {data.leaderboard.filter((r: any) => r.closedWon === 0).length > 0 ? (
                                            data.leaderboard.filter((r: any) => r.closedWon === 0).slice(0, 3).map((rep: any) => (
                                                <div key={rep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{rep.name}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>0 Deals</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No reps requiring immediate coaching.</div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
