'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import NotificationCenter from '@/components/NotificationCenter'
import { Clock, ChevronLeft, ChevronRight, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO, differenceInHours } from 'date-fns'

interface AttendanceRecord {
    id: string; punchIn: string; punchOut: string | null; duration: number | null
}

const PERIODS = [
    { key: 'today', label: 'Today', target: 8 * 60 },
    { key: 'week', label: 'This Week', target: 40 * 60 },
    { key: 'month', label: 'This Month', target: 160 * 60 },
    { key: 'custom', label: 'Custom Range', target: 0 },
]

// Ensures timestamps without 'Z' are parsed as UTC, not local time
function toUTC(str: string): Date {
    return new Date(str.endsWith('Z') ? str : str + 'Z')
}

function formatMinutes(mins: number) {
    const h = Math.floor(Math.abs(mins) / 60)
    const m = Math.floor(Math.abs(mins) % 60)
    const sign = mins < 0 ? '-' : ''
    return `${sign}${h}h ${m}m`
}

export default function AttendanceLogPage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([])
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [page, setPage] = useState(1)
    const [period, setPeriod] = useState('week')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [totalMinutes, setTotalMinutes] = useState(0)
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(false)
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
    const [tick, setTick] = useState(0)

    const fetchRecords = useCallback(async () => {
        setLoading(true)
        setFetchError(false)
        try {
            const params = new URLSearchParams({ period, page: String(page), limit: '100' })
            if (period === 'custom' && dateFrom) params.set('from', dateFrom)
            if (period === 'custom' && dateTo) params.set('to', dateTo)
            const res = await fetch(`/api/attendance?${params}`)
            if (res.ok) {
                const d = await res.json()
                setRecords(d.records)
                setTotal(d.total)
                setTotalPages(d.totalPages)
                setTotalMinutes(d.totalMinutes)
                if (d.records.length > 0) {
                    const firstDay = format(toUTC(d.records[0].punchIn), 'yyyy-MM-dd')
                    setExpandedDays({ [firstDay]: true })
                }
            } else {
                setFetchError(true)
            }
        } catch {
            setFetchError(true)
        }
        setLoading(false)
    }, [period, page, dateFrom, dateTo])

    useEffect(() => {
        requestAnimationFrame(() => {
            fetchRecords()
        })
    }, [fetchRecords])

    // Tick every minute to keep active session total live
    useEffect(() => {
        const hasActive = records.some(r => r.punchOut === null)
        if (!hasActive) return
        const interval = setInterval(() => setTick(t => t + 1), 60000)
        return () => clearInterval(interval)
    }, [records])

    const groupedRecords = useMemo(() => {
        const groups: Record<string, AttendanceRecord[]> = {}
        records.forEach(rec => {
            const day = format(toUTC(rec.punchIn), 'yyyy-MM-dd')
            if (!groups[day]) groups[day] = []
            groups[day].push(rec)
        })
        return groups
    }, [records])

    // Add estimated time for any active (not yet punched out) sessions — tick keeps it live
    const correctedTotalMinutes = useMemo(() => {
        const activeExtra = records
            .filter(r => r.punchOut === null)
            .reduce((sum, r) => sum + Math.round((Date.now() - toUTC(r.punchIn).getTime()) / 60000), 0)
        return totalMinutes + activeExtra
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [records, totalMinutes, tick])

    const toggleDay = (day: string) => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))



    const currentPeriodObj = PERIODS.find(p => p.key === period)
    const targetMinutes = currentPeriodObj?.target || 0
    const progressPercent = targetMinutes > 0 ? Math.min(100, Math.round((correctedTotalMinutes / targetMinutes) * 100)) : 0
    const diffMinutes = correctedTotalMinutes - targetMinutes
    const isOvertime = diffMinutes > 0

    return (
        <div className="crm-content" style={{ paddingTop: 16 }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>Attendance Timesheet</h2>
                        <p>Track your daily hours, breaks, and overtime progress.</p>
                    </div>
                    <NotificationCenter />
                </div>

                {/* Tracking Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    {/* Time Progress Card */}
                    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Period Progress</div>
                            <div style={{ fontSize: 13, background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 100, color: 'var(--text-muted)' }}>{currentPeriodObj?.label} Target: {formatMinutes(targetMinutes)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{formatMinutes(correctedTotalMinutes)}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>logged</div>
                        </div>
                        <div style={{ width: '100%', height: 8, background: 'var(--bg-input)', borderRadius: 100, overflow: 'hidden', marginTop: 4 }}>
                            <div style={{ width: `${progressPercent}%`, height: '100%', background: isOvertime ? '#10b981' : '#6366f1', borderRadius: 100, transition: 'width 0.5s' }} />
                        </div>
                    </div>

                    {/* Deficit / Overtime */}
                    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isOvertime ? 'Overtime' : 'Time Deficit'}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: isOvertime ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 10 }}>
                            {formatMinutes(Math.abs(diffMinutes))}
                            {isOvertime && <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: 100, verticalAlign: 'middle' }}>+ Extra</span>}
                        </div>
                    </div>

                    {/* Sessions Avg */}
                    <div className="stat-card" style={{ padding: 20, margin: 0, border: '1px solid var(--border)' }}>
                        <div>
                            <div className="stat-card-label">Avg / Session</div>
                            <div className="stat-card-value">{total > 0 ? formatMinutes(Math.round(correctedTotalMinutes / total)) : '—'}</div>
                            <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>Over {total} sessions</div>
                        </div>
                        <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><Clock size={20} color="#f59e0b" /></div>
                    </div>
                </div>

                {/* Period filter */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                    {PERIODS.filter(p => p.key !== 'custom').map(p => (
                        <button
                            key={p.key}
                            onClick={() => { setPeriod(p.key); setPage(1) }}
                            className={period === p.key ? 'btn-primary' : 'btn-secondary'}
                            style={{ fontSize: 12, padding: '6px 14px' }}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => { setPeriod('custom'); setPage(1) }}
                        className={period === 'custom' ? 'btn-primary' : 'btn-secondary'}
                        style={{ fontSize: 12, padding: '6px 14px' }}
                    >
                        Custom Range
                    </button>
                    {period === 'custom' && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12 }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => { setDateTo(e.target.value); setPage(1) }}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12 }}
                            />
                        </div>
                    )}
                </div>

                {/* Timesheet List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {loading ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : fetchError ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Failed to load attendance records. Please try again.</div>
                    ) : Object.keys(groupedRecords).length === 0 ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No attendance records found for this period.</div>
                    ) : (
                        Object.entries(groupedRecords).map(([day, dayRecords]) => {
                            const dateObj = parseISO(day)
                            const isToday = format(new Date(), 'yyyy-MM-dd') === day
                            const dayTotalMinutes = dayRecords.reduce((sum, r) => {
                                if (r.duration !== null) return sum + r.duration
                                return sum + Math.round((Date.now() - toUTC(r.punchIn).getTime()) / 60000)
                            }, 0)
                            const firstIn = dayRecords[dayRecords.length - 1].punchIn // items are ordered desc

                            const isExpanded = expandedDays[day]

                            // Check for missed punches (an active punch over 16h old)
                            const hasAnomaly = dayRecords.some(r => !r.punchOut && differenceInHours(new Date(), toUTC(r.punchIn)) > 16)

                            return (
                                <div key={day} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    {/* Day Header */}
                                    <div
                                        onClick={() => toggleDay(day)}
                                        style={{
                                            padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            cursor: 'pointer', background: isExpanded ? 'var(--bg-input)' : 'transparent',
                                            transition: 'background 0.2s', borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--bg-input)'}
                                        onMouseOut={e => !isExpanded && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 10, background: isToday ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: isToday ? '#fff' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isToday ? 'var(--accent-primary)' : 'var(--border)'}` }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{format(dateObj, 'MMM')}</div>
                                                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{format(dateObj, 'dd')}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {format(dateObj, 'EEEE')} {isToday && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: 4 }}>TODAY</span>}
                                                    {hasAnomaly && <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><AlertCircle size={14} /> Missing punch-out</span>}
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                                    {dayRecords.length} session{dayRecords.length > 1 ? 's' : ''} • First In: {format(toUTC(firstIn), 'hh:mm a')}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Daily Total</div>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: dayTotalMinutes >= 8 * 60 ? '#10b981' : 'var(--text-primary)' }}>{formatMinutes(dayTotalMinutes)}</div>
                                            </div>
                                            {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                                        </div>
                                    </div>

                                    {/* Detailed Punches */}
                                    {isExpanded && (
                                        <div style={{ padding: 0 }}>
                                            <table className="data-table" style={{ borderTop: 'none' }}>
                                                <thead style={{ background: 'var(--bg-card)' }}>
                                                    <tr>
                                                        <th style={{ paddingLeft: 80 }}>Punch In</th>
                                                        <th>Punch Out</th>
                                                        <th>Duration</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dayRecords.map((rec) => (
                                                        <tr key={rec.id}>
                                                            <td style={{ paddingLeft: 80, fontSize: 13, color: 'var(--text-secondary)' }}>{format(toUTC(rec.punchIn), 'hh:mm a')}</td>
                                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                                {rec.punchOut ? format(toUTC(rec.punchOut), 'hh:mm a') : (
                                                                    <span style={{ color: differenceInHours(new Date(), toUTC(rec.punchIn)) > 16 ? '#ef4444' : 'inherit' }}>—</span>
                                                                )}
                                                            </td>
                                                            <td style={{ fontSize: 13, fontWeight: 600 }}>{rec.duration ? formatMinutes(rec.duration) : '—'}</td>
                                                            <td>
                                                                <span className={`badge ${rec.punchOut ? 'badge-called' : 'badge-new'}`}>
                                                                    {rec.punchOut ? 'Completed' : 'Active'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Page {page} of {totalPages}
                        </span>
                        <div className="pagination">
                            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }
