'use client'
import { useState, useEffect } from 'react'
import {
    Users, Clock, Calendar, TrendingUp, TrendingDown,
    CheckCircle, AlertCircle, BarChart3, Search, UserCheck
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts'

const PERIODS = [
    { key: 'week', label: 'This Week' },
    { key: 'last_week', label: 'Last Week' },
    { key: 'month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
]

function KpiCard({ label, value, sub, icon: Icon, color, highlight = false }: {
    label: string; value: string | number; sub: string
    icon: React.ElementType; color: string; highlight?: boolean
}) {
    return (
        <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: highlight ? `${color}12` : 'rgba(30,41,59,0.45)',
            border: `1px solid ${highlight ? color + '30' : 'rgba(255,255,255,0.06)'}`,
            backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', gap: 6,
            boxShadow: highlight ? `0 0 20px ${color}18` : 'none'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} strokeWidth={2.5} />
                </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: highlight ? color : '#f8fafc', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>{sub}</div>
        </div>
    )
}

function AttendanceBadge({ rate }: { rate: number }) {
    const color = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#f43f5e'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ width: `${rate}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 900, color, minWidth: 34 }}>{rate}%</span>
        </div>
    )
}

export default function AttendanceReportPage() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [period, setPeriod] = useState('month')
    const [selectedRep, setSelectedRep] = useState('')
    const [search, setSearch] = useState('')
    const [chartMode, setChartMode] = useState<'presence' | 'hours'>('presence')

    useEffect(() => {
        setLoading(true)
        setError(null)
        const url = `/api/admin/reports/attendance?period=${period}${selectedRep ? `&repId=${selectedRep}` : ''}`
        fetch(url)
            .then(r => r.json())
            .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
            .catch(() => { setError('Failed to load report'); setLoading(false) })
    }, [period, selectedRep])

    const filteredReps = (data?.repStats || []).filter((r: any) =>
        r.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)

    return (
        <div style={{ padding: '14px 20px', maxWidth: 1400, margin: '0 auto', width: '100%', minHeight: '100vh' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: 7, borderRadius: 10, color: '#fff', boxShadow: '0 0 18px rgba(99,102,241,0.25)' }}>
                        <UserCheck size={17} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.4px', margin: 0, color: '#f8fafc' }}>Attendance Report</h1>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Punctuality, presence, and hours across the team</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Rep filter */}
                    <div style={{ background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={12} color="#475569" />
                        <select value={selectedRep} onChange={e => setSelectedRep(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 800, outline: 'none', cursor: 'pointer' }}>
                            <option value="" style={{ background: '#0f172a' }}>All Members</option>
                            {(data?.allReps || []).map((r: any) => (
                                <option key={r.id} value={r.id} style={{ background: '#0f172a' }}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Period filter */}
                    <div style={{ background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} color="#475569" />
                        <select value={period} onChange={e => setPeriod(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 800, outline: 'none', cursor: 'pointer' }}>
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
            ) : data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                        <KpiCard label="Avg Attendance" value={`${data.globalStats.avgAttendanceRate}%`} sub="across all members" icon={CheckCircle} color="#10b981" highlight={data.globalStats.avgAttendanceRate >= 80} />
                        <KpiCard label="Total Hours" value={`${data.globalStats.totalHours}h`} sub="clocked in period" icon={Clock} color="#3b82f6" />
                        <KpiCard label="Work Days" value={data.globalStats.workDays} sub="in selected period" icon={Calendar} color="#6366f1" />
                        <KpiCard label="Perfect Attendance" value={data.globalStats.perfectAttendance} sub="members at 100%" icon={TrendingUp} color="#f59e0b" highlight={data.globalStats.perfectAttendance > 0} />
                        <KpiCard label="Total Sessions" value={data.globalStats.totalSessions} sub="clock-in records" icon={BarChart3} color="#ec4899" />
                    </div>

                    {/* Chart */}
                    <div style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BarChart3 size={14} color="#6366f1" /> Daily Attendance Trend
                            </h3>
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                                {[{ key: 'presence', label: 'Presence' }, { key: 'hours', label: 'Hours' }].map(m => (
                                    <button key={m.key} onClick={() => setChartMode(m.key as any)}
                                        style={{ padding: '3px 12px', borderRadius: 6, border: 'none', fontSize: 9, fontWeight: 900, background: chartMode === m.key ? 'var(--accent-primary)' : 'transparent', color: chartMode === m.key ? '#fff' : '#475569', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ height: 220, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {chartMode === 'presence' ? (
                                    <BarChart data={data.dailyStats} barSize={14}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }} itemStyle={{ fontWeight: 800 }} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 8 }} />
                                        <Bar dataKey="present" name="Present" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="absent" name="Absent" fill="#f43f5e33" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                ) : (
                                    <AreaChart data={data.dailyStats}>
                                        <defs>
                                            <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }} itemStyle={{ fontWeight: 800 }} />
                                        <Area type="monotone" dataKey="totalHours" name="Total Hours" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#hoursGrad)" />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Rep Table */}
                    <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Member Breakdown</h3>
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Search size={12} color="#475569" />
                                <input placeholder="Search member..." value={search} onChange={e => setSearch(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 10, outline: 'none', width: 130 }} />
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Member</th>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Attendance Rate</th>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Days Present</th>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Days Absent</th>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>On Leave</th>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Total Hours</th>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Avg/Day</th>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Late Arrivals</th>
                                        <th style={{ padding: '10px 20px', fontWeight: 900 }}>Early Checkouts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReps.length === 0 ? (
                                        <tr><td colSpan={9} style={{ padding: 60, textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: 700 }}>No members found</td></tr>
                                    ) : filteredReps.map((rep: any) => (
                                        <tr key={rep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #4f46e5, #1e1b4b)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#818cf8', flexShrink: 0 }}>
                                                        {rep.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f1f5f9' }}>{rep.name}</div>
                                                        <div style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>{rep.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle', minWidth: 160 }}>
                                                <AttendanceBadge rate={rep.attendanceRate} />
                                            </td>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                <span style={{ fontSize: 13, fontWeight: 900, color: '#10b981' }}>{rep.daysPresent}</span>
                                                <span style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}> / {data.globalStats.workDays}d</span>
                                            </td>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                {rep.daysAbsent > 0
                                                    ? <span style={{ fontSize: 12, fontWeight: 900, color: '#f43f5e' }}>{rep.daysAbsent}</span>
                                                    : <span style={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>—</span>
                                                }
                                            </td>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                {rep.leaveDays > 0
                                                    ? <span style={{ fontSize: 10, fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>{rep.leaveDays}d</span>
                                                    : <span style={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>—</span>
                                                }
                                            </td>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle', fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{rep.totalHours}h</td>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle', fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{rep.avgHoursPerDay}h</td>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                {rep.lateArrivals > 0
                                                    ? <span style={{ fontSize: 10, fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(245,158,11,0.15)' }}>{rep.lateArrivals}</span>
                                                    : <span style={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>—</span>
                                                }
                                            </td>
                                            <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                                {rep.earlyCheckouts > 0
                                                    ? <span style={{ fontSize: 10, fontWeight: 900, color: '#ec4899', background: 'rgba(236,72,153,0.08)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(236,72,153,0.15)' }}>{rep.earlyCheckouts}</span>
                                                    : <span style={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>—</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}

            <style jsx global>{`
                .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: #6366f1; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
                tr:hover td { background: rgba(255,255,255,0.015); }
            `}</style>
        </div>
    )
}
