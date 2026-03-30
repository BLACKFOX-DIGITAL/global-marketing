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
        <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Banknote size={28} color="var(--accent-primary)" /> Payroll Intelligence
                    </h1>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>Analyze base salaries, deductions, and finalize net payments.</p>
                </div>
            </div>

            {/* Executive Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                <div style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Banknote size={20} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Gross Payroll</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>৳{totals.base.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingDown size={20} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Hours</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{Math.round(totals.hours)}h</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={20} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Net Payable</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', letterSpacing: '-0.5px' }}>৳{totals.net.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: 24, borderRadius: 16, background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: '#b45309', fontWeight: 600, textTransform: 'uppercase' }}>Pay Efficiency</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706', letterSpacing: '-0.5px' }}>{((totals.net / (totals.base || 1)) * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px' }}>
                    <Calendar size={16} color="var(--text-muted)" />
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', flex: 1, maxWidth: 300 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input 
                        placeholder="Search employee..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%' }}
                    />
                </div>

                <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
                    <Download size={16} /> Export CSV
                </button>
            </div>

            {/* Reports Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#fafafa', borderBottom: '1px solid var(--border)' }}>
                        <tr style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Employee</th>
                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Target Salary</th>
                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Hourly Rate</th>
                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Hours Logged</th>
                            <th style={{ padding: '16px 24px', fontWeight: 600 }}>Working Days</th>
                            <th style={{ padding: '16px 24px', fontWeight: 600, textAlign: 'right' }}>Final Salary</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                        ) : filteredReports.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>No reports found for this period.</td></tr>
                        ) : (
                            filteredReports.map((report, idx) => (
                                <tr key={report.userId} style={{ borderBottom: idx === filteredReports.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                                                {report.userName.substring(0,2).toUpperCase()}
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{report.userName}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>৳{report.baseSalary.toLocaleString()}</td>
                                    <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--accent-primary)', fontWeight: 600 }}>৳{report.hourlyRate.toLocaleString()}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {Math.floor(report.totalMinutesWorked / 60)}h {report.totalMinutesWorked % 60}m
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Incl. Approved Leaves</div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{report.attendedDays} / {report.workingDaysInMonth}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Absences: <span style={{ color: report.absentDays > 0 ? '#ef4444' : 'inherit' }}>{report.absentDays}</span></div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                                        ৳{report.finalSalary.toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Compliance Note */}
            <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'center' }}>
                <AlertTriangle size={18} color="#64748b" />
                <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                    <strong>Hourly Calculation Policy:</strong> Hourly Rate = Target Salary / (All Open Days + Weekday Holidays × 8 Hours). Final Salary = (Actual Minutes Worked + Approved Leave Minutes + Weekday Holiday Minutes) / 60 × Hourly Rate. Office-announced vacations are fully paid.
                </p>
            </div>

        </div>
    )
}
