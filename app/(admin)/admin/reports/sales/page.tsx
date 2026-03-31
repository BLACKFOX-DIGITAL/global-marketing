'use client'
import { useState, useEffect, useMemo } from 'react'
import {
    Users,
    CheckCircle,
    Target,
    Phone,
    Calendar,
    Activity,
    BarChart3,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Search,
    Download
} from 'lucide-react'
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line 
} from 'recharts'

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
]

function StatCard({ label, value, icon: Icon, color, trend, sparklineData }: { 
    label: string, value: string | number, icon: React.ElementType, color: string, trend?: number, sparklineData?: any[] 
}) {
    const isPositive = (trend || 0) >= 0
    return (
        <div style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={12} strokeWidth={2.5} />
                </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>{value}</div>
                {trend !== undefined && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: isPositive ? '#10b981' : '#f43f5e', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div style={{ height: 24, width: '100%', marginTop: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [reportData, setReportData] = useState<any>(null)
    const [reportPeriod, setReportPeriod] = useState('month')
    const [selectedRep, setSelectedRep] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        setLoading(true)
        fetch(`/api/admin/reports/sales?period=${reportPeriod}${selectedRep ? `&repId=${selectedRep}` : ''}`)
            .then(r => r.json())
            .then(d => { setReportData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [reportPeriod, selectedRep])

    const statsWithTrends = useMemo(() => {
        if (!reportData?.dailyStats) return null
        const daily = reportData.dailyStats
        const current7 = daily.slice(-7)
        const prev7 = daily.slice(-14, -7)

        const calcTrend = (key: string) => {
            const currentSum = current7.reduce((s: number, d: any) => s + (d[key] || 0), 0)
            const prevSum = prev7.reduce((s: number, d: any) => s + (d[key] || 0), 0)
            if (prevSum === 0) return 0
            return Math.round(((currentSum - prevSum) / prevSum) * 100)
        }

        return {
            leads: { trend: calcTrend('leads'), data: daily.map((d: any) => ({ value: d.leads })) },
            closed: { trend: calcTrend('closed'), data: daily.map((d: any) => ({ value: d.closed })) },
            tasks: { trend: calcTrend('tasks'), data: daily.map((d: any) => ({ value: d.tasks })) },
            comms: { trend: calcTrend('calls'), data: daily.map((d: any) => ({ value: d.calls + d.emails })) }
        }
    }, [reportData])

    const filteredReps = reportData?.salesReps.filter((r: any) => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    return (
        <div style={{ padding: '12px 18px', maxWidth: 1400, margin: '0 auto', width: '100%', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: 6, borderRadius: 8, color: '#fff', boxShadow: '0 0 15px rgba(59,130,246,0.2)' }}>
                        <BarChart3 size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.4px', margin: 0, color: '#f8fafc' }}>Fleet Analytics</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Live System Verification
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} color="#475569" />
                        <select
                            value={reportPeriod}
                            onChange={e => setReportPeriod(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 800, outline: 'none', cursor: 'pointer' }}
                        >
                            {PERIODS.map(p => <option key={p.key} value={p.key} style={{ background: '#0f172a' }}>{p.label}</option>)}
                        </select>
                    </div>
                    <button style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', height: 26, padding: '0 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={12} /> Export
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><div className="spinner" /></div>
            ) : reportData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <StatCard label="Leads Pipeline" value={reportData.globalStats.totalLeads} icon={Users} color="#3b82f6" trend={statsWithTrends?.leads.trend} sparklineData={statsWithTrends?.leads.data} />
                        <StatCard label="Market Conversion" value={reportData.globalStats.totalClosedWon} icon={CheckCircle} color="#10b981" trend={statsWithTrends?.closed.trend} sparklineData={statsWithTrends?.closed.data} />
                        <StatCard label="Campaign Velocity" value={reportData.globalStats.totalTasks} icon={Target} color="#f59e0b" trend={statsWithTrends?.tasks.trend} sparklineData={statsWithTrends?.tasks.data} />
                        <StatCard label="Outreach Volume" value={reportData.globalStats.totalCalls + reportData.globalStats.totalEmails} icon={Phone} color="#ec4899" trend={statsWithTrends?.comms.trend} sparklineData={statsWithTrends?.comms.data} />
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 18, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Activity size={14} color="#3b82f6" /> Performance Trend
                            </h3>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#64748b' }}><div style={{ width: 6, height: 6, borderRadius: 2, background: '#3b82f6' }} /> Inbound</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#64748b' }}><div style={{ width: 6, height: 6, borderRadius: 2, background: '#10b981' }} /> Won</div>
                            </div>
                        </div>
                        <div style={{ height: 200, width: '100%', marginLeft: -20 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={reportData.dailyStats}>
                                    <defs>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 9, fontWeight: 700}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 9, fontWeight: 700}} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '11px' }} itemStyle={{ fontWeight: 800, padding: '2px 0' }} />
                                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLeads)" />
                                    <Area type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorClosed)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 18, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Individual Performance Matrix</h3>
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Search size={12} color="#475569" />
                                <input placeholder="Quick Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 10, outline: 'none', width: 120 }} />
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Elite Sales Professional</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Ownership</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Win</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Velocity</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Logged</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReps.sort((a: any, b: any) => b.closedWon - a.closedWon).map((rep: any) => (
                                    <tr key={rep.id} className="row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                                        <td style={{ padding: '8px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 10, fontWeight: 900 }}>{rep.name.substring(0,2).toUpperCase()}</div>
                                                <div><div style={{ fontWeight: 800, fontSize: 12, color: '#f1f5f9' }}>{rep.name}</div><div style={{ fontSize: 9, color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} /> SYSTEM ACTIVE</div></div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 18px' }}><div style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{rep.totalLeads} <span style={{ fontSize: 9, color: '#475569' }}>OWNED</span></div></td>
                                        <td style={{ padding: '8px 18px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ fontSize: 14, fontWeight: 900, color: '#10b981' }}>{rep.closedWon}</div><ArrowUpRight size={12} color="#10b981" style={{ opacity: 0.5 }} /></div></td>
                                        <td style={{ padding: '8px 18px' }}><div style={{ width: 110 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 800, marginBottom: 3 }}><span style={{ color: '#f59e0b' }}>{rep.tasksCompleted} TASKS</span></div><div style={{ height: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 1, overflow: 'hidden' }}><div style={{ width: `${Math.min((rep.tasksCompleted / 20) * 100, 100)}%`, height: '100%', background: '#f59e0b' }} /></div></div></td>
                                        <td style={{ padding: '8px 18px' }}><div style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>{rep.totalHours}H <span style={{ fontSize: 9, fontWeight: 600 }}>LOG</span></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <style jsx global>{`
                .row-hover:hover { background: rgba(255, 255, 255, 0.015); transform: scale(1.002); cursor: pointer; }
                .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: #3b82f6; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
