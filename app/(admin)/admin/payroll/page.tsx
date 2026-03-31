'use client'
import { useState, useEffect } from 'react'
import {
    Banknote,
    Calendar,
    User,
    AlertTriangle,
    TrendingDown,
    CheckCircle2,
    Search,
    Download,
    Filter,
    ShieldAlert
} from 'lucide-react'
import { format, parseISO, startOfMonth } from 'date-fns'

interface SalaryReport {
    userId: string
    userName: string
    baseSalary: number
    workingDaysInMonth: number
    attendedDays: number
    approvedLeaveDays: number
    absentDays: number
    totalMinutesWorked: number
    hourlyRate: number
    finalSalary: number
    projectedSalary: number
}

export default function PayrollDashboard() {
    const [reports, setReports] = useState<SalaryReport[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchReports()
    }, [selectedMonth])

    const fetchReports = async () => {
        setLoading(true)
        try {
            // We use the first day of the selected month
            const date = new Date(selectedMonth + '-01').toISOString()
            const res = await fetch(`/api/admin/payroll?date=${date}`)
            if (res.ok) {
                const data = await res.json()
                setReports(data.reports)
            } else {
                setError('Failed to fetch payroll data')
            }
        } catch (err) {
            setError('System connection error')
        } finally {
            setLoading(false)
        }
    }

    const filteredReports = reports.filter(r =>
        r.userName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totals = {
        base: reports.reduce((acc, r) => acc + r.baseSalary, 0),
        net: reports.reduce((acc, r) => acc + r.finalSalary, 0),
        hours: reports.reduce((acc, r) => acc + (r.totalMinutesWorked / 60), 0),
        absences: reports.reduce((acc, r) => acc + r.absentDays, 0)
    }

    return (
        <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            {/* Executive Status Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-primary), #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' }}>
                            <Banknote size={18} color="#fff" strokeWidth={2.5} />
                        </div>
                        Payroll Intelligence
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Strategic salary distribution and disbursement matrix.</p>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '5px 12px', backdropFilter: 'blur(10px)' }}>
                        <Calendar size={12} color="#64748b" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 800, outline: 'none', cursor: 'pointer' }}
                        />
                    </div>
                </div>
            </div>

            {/* High-Density Command Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Gross Exposure', val: `৳${totals.base.toLocaleString()}`, icon: Banknote, col: 'var(--accent-primary)', sub: 'Primary Obligation' },
                    { label: 'Fleet Engagement', val: `${Math.round(totals.hours)}h`, icon: TrendingDown, col: '#6366f1', sub: 'Calculated Airtime' },
                    { label: 'Settlement Req', val: `৳${totals.net.toLocaleString()}`, icon: CheckCircle2, col: '#10b981', sub: 'Final Net Payable' },
                    { label: 'Efficiency Index', val: `${((totals.net / (totals.base || 1)) * 100).toFixed(1)}%`, icon: AlertTriangle, col: '#f43f5e', sub: 'Disbursement Ratio' }
                ].map((stat, i) => (
                    <div key={i} style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', backdropFilter: 'blur(24px)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, width: 50, height: 50, background: `radial-gradient(circle at 100% 0%, ${stat.col}10, transparent)`, pointerEvents: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${stat.col}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.col, border: `1px solid ${stat.col}20` }}>
                                <stat.icon size={14} strokeWidth={2.5} />
                            </div>
                            <div style={{ fontSize: 9.5, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{stat.label}</div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 950, color: '#f8fafc', letterSpacing: '-0.5px' }}>{stat.val}</div>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: '#475569', marginTop: 3 }}>{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Matrix Controls */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px', flex: 1, maxWidth: 380 }}>
                    <Search size={13} color="#64748b" />
                    <input
                        placeholder="Filter professional identity..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 11.5, fontWeight: 700, outline: 'none', width: '100%' }}
                    />
                </div>
                <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: '#94a3b8', fontWeight: 900, fontSize: 10, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    <Download size={12} strokeWidth={2.5} /> Export Dataset
                </button>
            </div>

            {/* Payroll Matrix */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                            <tr style={{ color: '#475569', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Professional Identity</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Target / Base</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Hourly Yield</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Temporal Metrics</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Attendance Velocity</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900, textAlign: 'right' }}>Final Settlement</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                            ) : filteredReports.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80, color: '#475569', fontSize: 12, fontWeight: 800 }}>ZERO DISBURSEMENT ENTRIES FOUND</td></tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.userId} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }}>
                                        <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontSize: 9, fontWeight: 900, flexShrink: 0 }}>{report.userName.substring(0, 2).toUpperCase()}</div>
                                                <div style={{ fontWeight: 800, fontSize: 12.5, color: '#f8fafc' }}>{report.userName}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 800 }}>৳{report.baseSalary.toLocaleString()}</div>
                                        </td>
                                        <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 900 }}>৳{report.hourlyRate.toLocaleString()} <span style={{ fontSize: 8.5, opacity: 0.6, fontWeight: 700 }}>/ HR</span></div>
                                        </td>
                                        <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{Math.floor(report.totalMinutesWorked / 60)}h {report.totalMinutesWorked % 60}m</div>
                                            <div style={{ fontSize: 8.5, color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 1 }}>Temporal Summation</div>
                                        </td>
                                        <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{report.attendedDays} <span style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>/ {report.workingDaysInMonth}</span></div>
                                            <div style={{ fontSize: 8.5, color: report.absentDays > 0 ? '#f43f5e' : '#475569', fontWeight: 900, textTransform: 'uppercase', marginTop: 1 }}>Absences: {report.absentDays}</div>
                                        </td>
                                        <td style={{ padding: '6px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                                            <div style={{ fontWeight: 900, fontSize: 14, color: '#10b981' }}>৳{report.finalSalary.toLocaleString()}</div>
                                            <div style={{ fontSize: 8.5, color: report.projectedSalary < report.baseSalary ? '#f43f5e' : '#10b981', fontWeight: 900, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {selectedMonth === format(new Date(), 'yyyy-MM') ? `Est Delta: ৳${report.projectedSalary.toLocaleString()}` : 'Statement Finalized'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Compliance Matrix */}
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <ShieldAlert size={14} color="#475569" />
                <p style={{ fontSize: 10.5, color: '#64748b', margin: 0, lineHeight: 1.5, fontWeight: 700 }}>
                    <span style={{ color: '#94a3b8', fontWeight: 900 }}>H-Rate Protocol:</span> Specialized yield calculation based on aggregate open intervals. Office-announced strategic vacations are normalized and fully subsidized within the disbursal matrix.
                </p>
            </div>
        </div>
    )
}
