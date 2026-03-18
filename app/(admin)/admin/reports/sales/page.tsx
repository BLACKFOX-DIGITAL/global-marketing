'use client'
import { useState, useEffect } from 'react'
import {
    Users,
    CheckCircle,
    Target,
    Phone,
    Briefcase,
    Calendar,
    Activity,
    BarChart3
} from 'lucide-react'

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
]

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: React.ElementType, color: string }) {
    return (
        <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} />
                </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>{value}</div>
        </div>
    )
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [reportData, setReportData] = useState<any>(null)
    const [reportPeriod, setReportPeriod] = useState('month')
    const [selectedRep, setSelectedRep] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/admin/reports/sales?period=${reportPeriod}${selectedRep ? `&repId=${selectedRep}` : ''}`)
            .then(r => r.json())
            .then(d => { setReportData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [reportPeriod, selectedRep])

    return (
        <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <BarChart3 size={28} color="var(--accent-primary)" /> Team Analytics
                    </h1>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>Deep dive into individual and team-wide performance metrics.</p>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={reportPeriod}
                            onChange={e => setReportPeriod(e.target.value)}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', padding: '10px 16px', paddingLeft: 40, fontSize: 13, fontWeight: 600, appearance: 'none', cursor: 'pointer', outline: 'none' }}
                        >
                            {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                        <Calendar size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                    {reportData && (
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedRep || ''}
                                onChange={e => setSelectedRep(e.target.value || null)}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', padding: '10px 16px', paddingLeft: 40, fontSize: 13, fontWeight: 600, appearance: 'none', cursor: 'pointer', minWidth: 200, outline: 'none' }}
                            >
                                <option value="">All Representatives</option>
                                {reportData.salesReps.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <Users size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" /></div>
            ) : reportData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {/* Summary Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                        <StatCard label="Leads Sync" value={reportData.globalStats.totalLeads} icon={Users} color="var(--accent-primary)" />
                        <StatCard label="Deals Won" value={reportData.globalStats.totalClosedWon} icon={CheckCircle} color="var(--accent-emerald)" />
                        <StatCard label="Tasks Done" value={reportData.globalStats.totalTasks} icon={Target} color="#f59e0b" />
                        <StatCard label="Comm Logs" value={reportData.globalStats.totalCalls + reportData.globalStats.totalEmails} icon={Phone} color="#ec4899" />
                    </div>

                    {/* Detailed Master Table */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Representative Matrix</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#fafafa', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <th style={{ padding: '16px 24px', fontWeight: 600 }}>Sales Representative</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600 }}>Total Assigned Leads</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600 }}>Deals Closed (Won)</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600 }}>Task Velocity</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600 }}>Hours Logged</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.salesReps.sort((a: any, b: any) => b.closedWon - a.closedWon).map((rep: any) => (
                                    <tr key={rep.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                                                    {rep.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{rep.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Scorecard Details</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{rep.totalLeads}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-emerald)' }}>{rep.closedWon}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{rep.tasksCompleted} completed</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>{rep.totalHours}h recorded</div>
                                        </td>
                                    </tr>
                                ))}
                                {reportData.salesReps.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No performance data available for this timeframe.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
