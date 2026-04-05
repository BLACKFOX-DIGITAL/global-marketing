'use client'
import { useState, useEffect, useCallback } from 'react'
import {
    Users,
    Clock,
    Calendar,
    AlertCircle,
    Activity,
    Briefcase,
    X,
    UserX
} from 'lucide-react'
import { format, parseISO, differenceInHours, isWeekend, addDays } from 'date-fns'

interface User { id: string; name: string; email: string; role: string }
interface AttendanceRecord { id: string; punchIn: string; punchOut: string | null; duration: number | null; notes: string | null; user: User }
interface LeaveRequest { id: string; type: string; startDate: string; endDate: string; reason: string | null; status: string; createdAt: string; userId: string; user?: { name: string; email: string } }

function MetricCard({ label, value, subValue, icon: Icon, color, isAlert = false }: {
    label: string; value: string | number; subValue: string; icon: React.ElementType; color: string; isAlert?: boolean
}) {
    return (
        <div style={{
            padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.02)',
            border: isAlert ? `1px solid ${color}40` : '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 6, backdropFilter: 'blur(24px)',
            boxShadow: isAlert ? `0 0 15px ${color}10` : 'none', position: 'relative', overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, background: `radial-gradient(circle at 100% 0%, ${color}12, transparent)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: '#475569', fontWeight: 900, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: `${color}12`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}15` }}>
                    <Icon size={12} strokeWidth={2.5} />
                </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: isAlert ? color : '#f8fafc', letterSpacing: '-0.8px', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {value}
                <span style={{ fontSize: 9, color: '#444c5a', fontWeight: 800 }}>{subValue}</span>
            </div>
        </div>
    )
}

export default function WorkforceDashboard() {
    const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance')
    const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [leaveFilter, setLeaveFilter] = useState('Pending')

    const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null)
    const [editPunchIn, setEditPunchIn] = useState('')
    const [editPunchOut, setEditPunchOut] = useState('')
    const [editNote, setEditNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [leaveActionError, setLeaveActionError] = useState<string | null>(null)
    const [leaveActioning, setLeaveActioning] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [attRes, leaveRes] = await Promise.all([
                fetch(`/api/admin/attendance?date=${attendanceDate}`), fetch('/api/leave')
            ])
            if (attRes.ok && leaveRes.ok) {
                const attData = await attRes.json()
                setAttendanceRecords(attData.records)
                setAllUsers(attData.allUsers || [])
                setLeaveRequests((await leaveRes.json()).requests)
            } else setError('Failed to load workforce data.')
        } catch { setError('Connection error.') } finally { setLoading(false) }
    }, [attendanceDate])

    useEffect(() => { fetchData() }, [fetchData])

    async function handleSaveAttendance() {
        if (!editingAttendance) return
        if (editPunchOut && new Date(editPunchOut) <= new Date(editPunchIn)) {
            setSaveError('Clock-out must be after clock-in')
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            const payload = {
                punchIn: new Date(editPunchIn).toISOString(),
                punchOut: editPunchOut ? new Date(editPunchOut).toISOString() : null,
                notes: editNote
            }
            const res = await fetch(`/api/admin/attendance/${editingAttendance.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (res.ok) { setEditingAttendance(null); fetchData() }
            else setSaveError(data.error || 'Failed to save changes')
        } catch { setSaveError('Connection error') }
        setSaving(false)
    }

    async function handleLeaveAction(id: string, newStatus: string) {
        setLeaveActioning(id)
        setLeaveActionError(null)
        try {
            const res = await fetch(`/api/leave/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
            })
            if (!res.ok) {
                const d = await res.json()
                setLeaveActionError(d.error || 'Failed to update leave request')
            } else {
                fetchData()
            }
        } catch {
            setLeaveActionError('Connection error')
        } finally {
            setLeaveActioning(null)
        }
    }

    const calcDays = (s: string, e: string) => {
        const d1 = parseISO(s), d2 = parseISO(e)
        if (d2 < d1) return 0
        let days = 0, curr = d1
        while (curr <= d2) { if (!isWeekend(curr)) days++; curr = addDays(curr, 1) }
        return days
    }

    const punchedInIds = new Set(attendanceRecords.map(r => r.user.id))
    const onLeaveIds = new Set(
        leaveRequests
            .filter(r => r.status === 'Approved' && parseISO(r.startDate) <= parseISO(attendanceDate) && parseISO(r.endDate) >= parseISO(attendanceDate))
            .map(r => r.userId)
    )
    const absentees = allUsers.filter(u => !punchedInIds.has(u.id) && !onLeaveIds.has(u.id))

    const overdueCount = attendanceRecords.filter(r => !r.punchOut && differenceInHours(new Date(), parseISO(r.punchIn)) > 16).length
    const totalMinutes = attendanceRecords.reduce((acc, r) => acc + (r.duration || 0), 0)
    const avgHours = attendanceRecords.length > 0 ? (totalMinutes / 60 / attendanceRecords.length).toFixed(1) : '0.0'
    const pendingLeaveCount = leaveRequests.filter(r => r.status === 'Pending').length

    if (error) return <div style={{ padding: 40, color: '#f43f5e', fontWeight: 800 }}>{error}</div>

    return (
        <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-primary), #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)' }}>
                            <Users size={18} color="#fff" strokeWidth={2.5} />
                        </div>
                        Workforce
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>Monitor attendance and manage leave requests.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <MetricCard label="Clocked In" value={attendanceRecords.filter(r => !r.punchOut).length} subValue="currently working" icon={Users} color="var(--accent-primary)" />
                <MetricCard label="Pending Leave" value={pendingLeaveCount} subValue="awaiting approval" icon={Calendar} color="#f59e0b" />
                <MetricCard label="Avg Hours Today" value={`${avgHours}h`} subValue="per employee" icon={Clock} color="#10b981" />
                <MetricCard label="Missed Clock-Out" value={overdueCount} subValue="open session >16 hrs" icon={AlertCircle} color={overdueCount > 0 ? '#f43f5e' : '#10b981'} isAlert={overdueCount > 0} />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16, paddingBottom: '1px' }}>
                <button
                    onClick={() => setActiveTab('attendance')}
                    style={{ padding: '6px 14px', background: activeTab === 'attendance' ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', borderBottom: activeTab === 'attendance' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'attendance' ? '#f8fafc' : '#475569', fontWeight: 900, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', letterSpacing: '0.8px', textTransform: 'uppercase' }}
                >
                    <Activity size={13} strokeWidth={2.5} /> Attendance
                </button>
                <button
                    onClick={() => setActiveTab('leave')}
                    style={{ padding: '6px 14px', background: activeTab === 'leave' ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', borderBottom: activeTab === 'leave' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'leave' ? '#f8fafc' : '#475569', fontWeight: 900, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', letterSpacing: '0.8px', textTransform: 'uppercase' }}
                >
                    <Briefcase size={13} strokeWidth={2.5} /> Leave Requests {pendingLeaveCount > 0 && <span style={{ background: 'var(--accent-primary)', color: 'white', fontSize: 8, padding: '1px 5px', borderRadius: 6, fontWeight: 900 }}>{pendingLeaveCount}</span>}
                </button>
            </div>

            {leaveActionError && (
                <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 11, fontWeight: 700 }}>
                    {leaveActionError}
                </div>
            )}

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
                {/* Toolbar */}
                <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <h3 style={{ fontSize: 9.5, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b' }}>
                        {activeTab === 'attendance' ? 'Attendance Records' : 'Leave Requests'}
                    </h3>
                    {activeTab === 'attendance' ? (
                        <div style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={12} color="#64748b" />
                            <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 10, fontWeight: 800, outline: 'none', cursor: 'pointer' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 2, border: '1px solid var(--border)' }}>
                            {['Pending', 'Approved', 'Rejected', 'All'].map(s => (
                                <button key={s} onClick={() => setLeaveFilter(s)} style={{ padding: '3px 10px', borderRadius: 6, border: 'none', fontSize: 9, fontWeight: 900, background: leaveFilter === s ? 'var(--accent-primary)' : 'transparent', color: leaveFilter === s ? '#fff' : '#475569', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border)' }}>
                            {activeTab === 'attendance' ? (
                                <tr style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Employee</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Clock In</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Clock Out</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Duration</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Notes</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                                </tr>
                            ) : (
                                <tr style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Employee</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Leave Type</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Date Range</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Days</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Reason</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Status</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                            ) : activeTab === 'attendance' ? (
                                attendanceRecords.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#475569', fontWeight: 800, fontSize: 12 }}>No records for this date</td></tr>
                                ) : (
                                    attendanceRecords.map(r => {
                                        const isOverdue = !r.punchOut && differenceInHours(new Date(), parseISO(r.punchIn)) > 16
                                        return (
                                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }}>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, var(--accent-primary), #4338ca)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, flexShrink: 0 }}>{r.user.name.substring(0, 2).toUpperCase()}</div>
                                                        <div>
                                                            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f8fafc' }}>{r.user.name}</div>
                                                            <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 1 }}>{r.user.role}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{format(parseISO(r.punchIn), 'hh:mm a')}</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                                    <div style={{ fontSize: 10.5, fontWeight: 900, color: r.punchOut ? '#94a3b8' : isOverdue ? '#f43f5e' : '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        {r.punchOut ? format(parseISO(r.punchOut), 'hh:mm a') : <><div style={{ width: 5, height: 5, borderRadius: '50%', background: isOverdue ? '#f43f5e' : '#10b981', animation: 'pulse 2s infinite' }} />{isOverdue ? 'Overdue' : 'Still Clocked In'}</>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{r.duration ? `${Math.floor(r.duration / 60)}h ${r.duration % 60}m` : '—'}</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>{r.notes || '—'}</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                    <button onClick={() => { setEditingAttendance(r); setEditPunchIn(format(parseISO(r.punchIn), "yyyy-MM-dd'T'HH:mm")); setEditPunchOut(r.punchOut ? format(parseISO(r.punchOut), "yyyy-MM-dd'T'HH:mm") : ''); setEditNote(r.notes || ''); setSaveError(null) }} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Edit</button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )
                            ) : (
                                leaveRequests.filter(r => leaveFilter === 'All' ? true : r.status === leaveFilter).length === 0 ? (
                                    <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: '#475569', fontWeight: 800, fontSize: 12 }}>No leave requests found</td></tr>
                                ) : (
                                    leaveRequests.filter(r => leaveFilter === 'All' ? true : r.status === leaveFilter).map(req => {
                                        const days = calcDays(req.startDate, req.endDate)
                                        return (
                                            <tr key={req.id} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }}>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #0d9488, #0f172a)', border: '1px solid rgba(13, 148, 136, 0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, flexShrink: 0 }}>{req.user?.name.substring(0, 2).toUpperCase()}</div>
                                                        <div>
                                                            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f8fafc' }}>{req.user?.name}</div>
                                                            <div style={{ fontSize: 8.5, color: '#475569', fontWeight: 700, marginTop: 1 }}>{req.user?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 11.5, fontWeight: 800, color: '#f1f5f9' }}>{req.type}</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>{format(parseISO(req.startDate), 'MMM dd')} – {format(parseISO(req.endDate), 'MMM dd, yyyy')}</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 11.5, color: '#94a3b8', fontWeight: 700 }}>{days}d</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 10.5, color: '#64748b', fontWeight: 600, maxWidth: 200 }}>
                                                    <span title={req.reason || ''} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason || <span style={{ color: '#334155', fontStyle: 'italic' }}>No reason provided</span>}</span>
                                                </td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle' }}>
                                                    <div style={{ fontSize: 8.5, fontWeight: 900, padding: '2px 8px', borderRadius: 4, display: 'inline-block',
                                                        background: req.status === 'Pending' ? 'rgba(245,158,11,0.05)' : req.status === 'Approved' ? 'rgba(16,185,129,0.05)' : 'rgba(244,63,94,0.05)',
                                                        color: req.status === 'Pending' ? '#f59e0b' : req.status === 'Approved' ? '#10b981' : '#f43f5e',
                                                        border: `1px solid ${req.status === 'Pending' ? '#f59e0b30' : req.status === 'Approved' ? '#10b98130' : '#f43f5e30'}`,
                                                        textTransform: 'uppercase', letterSpacing: '0.4px'
                                                    }}>{req.status}</div>
                                                </td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                    {req.status === 'Pending' ? (
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                            <button onClick={() => handleLeaveAction(req.id, 'Approved')} disabled={leaveActioning === req.id} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, cursor: leaveActioning === req.id ? 'wait' : 'pointer', textTransform: 'uppercase', opacity: leaveActioning === req.id ? 0.6 : 1 }}>Approve</button>
                                                            <button onClick={() => handleLeaveAction(req.id, 'Rejected')} disabled={leaveActioning === req.id} style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, cursor: leaveActioning === req.id ? 'wait' : 'pointer', textTransform: 'uppercase', opacity: leaveActioning === req.id ? 0.6 : 1 }}>Deny</button>
                                                        </div>
                                                    ) : <span style={{ fontSize: 9, color: '#475569', fontWeight: 900, textTransform: 'uppercase' }}>Actioned</span>}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Absentee Section — employees with no record for the selected date */}
            {activeTab === 'attendance' && !loading && absentees.length > 0 && (
                <div style={{ marginTop: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
                    <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(244,63,94,0.03)' }}>
                        <UserX size={13} color="#f43f5e" strokeWidth={2.5} />
                        <h3 style={{ fontSize: 9.5, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#f43f5e' }}>
                            Not Clocked In Today — {absentees.length} employee{absentees.length !== 1 ? 's' : ''}
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
                        {absentees.map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.12)' }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(244,63,94,0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900 }}>{u.name.substring(0, 2).toUpperCase()}</div>
                                <div>
                                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#f1f5f9' }}>{u.name}</div>
                                    <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 600 }}>{u.email}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Attendance Modal */}
            {editingAttendance && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setEditingAttendance(null)}>
                    <div style={{ width: 380, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: '0 30px 60px rgba(0,0,0,0.5)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f8fafc' }}>Edit Attendance</h3>
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: 600 }}>{editingAttendance.user.name}</div>
                            </div>
                            <button onClick={() => setEditingAttendance(null)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Clock In</label>
                                <input type="datetime-local" value={editPunchIn} onChange={e => setEditPunchIn(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#f8fafc', outline: 'none', fontSize: 12, fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Clock Out <span style={{ color: '#334155', fontWeight: 600, textTransform: 'none', fontSize: 8 }}>(optional)</span></label>
                                <input type="datetime-local" value={editPunchOut} onChange={e => setEditPunchOut(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#f8fafc', outline: 'none', fontSize: 12, fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Notes</label>
                                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#f8fafc', resize: 'none', outline: 'none', fontSize: 11, fontWeight: 600 }} />
                            </div>
                            {saveError && <div style={{ fontSize: 11, color: '#f43f5e', fontWeight: 700 }}>{saveError}</div>}
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button onClick={() => setEditingAttendance(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: '#94a3b8', fontWeight: 900, fontSize: 10, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase' }}>Cancel</button>
                                <button onClick={handleSaveAttendance} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 900, fontSize: 10, cursor: 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s', textTransform: 'uppercase' }}>{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
