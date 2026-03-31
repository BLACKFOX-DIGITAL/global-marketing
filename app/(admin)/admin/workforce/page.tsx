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

    if (error) return <div style={{ padding: 40, color: '#f43f5e', fontWeight: 800 }}>{error}</div>

    return (
        <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            {/* Header Section */}
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-primary), #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)' }}>
                            <Users size={18} color="#fff" strokeWidth={2.5} />
                        </div>
                        Workforce Intelligence
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>Strategic live attendance monitoring and workforce availability matrix.</p>
                </div>
            </div>

            {/* High-Density Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <MetricCard label="Active Status" value={stats.punchedIn} subValue="Operators Clocked In" icon={Users} color="var(--accent-primary)" />
                <MetricCard label="Pending Review" value={stats.pendingLeave} subValue="Awaiting Absence Approval" icon={Calendar} color="#f59e0b" />
                <MetricCard label="Temporal Avg" value={`${stats.avgHours}h`} subValue="System Daily Average" icon={Clock} color="#10b981" />
                <MetricCard label="System Anomalies" value={stats.anomalies} subValue="Critical Punch Failures" icon={AlertCircle} color={stats.anomalies > 0 ? '#f43f5e' : '#10b981'} isAlert={stats.anomalies > 0} />
            </div>

            {/* Content Switcher (Obsidian Tabs) */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16, paddingBottom: '1px' }}>
                <button
                    onClick={() => setActiveTab('attendance')}
                    style={{ padding: '6px 14px', background: activeTab === 'attendance' ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', borderBottom: activeTab === 'attendance' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'attendance' ? '#f8fafc' : '#475569', fontWeight: 900, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', letterSpacing: '0.8px', textTransform: 'uppercase' }}
                >
                    <Activity size={13} strokeWidth={2.5} /> Live Attendance
                </button>
                <button
                    onClick={() => setActiveTab('leave')}
                    style={{ padding: '6px 14px', background: activeTab === 'leave' ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', borderBottom: activeTab === 'leave' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'leave' ? '#f8fafc' : '#475569', fontWeight: 900, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', letterSpacing: '0.8px', textTransform: 'uppercase' }}
                >
                    <Briefcase size={13} strokeWidth={2.5} /> Leave Hub {stats.pendingLeave > 0 && <span style={{ background: 'var(--accent-primary)', color: 'white', fontSize: 8, padding: '1px 5px', borderRadius: 6, fontWeight: 900 }}>{stats.pendingLeave}</span>}
                </button>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
                {/* Dynamic Matrix Toolbar */}
                <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <h3 style={{ fontSize: 9.5, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b' }}>
                        {activeTab === 'attendance' ? 'Daily Temporal Logs' : 'Critical Absence Requests'}
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

                {/* Table Matrix */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border)' }}>
                            {activeTab === 'attendance' ? (
                                <tr style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Professional Identity</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Temporal Start</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Temporal End</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Shift Velocity</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Context Log</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800, textAlign: 'right' }}>Operation</th>
                                </tr>
                            ) : (
                                <tr style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Professional Identity</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Absence Protocol</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Scale</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Interval</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800 }}>Authorization</th>
                                    <th style={{ padding: '10px 20px', fontWeight: 800, textAlign: 'right' }}>Decision Matrix</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                             {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                             ) : activeTab === 'attendance' ? (
                                attendanceRecords.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#475569', fontWeight: 800, fontSize: 12 }}>SYSTEM NOMINAL • ZERO DATA DETECTED</td></tr>
                                ) : (
                                    attendanceRecords.map(r => {
                                        const isAnom = !r.punchOut && differenceInHours(new Date(), parseISO(r.punchIn)) > 16
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
                                                    <div style={{ fontSize: 10.5, fontWeight: 900, color: r.punchOut ? '#94a3b8' : isAnom ? '#f43f5e' : '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        {r.punchOut ? format(parseISO(r.punchOut), 'hh:mm a') : <><div style={{ width: 5, height: 5, borderRadius: '50%', background: isAnom ? '#f43f5e' : '#10b981', animation: 'pulse 2s infinite' }} /> {isAnom ? 'STALE ALERT' : 'ACTIVE'}</>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{r.duration ? `${Math.floor(r.duration / 60)}h ${r.duration % 60}m` : '—'}</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>{r.notes || '—'}</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                    <button onClick={() => { setEditingAttendance(r); setEditPunchIn(format(parseISO(r.punchIn), "yyyy-MM-dd'T'HH:mm")); setEditPunchOut(r.punchOut ? format(parseISO(r.punchOut), "yyyy-MM-dd'T'HH:mm") : ''); setEditNote(r.notes || '') }} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Adjust</button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )
                             ) : (
                                leaveRequests.filter(r => leaveFilter === 'All' ? true : r.status === leaveFilter).length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#475569', fontWeight: 800, fontSize: 12 }}>ZERO ABSENCE REQUESTS FOUND</td></tr>
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
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 11.5, color: '#94a3b8', fontWeight: 700 }}>{days} Days</td>
                                                <td style={{ padding: '6px 20px', verticalAlign: 'middle', fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>{format(parseISO(req.startDate), 'MMM dd')} - {format(parseISO(req.endDate), 'MMM dd')}</td>
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
                                                            <button onClick={() => handleLeaveAction(req.id, 'Approved')} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' }}>Authorize</button>
                                                            <button onClick={() => handleLeaveAction(req.id, 'Rejected')} style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' }}>Deny</button>
                                                        </div>
                                                    ) : <span style={{ fontSize: 9, color: '#475569', fontWeight: 900, textTransform: 'uppercase' }}>Terminated</span>}
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

            {/* Edit Modal (Obsidian Elite) */}
            {editingAttendance && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setEditingAttendance(null)}>
                    <div style={{ width: 380, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: '0 30px 60px rgba(0,0,0,0.5)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b' }}>Temporal Adjustment Matrix</h3>
                            <button onClick={() => setEditingAttendance(null)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.color='#475569'}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Shift Origin</label>
                                <input type="datetime-local" value={editPunchIn} onChange={e => setEditPunchIn(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#f8fafc', outline: 'none', fontSize: 12, fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Shift Termination</label>
                                <input type="datetime-local" value={editPunchOut} onChange={e => setEditPunchOut(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#f8fafc', outline: 'none', fontSize: 12, fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Operational Context</label>
                                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#f8fafc', resize: 'none', outline: 'none', fontSize: 11, fontWeight: 600 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button onClick={() => setEditingAttendance(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: '#94a3b8', fontWeight: 900, fontSize: 10, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase' }}>Abort</button>
                                <button onClick={handleSaveAttendance} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 900, fontSize: 10, cursor: 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s', textTransform: 'uppercase' }}>{saving ? 'Processing...' : 'Authorize'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
