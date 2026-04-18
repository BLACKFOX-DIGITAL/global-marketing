'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
    Banknote, Calendar, Clock, CheckCircle2, Search,
    ShieldAlert, UserX, Download, TrendingDown, BarChart3, ChevronDown, ChevronUp
} from 'lucide-react'
import { format } from 'date-fns'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts'

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

function csvCell(val: string | number): string {
    const str = String(val)
    return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
}

function exportToCSV(reports: SalaryReport[], month: string) {
    const headers = ['Name', 'Base Salary (৳)', 'Hourly Rate (৳)', 'Hours Worked', 'Days Present', 'Days Absent', 'Leave Days', 'Net Salary (৳)', 'Deduction (৳)']
    const rows = reports.map(r => [
        r.userName,
        r.baseSalary,
        r.hourlyRate.toFixed(2),
        (r.totalMinutesWorked / 60).toFixed(1),
        r.attendedDays,
        r.absentDays,
        r.approvedLeaveDays,
        r.finalSalary.toFixed(2),
        (r.baseSalary - r.finalSalary).toFixed(2)
    ])
    const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

export default function PayrollDashboard() {
    const [reports, setReports] = useState<SalaryReport[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [historyLoading, setHistoryLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedRow, setExpandedRow] = useState<string | null>(null)
    const [chartMode, setChartMode] = useState<'net' | 'deduction'>('net')

    const fetchReports = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const date = new Date(selectedMonth + '-01').toISOString()
            const res = await fetch(`/api/admin/payroll?date=${date}`)
            const data = await res.json()
            if (res.ok) setReports(data.reports)
            else setError(data.error || 'Failed to fetch payroll data')
        } catch {
            setError('Connection error — please try again')
        } finally {
            setLoading(false)
        }
    }, [selectedMonth])

    useEffect(() => { fetchReports() }, [fetchReports])

    useEffect(() => {
        setHistoryLoading(true)
        fetch('/api/admin/payroll/history?months=6')
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(d => { if (d.history) setHistory(d.history) })
            .catch(err => console.error('Failed to load payroll history:', err))
            .finally(() => setHistoryLoading(false))
    }, [])

    const filteredReports = reports
        .filter(r => r.userName.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b.finalSalary - a.finalSalary)

    const totals = {
        base: reports.reduce((acc, r) => acc + r.baseSalary, 0),
        net: reports.reduce((acc, r) => acc + r.finalSalary, 0),
        hours: reports.reduce((acc, r) => acc + (r.totalMinutesWorked / 60), 0),
        absences: reports.reduce((acc, r) => acc + r.absentDays, 0),
        deducted: reports.reduce((acc, r) => acc + (r.baseSalary - r.finalSalary), 0)
    }

    const isCurrentMonth = selectedMonth === format(new Date(), 'yyyy-MM')

    return (
        <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-primary), #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' }}>
                            <Banknote size={18} color="#fff" strokeWidth={2.5} />
                        </div>
                        Payroll
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>Monthly salary breakdown based on attendance and approved leave.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '5px 12px' }}>
                        <Calendar size={12} color="#64748b" />
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 800, outline: 'none', cursor: 'pointer' }} />
                    </div>
                    <button
                        onClick={() => exportToCSV(reports, selectedMonth)}
                        disabled={reports.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <Download size={13} strokeWidth={2.5} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Base Salary', val: `৳${totals.base.toLocaleString()}`, icon: Banknote, col: 'var(--accent-primary)', sub: 'sum of all base salaries' },
                    { label: 'Total Hours Worked', val: `${Math.round(totals.hours)}h`, icon: Clock, col: '#6366f1', sub: 'across all employees' },
                    { label: 'Total Net Payable', val: `৳${Math.round(totals.net).toLocaleString()}`, icon: CheckCircle2, col: '#10b981', sub: 'after deductions' },
                    { label: 'Total Deducted', val: `৳${Math.round(totals.deducted).toLocaleString()}`, icon: TrendingDown, col: '#f59e0b', sub: 'from absences' },
                    { label: 'Total Absences', val: totals.absences, icon: UserX, col: '#f43f5e', sub: 'unexcused absent days' }
                ].map((stat, i) => (
                    <div key={i} style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', backdropFilter: 'blur(24px)', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 20px rgba(0,0,0,0.05)' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at 100% 0%, ${stat.col}10, transparent)`, pointerEvents: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${stat.col}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.col, border: `1px solid ${stat.col}20` }}>
                                <stat.icon size={14} strokeWidth={2.5} />
                            </div>
                            <div style={{ fontSize: 9.5, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{stat.label}</div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>{stat.val}</div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#475569', marginTop: 3 }}>{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Salary History Chart */}
            <div style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '24px 28px', marginBottom: 20, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BarChart3 size={14} color="var(--accent-primary)" /> 6-Month Salary History
                    </h3>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                        {[{ key: 'net', label: 'Net vs Base' }, { key: 'deduction', label: 'Deductions' }].map(m => (
                            <button key={m.key} onClick={() => setChartMode(m.key as any)}
                                style={{ padding: '3px 12px', borderRadius: 6, border: 'none', fontSize: 9, fontWeight: 900, background: chartMode === m.key ? 'var(--accent-primary)' : 'transparent', color: chartMode === m.key ? '#fff' : '#475569', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ height: 200, width: '100%' }}>
                    {historyLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><div className="spinner" /></div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            {chartMode === 'net' ? (
                                <BarChart data={history} barSize={16}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }} itemStyle={{ fontWeight: 800 }} formatter={((v: number) => [`৳${v.toLocaleString()}`, '']) as any} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 8 }} />
                                    <Bar dataKey="totalBase" name="Base" fill="rgba(99,102,241,0.3)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="totalNet" name="Net Paid" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="deductGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }} itemStyle={{ fontWeight: 800 }} formatter={((v: number) => [`৳${v.toLocaleString()}`, '']) as any} />
                                    <Area type="monotone" dataKey="totalDeducted" name="Total Deducted" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#deductGrad)" />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px', flex: 1, maxWidth: 380 }}>
                    <Search size={13} color="#64748b" />
                    <input placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 11.5, fontWeight: 700, outline: 'none', width: '100%' }} />
                </div>
            </div>

            {error && (
                <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 12, fontWeight: 700 }}>
                    {error}
                </div>
            )}

            {/* Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', backdropFilter: 'blur(20px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 8px 30px rgba(0,0,0,0.1)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                            <tr style={{ color: '#475569', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Employee</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Base Salary</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Hourly Rate</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Hours Worked</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Attendance</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900 }}>Deduction</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900, textAlign: 'right' }}>Net Salary</th>
                                <th style={{ padding: '10px 20px', fontWeight: 900, width: 40 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                            ) : filteredReports.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 80, color: '#475569', fontSize: 12, fontWeight: 800 }}>No payroll records found</td></tr>
                            ) : (
                                filteredReports.map((report) => {
                                    const deduction = report.baseSalary - report.finalSalary
                                    const deductionPct = report.baseSalary > 0 ? ((deduction / report.baseSalary) * 100).toFixed(1) : '0'
                                    const isExpanded = expandedRow === report.userId
                                    const attendanceRate = report.workingDaysInMonth > 0
                                        ? Math.round(((report.attendedDays + report.approvedLeaveDays) / report.workingDaysInMonth) * 100)
                                        : 0
                                    return (
                                        <React.Fragment key={report.userId}>
                                            <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => setExpandedRow(isExpanded ? null : report.userId)}>
                                                <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #4f46e5, #1e1b4b)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
                                                            {report.userName.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div style={{ fontWeight: 800, fontSize: 12.5, color: '#f8fafc' }}>{report.userName}</div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 20px', verticalAlign: 'middle', fontSize: 12, color: '#94a3b8', fontWeight: 800 }}>৳{report.baseSalary.toLocaleString()}</td>
                                                <td style={{ padding: '10px 20px', verticalAlign: 'middle', fontSize: 12, color: 'var(--accent-primary)', fontWeight: 900 }}>
                                                    ৳{report.hourlyRate.toLocaleString()} <span style={{ fontSize: 8.5, opacity: 0.6, fontWeight: 700 }}>/hr</span>
                                                </td>
                                                <td style={{ padding: '10px 20px', verticalAlign: 'middle', fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>
                                                    {Math.floor(report.totalMinutesWorked / 60)}h {report.totalMinutesWorked % 60}m
                                                </td>
                                                <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>
                                                        {report.attendedDays} <span style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>/ {report.workingDaysInMonth} days</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${attendanceRate}%`, background: attendanceRate >= 90 ? '#10b981' : attendanceRate >= 70 ? '#f59e0b' : '#f43f5e', borderRadius: 4 }} />
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                    {deduction > 0 ? (
                                                        <span style={{ fontSize: 11, fontWeight: 900, color: '#f43f5e', background: 'rgba(244,63,94,0.08)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(244,63,94,0.15)' }}>
                                                            -৳{Math.round(deduction).toLocaleString()} <span style={{ opacity: 0.7 }}>({deductionPct}%)</span>
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: 10, color: '#10b981', fontWeight: 800 }}>No deduction</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 900, fontSize: 14, color: '#10b981' }}>৳{Math.round(report.finalSalary).toLocaleString()}</div>
                                                    {isCurrentMonth && (
                                                        <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700, marginTop: 1 }}>
                                                            Est. ৳{Math.round(report.projectedSalary).toLocaleString()} at month end
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px 20px', verticalAlign: 'middle', textAlign: 'center', color: '#475569' }}>
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </td>
                                            </tr>

                                            {/* Expanded Deduction Breakdown */}
                                            {isExpanded && (
                                                <tr key={`${report.userId}-detail`} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td colSpan={8} style={{ padding: '0 20px 16px 20px', background: 'rgba(0,0,0,0.15)' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, paddingTop: 12 }}>
                                                            {/* Attendance Breakdown */}
                                                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 20px rgba(0,0,0,0.05)' }}>
                                                                <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Attendance</div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                    {[
                                                                        { label: 'Working Days', val: report.workingDaysInMonth, color: '#64748b' },
                                                                        { label: 'Present', val: report.attendedDays, color: '#10b981' },
                                                                        { label: 'On Leave', val: report.approvedLeaveDays, color: '#f59e0b' },
                                                                        { label: 'Absent', val: report.absentDays, color: '#f43f5e' },
                                                                    ].map(item => (
                                                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                                                            <span style={{ color: '#64748b', fontWeight: 700 }}>{item.label}</span>
                                                                            <span style={{ color: item.color, fontWeight: 900 }}>{item.val}d</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {/* Hours Breakdown */}
                                                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 20px rgba(0,0,0,0.05)' }}>
                                                                <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Hours</div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                    {[
                                                                        { label: 'Target Hours', val: `${report.workingDaysInMonth * 8}h`, color: '#64748b' },
                                                                        { label: 'Clocked Hours', val: `${Math.floor(report.totalMinutesWorked / 60)}h ${report.totalMinutesWorked % 60}m`, color: '#6366f1' },
                                                                        { label: 'Hourly Rate', val: `৳${report.hourlyRate}/hr`, color: 'var(--accent-primary)' },
                                                                    ].map(item => (
                                                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                                                            <span style={{ color: '#64748b', fontWeight: 700 }}>{item.label}</span>
                                                                            <span style={{ color: item.color, fontWeight: 900 }}>{item.val}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {/* Salary Breakdown */}
                                                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 20px rgba(0,0,0,0.05)' }}>
                                                                <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Salary Calc</div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                    {[
                                                                        { label: 'Base Salary', val: `৳${report.baseSalary.toLocaleString()}`, color: '#64748b' },
                                                                        { label: 'Deduction', val: `-৳${Math.round(deduction).toLocaleString()}`, color: deduction > 0 ? '#f43f5e' : '#10b981' },
                                                                        { label: 'Net Payable', val: `৳${Math.round(report.finalSalary).toLocaleString()}`, color: '#10b981' },
                                                                    ].map(item => (
                                                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                                                            <span style={{ color: '#64748b', fontWeight: 700 }}>{item.label}</span>
                                                                            <span style={{ color: item.color, fontWeight: 900 }}>{item.val}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {/* Projection */}
                                                            {isCurrentMonth && (
                                                                <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: '16px 20px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 20px rgba(99,102,241,0.05)' }}>
                                                                    <div style={{ fontSize: 9, fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Month-End Estimate</div>
                                                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#6366f1', letterSpacing: '-1px' }}>
                                                                        ৳{Math.round(report.projectedSalary).toLocaleString()}
                                                                    </div>
                                                                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, marginTop: 4 }}>
                                                                        Based on current attendance pace
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Note */}
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <ShieldAlert size={13} color="#475569" />
                <p style={{ fontSize: 10.5, color: '#64748b', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                    Net salary is calculated from actual hours worked. Approved leave days are counted as worked days and are not deducted. Click any row to see the full deduction breakdown.
                </p>
            </div>

            <style jsx global>{`
                .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: var(--accent-primary); animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
                tbody tr:hover td { background: rgba(255,255,255,0.012); }
            `}</style>
        </div>
    )
}
