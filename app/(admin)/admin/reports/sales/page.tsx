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
        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}12`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} />
                </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>{value}</div>
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
        <div style={{ padding: '20px 32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BarChart3 size={24} color="var(--accent-primary)" /> Sales Reports
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>Strategic performance analytics and tactical summaries.</p>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={reportPeriod}
                            onChange={e => setReportPeriod(e.target.value)}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', paddingLeft: 34, fontSize: 13, fontWeight: 700, appearance: 'none', cursor: 'pointer', outline: 'none' }}
                        >
                            {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                        <Calendar size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                    {reportData && (
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedRep || ''}
                                onChange={e => setSelectedRep(e.target.value || null)}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', paddingLeft: 34, fontSize: 13, fontWeight: 700, appearance: 'none', cursor: 'pointer', minWidth: 180, outline: 'none' }}
                            >
                                <option value="">Global Performance</option>
                                {reportData.salesReps.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <Users size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>Performance Matrix</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    <th style={{ padding: '12px 24px', fontWeight: 700 }}>Representative</th>
                                    <th style={{ padding: '12px 24px', fontWeight: 700 }}>Assigned Leads</th>
                                    <th style={{ padding: '12px 24px', fontWeight: 700 }}>Deals Won</th>
                                    <th style={{ padding: '12px 24px', fontWeight: 700 }}>Task velocity</th>
                                    <th style={{ padding: '12px 24px', fontWeight: 700 }}>Hours Logged</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.salesReps.sort((a: any, b: any) => b.closedWon - a.closedWon).map((rep: any) => (
                                    <tr key={rep.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '10px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                                    {rep.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{rep.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Scorecard Details</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 24px' }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{rep.totalLeads}</div>
                                        </td>
                                        <td style={{ padding: '10px 24px' }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-emerald)' }}>{rep.closedWon}</div>
                                        </td>
                                        <td style={{ padding: '10px 24px' }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{rep.tasksCompleted} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>done</span></div>
                                        </td>
                                        <td style={{ padding: '10px 24px' }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{rep.totalHours}h <span style={{ fontSize: 11, fontWeight: 500 }}>logged</span></div>
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
