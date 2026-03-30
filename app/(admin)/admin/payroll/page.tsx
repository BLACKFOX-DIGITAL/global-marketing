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
    Filter
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
        <div style={{ padding: '20px 32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Banknote size={24} color="var(--accent-primary)" /> Payroll Intelligence
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>Strategic salary analysis, deductions, and disbursement management.</p>
                </div>
            </div>

            {/* Executive Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Banknote size={16} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Gross Payroll</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>৳{totals.base.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingDown size={16} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Hours</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>{Math.round(totals.hours)}h</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={16} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Net Payable</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', letterSpacing: '-0.8px' }}>৳{totals.net.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--accent-glow)', border: '1px solid var(--accent-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertTriangle size={16} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Efficiency</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '-0.8px' }}>{((totals.net / (totals.base || 1)) * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <Calendar size={14} color="var(--text-muted)" />
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', flex: 1, maxWidth: 320, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input
                        placeholder="Search records..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%' }}
                    />
                </div>

                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Download size={14} /> Export CSV
                </button>
            </div>

            {/* Reports Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                        <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            <th style={{ padding: '12px 24px', fontWeight: 700 }}>Sales Representative</th>
                            <th style={{ padding: '12px 24px', fontWeight: 700 }}>Target Salary</th>
                            <th style={{ padding: '12px 24px', fontWeight: 700 }}>Hourly Rate</th>
                            <th style={{ padding: '12px 24px', fontWeight: 700 }}>Hours Logged</th>
                            <th style={{ padding: '12px 24px', fontWeight: 700 }}>Working Days</th>
                            <th style={{ padding: '12px 24px', fontWeight: 700, textAlign: 'right' }}>Payout & Projection</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                        ) : filteredReports.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>No reports found for this period.</td></tr>
                        ) : (
                            filteredReports.map((report, idx) => (
                                <tr key={report.userId} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '10px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                                {report.userName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{report.userName}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 24px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>৳{report.baseSalary.toLocaleString()}</td>
                                    <td style={{ padding: '10px 24px', fontSize: 13, color: 'var(--accent-primary)', fontWeight: 700 }}>৳{report.hourlyRate.toLocaleString()}</td>
                                    <td style={{ padding: '10px 24px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {Math.floor(report.totalMinutesWorked / 60)}h {report.totalMinutesWorked % 60}m
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Approved Leaves Incl.</div>
                                    </td>
                                    <td style={{ padding: '10px 24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{report.attendedDays} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>/ {report.workingDaysInMonth}</span></div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Absences: <span style={{ color: report.absentDays > 0 ? 'var(--accent-primary)' : 'inherit' }}>{report.absentDays}</span></div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 24px', textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>
                                            ৳{report.finalSalary.toLocaleString()}
                                        </div>
                                        {selectedMonth === format(new Date(), 'yyyy-MM') && (
                                            <div style={{ fontSize: 11, color: report.projectedSalary < report.baseSalary ? '#f59e0b' : '#10b981', fontWeight: 600, marginTop: 2 }}>
                                                Est: ৳{report.projectedSalary.toLocaleString()}
                                            </div>
                                        )}
                                        {selectedMonth !== format(new Date(), 'yyyy-MM') && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Finalized</div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Compliance Note */}
            <div style={{ marginTop: 24, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <AlertTriangle size={16} color="var(--text-muted)" />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-primary)', letterSpacing: '0.2px' }}>Hourly Calculation Policy:</strong> Hourly Rate = Target Salary / (All Open Days + Weekday Holidays × 8 Hours). Final Salary = (Actual Minutes Worked + Approved Leave Minutes + Weekday Holiday Minutes) / 60 × Hourly Rate. Office-announced vacations are fully paid.
                </p>
            </div>

        </div>
    )
}
