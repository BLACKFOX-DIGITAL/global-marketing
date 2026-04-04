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
    AlertTriangle,
    Clock,
    Search,
    Mail
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
    label: string; value: string | number; icon: React.ElementType; color: string; trend?: number; sparklineData?: { value: number }[]
}) {
    const isPositive = (trend || 0) >= 0
    return (
        <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</div>
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
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [reportData, setReportData] = useState<any>(null)
    const [reportPeriod, setReportPeriod] = useState('month')
    const [selectedRep, setSelectedRep] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        setLoading(true)
        setError(null)
        fetch(`/api/admin/reports/sales?period=${reportPeriod}${selectedRep ? `&repId=${selectedRep}` : ''}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error)
                else setReportData(d)
                setLoading(false)
            })
            .catch(() => { setError('Failed to load report data'); setLoading(false) })
    }, [reportPeriod, selectedRep])

    const statsWithTrends = useMemo(() => {
        if (!reportData?.dailyStats) return null
        const daily = reportData.dailyStats
        const current7 = daily.slice(-7)
        const prev7 = daily.slice(-14, -7)
        const calcTrend = (key: string) => {
            const cur = current7.reduce((s: number, d: any) => s + (d[key] || 0), 0)
            const prev = prev7.reduce((s: number, d: any) => s + (d[key] || 0), 0)
            if (prev === 0) return 0
            return Math.round(((cur - prev) / prev) * 100)
        }
        return {
            leads: { trend: calcTrend('leads'), data: daily.map((d: any) => ({ value: d.leads })) },
            closed: { trend: calcTrend('closed'), data: daily.map((d: any) => ({ value: d.closed })) },
            tasks: { trend: calcTrend('tasks'), data: daily.map((d: any) => ({ value: d.tasks })) },
            comms: { trend: calcTrend('calls'), data: daily.map((d: any) => ({ value: d.calls + d.emails })) }
        }
    }, [reportData])

    const filteredReps = (reportData?.salesReps || []).filter((r: any) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const allRepsForFilter = reportData?.salesReps || []

    return (
        <div style={{ padding: '12px 18px', maxWidth: 1400, margin: '0 auto', width: '100%', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: 6, borderRadius: 8, color: '#fff', boxShadow: '0 0 15px rgba(59,130,246,0.2)' }}>
                        <BarChart3 size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.4px', margin: 0, color: '#f8fafc' }}>Sales Reports</h1>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Activity and performance across all reps</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Rep filter */}
                    <div style={{ background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={12} color="#475569" />
                        <select
                            value={selectedRep}
                            onChange={e => setSelectedRep(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 800, outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="" style={{ background: '#0f172a' }}>All Reps</option>
                            {allRepsForFilter.map((r: any) => (
                                <option key={r.id} value={r.id} style={{ background: '#0f172a' }}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Period filter */}
                    <div style={{ background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} color="#475569" />
                        <select
                            value={reportPeriod}
                            onChange={e => setReportPeriod(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 800, outline: 'none', cursor: 'pointer' }}
                        >
                            {PERIODS.map(p => <option key={p.key} value={p.key} style={{ background: '#0f172a' }}>{p.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 12, fontWeight: 700 }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><div className="spinner" /></div>
            ) : reportData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <StatCard label="New Leads" value={reportData.globalStats.totalLeads} icon={Users} color="#3b82f6" trend={statsWithTrends?.leads.trend} sparklineData={statsWithTrends?.leads.data} />
                        <StatCard label="Closed Won" value={reportData.globalStats.totalClosedWon} icon={CheckCircle} color="#10b981" trend={statsWithTrends?.closed.trend} sparklineData={statsWithTrends?.closed.data} />
                        <StatCard label="Tasks Completed" value={reportData.globalStats.totalTasks} icon={Target} color="#f59e0b" trend={statsWithTrends?.tasks.trend} sparklineData={statsWithTrends?.tasks.data} />
                        <StatCard label="Calls + Emails" value={reportData.globalStats.totalCalls + reportData.globalStats.totalEmails} icon={Phone} color="#ec4899" trend={statsWithTrends?.comms.trend} sparklineData={statsWithTrends?.comms.data} />
                    </div>

                    {/* Alerts */}
                    {(reportData.inactivityAlerts?.length > 0 || reportData.goalAlerts?.length > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: reportData.inactivityAlerts?.length > 0 && reportData.goalAlerts?.length > 0 ? '1fr 1fr' : '1fr', gap: 12 }}>
                            {reportData.inactivityAlerts?.length > 0 && (
                                <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 16, padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                        <Clock size={13} color="#f43f5e" />
                                        <h3 style={{ fontSize: 11, fontWeight: 900, margin: 0, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Inactive Reps</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {reportData.inactivityAlerts.map((alert: any) => (
                                            <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.1)' }}>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{alert.name}</span>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    {alert.overdueTaskCount > 0 && (
                                                        <span style={{ fontSize: 9, fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>{alert.overdueTaskCount} overdue tasks</span>
                                                    )}
                                                    <span style={{ fontSize: 9, fontWeight: 900, color: alert.alertLevel === 'critical' ? '#f43f5e' : '#f59e0b', background: alert.alertLevel === 'critical' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                                        {alert.daysSinceActivity === null ? 'No activity' : `${alert.daysSinceActivity}d inactive`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {reportData.goalAlerts?.length > 0 && (
                                <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                        <AlertTriangle size={13} color="#f59e0b" />
                                        <h3 style={{ fontSize: 11, fontWeight: 900, margin: 0, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Behind on Goals</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {reportData.goalAlerts.map((alert: any) => (
                                            <div key={alert.id} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}>
                                                <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{alert.name}</div>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    {alert.missedGoals.map((g: any) => (
                                                        <span key={g.category} style={{ fontSize: 9, fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                                            {g.category}: {g.actual}/{g.target} ({g.percent}%)
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trend Chart */}
                    <div style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Activity size={14} color="#3b82f6" /> 14-Day Trend
                            </h3>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#64748b' }}><div style={{ width: 6, height: 6, borderRadius: 2, background: '#3b82f6' }} /> Leads</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#64748b' }}><div style={{ width: 6, height: 6, borderRadius: 2, background: '#10b981' }} /> Closed Won</div>
                            </div>
                        </div>
                        <div style={{ height: 200, width: '100%', marginLeft: -20 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={reportData.dailyStats}>
                                    <defs>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                                        <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }} itemStyle={{ fontWeight: 800, padding: '2px 0' }} />
                                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLeads)" />
                                    <Area type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorClosed)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Rep Table */}
                    <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Rep Breakdown</h3>
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Search size={12} color="#475569" />
                                <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 10, outline: 'none', width: 120 }} />
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Rep</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Leads</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Closed Won</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Tasks Done</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Calls</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Emails</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Hours</th>
                                    <th style={{ padding: '10px 18px', fontWeight: 900 }}>Overdue Tasks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReps.sort((a: any, b: any) => b.closedWon - a.closedWon).map((rep: any) => (
                                    <tr key={rep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                                        <td style={{ padding: '8px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 10, fontWeight: 900 }}>{rep.name.substring(0, 2).toUpperCase()}</div>
                                                <div style={{ fontWeight: 800, fontSize: 12, color: '#f1f5f9' }}>{rep.name}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 18px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 900, color: '#f1f5f9' }}>{rep.totalLeads}</div>
                                            <div style={{ fontSize: 8.5, color: '#475569', fontWeight: 700 }}>{rep.totalAssignedLeads} total assigned</div>
                                        </td>
                                        <td style={{ padding: '8px 18px' }}>
                                            <div style={{ fontSize: 14, fontWeight: 900, color: '#10b981' }}>{rep.closedWon}</div>
                                        </td>
                                        <td style={{ padding: '8px 18px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{rep.tasksCompleted}</div>
                                            {rep.taskCompletionRate > 0 && <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700 }}>{rep.taskCompletionRate}% on time</div>}
                                        </td>
                                        <td style={{ padding: '8px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>
                                                <Phone size={10} color="#475569" /> {rep.totalCalls}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>
                                                <Mail size={10} color="#475569" /> {rep.totalEmails}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 18px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>{rep.totalHours}h</div>
                                        </td>
                                        <td style={{ padding: '8px 18px' }}>
                                            {rep.overdueTasks > 0
                                                ? <span style={{ fontSize: 10, fontWeight: 900, color: '#f43f5e', background: 'rgba(244,63,94,0.08)', padding: '2px 8px', borderRadius: 4 }}>{rep.overdueTasks}</span>
                                                : <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>—</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                                {filteredReps.length === 0 && (
                                    <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: 700 }}>No reps found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <style jsx global>{`
                .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: #3b82f6; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
