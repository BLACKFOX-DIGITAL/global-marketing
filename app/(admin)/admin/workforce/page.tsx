'use client'
import { useState, useEffect, useCallback } from 'react'
import {
    Users,
    Clock,
    Calendar,
    AlertCircle,
    Activity,
    Briefcase,
    X
} from 'lucide-react'
import { format, parseISO, differenceInHours, isWeekend, addDays } from 'date-fns'

interface User { id: string; name: string; email: string; role: string }
interface AttendanceRecord { id: string; punchIn: string; punchOut: string | null; duration: number | null; notes: string | null; user: User }
interface LeaveRequest { id: string; type: string; startDate: string; endDate: string; reason: string | null; status: string; createdAt: string; userId: string; user?: { name: string; email: string } }

// Elegant Top Metric Card
function MetricCard({ label, value, subValue, icon: Icon, color, isAlert = false }: any) {
    return (
        <div style={{
            padding: '20px 24px', borderRadius: '16px', background: 'var(--bg-card)',
            border: isAlert ? `1px solid ${color}40` : '1px solid var(--border)',
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} />
                </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: isAlert ? color : 'var(--text-primary)', marginTop: 4 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontWeight: 500 }}>{subValue}</div>
        </div>
    )
}

export default function WorkforceDashboard() {
    const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance')
    const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [leaveFilter, setLeaveFilter] = useState('Pending')

    const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null)
    const [editPunchIn, setEditPunchIn] = useState('')
    const [editPunchOut, setEditPunchOut] = useState('')
    const [editNote, setEditNote] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [attRes, leaveRes] = await Promise.all([
                fetch(`/api/admin/attendance?date=${attendanceDate}`), fetch('/api/leave')
            ])
            if (attRes.ok && leaveRes.ok) {
                setAttendanceRecords((await attRes.json()).records)
                setLeaveRequests((await leaveRes.json()).requests)
            } else setError('Authorization failed.')
        } catch { setError('Connection failure.') } finally { setLoading(false) }
    }, [attendanceDate])

    useEffect(() => { fetchData() }, [fetchData])

    async function handleSaveAttendance() {
        if (!editingAttendance) return
        setSaving(true)
        try {
            const payload = { punchIn: new Date(editPunchIn).toISOString(), punchOut: editPunchOut ? new Date(editPunchOut).toISOString() : null, notes: editNote }
            const res = await fetch(`/api/admin/attendance/${editingAttendance.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            })
            if (res.ok) { setEditingAttendance(null); fetchData() }
        } catch { alert('Invalid date format') }
        setSaving(false)
    }

    async function handleLeaveAction(id: string, newStatus: string) {
        await fetch(`/api/leave/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
        })
        fetchData()
    }

    const calcDays = (s: string, e: string) => {
        const d1 = parseISO(s), d2 = parseISO(e)
        if (d2 < d1) return 0
        let days = 0, curr = d1
        while (curr <= d2) { if (!isWeekend(curr)) days++; curr = addDays(curr, 1) }
        return days
    }

    const stats = {
        punchedIn: attendanceRecords.filter(r => !r.punchOut).length,
        pendingLeave: leaveRequests.filter(r => r.status === 'Pending').length,
        anomalies: attendanceRecords.filter(r => !r.punchOut && differenceInHours(new Date(), parseISO(r.punchIn)) > 16).length,
        avgHours: attendanceRecords.length > 0 ? (attendanceRecords.reduce((acc, r) => acc + (r.duration || 0), 0) / 60 / attendanceRecords.length).toFixed(1) : '0.0'
    }

    if (error) return <div style={{ padding: 40 }}>{error}</div>

    return (
        <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--text-primary)' }}>Attendance</h1>
                <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>Global attendance and team availability management.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                <MetricCard label="Active Personnel" value={stats.punchedIn} subValue="Clocked in today" icon={Users} color="var(--accent-primary)" />
                <MetricCard label="Pending Leave" value={stats.pendingLeave} subValue="Awaiting approval" icon={Calendar} color="#f59e0b" />
                <MetricCard label="Avg. Shift Length" value={`${stats.avgHours}h`} subValue="System average" icon={Clock} color="var(--accent-cyan)" />
                <MetricCard label="Shift Anomalies" value={stats.anomalies} subValue="Stale or missed punch-outs" icon={AlertCircle} color={stats.anomalies > 0 ? '#ef4444' : 'var(--accent-emerald)'} isAlert={stats.anomalies > 0} />
            </div>

            {/* Content Switcher */}
            <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                <button
                    onClick={() => setActiveTab('attendance')}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'attendance' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'attendance' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                >
                    <Activity size={16} /> Live Attendance
                </button>
                <button
                    onClick={() => setActiveTab('leave')}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'leave' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'leave' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                >
                    <Briefcase size={16} /> Leave Management {stats.pendingLeave > 0 && <span style={{ background: '#ef4444', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>{stats.pendingLeave}</span>}
                </button>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                {/* Dynamic Toolbar */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                        {activeTab === 'attendance' ? 'Daily Records' : 'Absence Requests'}
                    </h3>
                    {activeTab === 'attendance' ? (
                        <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                    ) : (
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 4 }}>
                            {['Pending', 'Approved', 'Rejected', 'All'].map(s => (
                                <button key={s} onClick={() => setLeaveFilter(s)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, background: leaveFilter === s ? 'var(--accent-primary)' : 'transparent', color: leaveFilter === s ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>{s}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Table Area */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        {activeTab === 'attendance' ? (
                            <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Employee</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Punch In</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Punch Out</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Duration</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Notes</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                            </tr>
                        ) : (
                            <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Employee</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Absence Type</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Duration</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Schedule</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600, textAlign: 'right' }}>Decision</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></td></tr>
                        ) : activeTab === 'attendance' ? (
                            attendanceRecords.length === 0 ? <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr> :
                            attendanceRecords.map(r => {
                                const isAnom = !r.punchOut && differenceInHours(new Date(), parseISO(r.punchIn)) > 16
                                return (
                                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                                {r.user.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.user.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.user.role}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)' }}>{format(parseISO(r.punchIn), 'hh:mm a')}</td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, color: r.punchOut ? 'var(--text-secondary)' : isAnom ? '#ef4444' : 'var(--accent-cyan)' }}>
                                            {r.punchOut ? format(parseISO(r.punchOut), 'hh:mm a') : isAnom ? 'STALE' : 'ACTIVE'}
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.duration ? `${Math.floor(r.duration / 60)}h ${r.duration % 60}m` : '—'}</td>
                                        <td style={{ padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)' }}>{r.notes || '—'}</td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <button onClick={() => { setEditingAttendance(r); setEditPunchIn(format(parseISO(r.punchIn), "yyyy-MM-dd'T'HH:mm")); setEditPunchOut(r.punchOut ? format(parseISO(r.punchOut), "yyyy-MM-dd'T'HH:mm") : ''); setEditNote(r.notes || '') }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                                EDIT
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            leaveRequests.filter(r => leaveFilter === 'All' ? true : r.status === leaveFilter).length === 0 ? <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No requests found.</td></tr> :
                            leaveRequests.filter(r => leaveFilter === 'All' ? true : r.status === leaveFilter).map(req => {
                                const days = calcDays(req.startDate, req.endDate)
                                return (
                                    <tr key={req.id} style={{ borderTop: '1px solid var(--border)' }}>
                                         <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-cyan)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                                {req.user?.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{req.user?.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.user?.email}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{req.type}</td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)' }}>{days} Days</td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {format(parseISO(req.startDate), 'MMM dd')} - {format(parseISO(req.endDate), 'MMM dd, yyyy')}
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                                                background: req.status === 'Pending' ? 'rgba(245,158,11,0.1)' : req.status === 'Approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: req.status === 'Pending' ? '#f59e0b' : req.status === 'Approved' ? '#10b981' : '#ef4444',
                                            }}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            {req.status === 'Pending' ? (
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleLeaveAction(req.id, 'Approved')} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>APPROVE</button>
                                                    <button onClick={() => handleLeaveAction(req.id, 'Rejected')} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>REJECT</button>
                                                </div>
                                            ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Processed</span>}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal (Minimalist) */}
            {editingAttendance && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setEditingAttendance(null)}>
                    <div style={{ width: 400, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Adjust Time Record</h3>
                            <button onClick={() => setEditingAttendance(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Punch In</label>
                                <input type="datetime-local" value={editPunchIn} onChange={e => setEditPunchIn(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Punch Out</label>
                                <input type="datetime-local" value={editPunchOut} onChange={e => setEditPunchOut(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Notes</label>
                                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white', resize: 'none', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                <button onClick={() => setEditingAttendance(null)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleSaveAttendance} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
