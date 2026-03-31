'use client'
import { useState, useEffect, useMemo } from 'react'
import {
    Activity,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
    Briefcase,
    BadgeDollarSign,
    Target,
    Users,
    Zap,
    ArrowUpRight,
    BarChart3,
    Search
} from 'lucide-react'
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line 
} from 'recharts'

// High-density enterprise stat card
function StatCard({ label, value, trend, icon: Icon, color, isPrimary = false, sparklineData }: any) {
    const isPositive = (trend || 0) >= 0
    return (
        <div style={{
            padding: '12px 16px',
            borderRadius: '16px',
            background: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(20px)',
            border: isPrimary ? `1px solid ${color}40` : '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={12} strokeWidth={2.5} />
                </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>{value}</div>
                {trend !== undefined && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: isPositive ? '#10b981' : '#f43f5e', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            {/* Micro Sparkline for subtle trend visualization */}
            <div style={{ height: 28, width: '100%', marginTop: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            
            {isPrimary && (
                <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, background: `radial-gradient(circle at top right, ${color}30, transparent)`, pointerEvents: 'none' }} />
            )}
        </div>
    )
}

export default function ExecutiveDashboard() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        setLoading(true)
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
            tasks: data.dailyTrends.map((d: any) => ({ value: d.tasks }))
        }
    }, [data])

    const filteredLeaderboard = data?.leaderboard?.filter((r: any) => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    return (
        <div style={{ padding: '20px 30px', maxWidth: 1400, margin: '0 auto', width: '100%', minHeight: '100vh' }}>
            
            {/* Standardized Obsidian Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: 7, borderRadius: 10, color: '#fff', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
                        <Zap size={20} strokeWidth={2.5} fill="currentColor" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', margin: 0, color: '#f8fafc' }}>Executive Command Center</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                            Live System Intelligence • All Ports Active
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '6px 16px', color: '#f1f5f9', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                       <Activity size={12} color="#10b981" /> REAL-TIME SYNC
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 140 }}><div className="spinner" /></div>
            ) : data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Top Tier Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                        <StatCard 
                            label="Revenue Conversion" 
                            value={data.globalGoals?.DEALS?.actual || 0} 
                            trend={data.trends?.deals} 
                            icon={BadgeDollarSign} 
                            color="#10b981" 
                            isPrimary 
                            sparklineData={sparklines?.deals}
                        />
                        <StatCard 
                            label="Total Pipeline" 
                            value={data.totalOpportunities || 0} 
                            trend={data.trends?.pipeline} 
                            icon={Target} 
                            color="#3b82f6" 
                            sparklineData={sparklines?.pipeline}
                        />
                        <StatCard 
                            label="Market Inbound" 
                            value={data.globalGoals?.LEADS?.actual || 0} 
                            trend={data.trends?.leads} 
                            icon={Users} 
                            color="#f59e0b" 
                            sparklineData={sparklines?.leads}
                        />
                        <StatCard 
                            label="Force Capacity" 
                            value={data.totalUsers || 0} 
                            icon={Briefcase} 
                            color="#ec4899" 
                            sparklineData={sparklines?.tasks}
                        />
                    </div>

                    {/* EXECUTIVE REVENUE TREND CHART */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 24, padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <h3 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <TrendingUp size={16} color="#10b981" /> Fleet Revenue Velocity
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b', fontWeight: 600 }}>Performance tracking across all sales channels (Last 14 Days)</p>
                            </div>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} /> Conversions
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#3b82f6' }} /> Inbound Momentum
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ height: 220, width: '100%', marginLeft: -20 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.dailyTrends}>
                                    <defs>
                                        <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 700}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 700}} />
                                    <Tooltip 
                                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                                        itemStyle={{ fontWeight: 800 }}
                                    />
                                    <Area type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorClosed)" />
                                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Operational Intelligence Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                        
                        {/* Elite Performers Table - High Density */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 12, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Force Leaderboard</h3>
                                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Search size={14} color="#475569" />
                                    <input 
                                        placeholder="Quick Search..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none', width: 140 }} 
                                    />
                                </div>
                            </div>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                                        <th style={{ padding: '12px 20px', fontWeight: 900 }}>Rank</th>
                                        <th style={{ padding: '12px 20px', fontWeight: 900 }}>Elite Professional</th>
                                        <th style={{ padding: '12px 20px', fontWeight: 900 }}>Success Ratio</th>
                                        <th style={{ padding: '12px 20px', fontWeight: 900 }}>Engagement</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeaderboard.map((rep: any, idx: number) => (
                                        <tr key={rep.id} className="row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                                            <td style={{ padding: '10px 20px', fontSize: 14, fontWeight: 900, color: idx === 0 ? '#10b981' : '#64748b' }}>
                                                {idx + 1}
                                            </td>
                                            <td style={{ padding: '10px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: 10, fontWeight: 900 }}>
                                                        {rep.name.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: 13, color: '#f1f5f9' }}>{rep.name}</div>
                                                        <div style={{ fontSize: 9, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> ACTIVE
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ fontSize: 16, fontWeight: 900, color: '#10b981' }}>{rep.closedWon}</div>
                                                    <ArrowUpRight size={12} color="#10b981" style={{ opacity: 0.5 }} />
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 20px' }}>
                                                <div style={{ width: 120 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 800, marginBottom: 4 }}>
                                                        <span style={{ color: '#475569' }}>VELOCITY</span>
                                                        <span style={{ color: '#3b82f6' }}>{rep.tasksCompleted} LOGS</span>
                                                    </div>
                                                    <div style={{ height: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 1, overflow: 'hidden' }}>
                                                        <div style={{ width: `${Math.min((rep.tasksCompleted / 30) * 100, 100)}%`, height: '100%', background: '#3b82f6' }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* High-Intelligence Alerts & Funnels */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            
                            {/* Visual Funnel Visualization */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 24, padding: '20px' }}>
                                <h3 style={{ fontSize: 13, fontWeight: 900, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Pipeline Integrity</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {Object.entries(data.stageBreakdown || {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).map(([stage, count]) => {
                                        const total = data.totalOpportunities || 1;
                                        const ratio = ((count as number) / total) * 100;
                                        return (
                                            <div key={stage}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, fontWeight: 800 }}>
                                                    <span style={{ color: '#94a3b8' }}>{stage.toUpperCase()}</span>
                                                    <span style={{ color: '#f8fafc' }}>{count as number}</span>
                                                </div>
                                                <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 2, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', width: `${ratio}%` }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Critical Insights Alert Section */}
                            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 24, padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <ShieldAlert size={16} color="#f43f5e" />
                                    <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '1px' }}>Strategic Alerts</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {data.leaderboard && data.leaderboard.filter((r: any) => r.closedWon === 0).length > 0 ? (
                                        data.leaderboard.filter((r: any) => r.closedWon === 0).slice(0, 3).map((rep: any) => (
                                            <div key={rep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.05)' }}>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{rep.name}</span>
                                                <div style={{ fontSize: 10, fontWeight: 900, color: '#f43f5e', padding: '2px 8px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: 6 }}>
                                                    STALLED
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textAlign: 'center', padding: '10px 0' }}>All professionals meeting operational benchmarks.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <style jsx global>{`
                .row-hover:hover { background: rgba(255, 255, 255, 0.015); transform: scale(1.002); cursor: pointer; }
                .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: #10b981; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { opacity: 0.5; box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
            `}</style>
        </div>
    )
}
