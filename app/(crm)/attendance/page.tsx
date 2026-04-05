'use client'
import { useState, useEffect, useRef } from 'react'
import NotificationCenter from '@/components/NotificationCenter'
import { Play, Square, Timer, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'

interface AttendanceRecord {
    id: string; punchIn: string; punchOut: string | null; duration: number | null
}

function formatDuration(seconds: number) {
    const absSeconds = Math.abs(seconds)
    const h = Math.floor(absSeconds / 3600)
    const m = Math.floor((absSeconds % 3600) / 60)
    const s = Math.floor(absSeconds % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}


function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60)
    const m = Math.floor(mins % 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m`
    return '0m'
}

function formatSessionTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

function StatusBadge({ active }: { active: boolean }) {
    if (active) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                Working Now
            </div>
        )
    }
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
            Not Clocked In
        </div>
    )
}

export default function AttendancePage() {
    const [punchedIn, setPunchedIn] = useState(false)
    const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null)
    const [elapsed, setElapsed] = useState(0)
    const [loading, setLoading] = useState(true)
    const [punching, setPunching] = useState(false)
    const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([])
    const [todayMinutes, setTodayMinutes] = useState(0)
    const [now, setNow] = useState(new Date())
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const clockRef = useRef<NodeJS.Timeout | null>(null)

    // Fetch status on load
    useEffect(() => {
        Promise.all([
            fetch('/api/attendance/status').then(r => r.json()),
            fetch('/api/attendance?period=today&limit=5').then(r => r.json()),
        ]).then(([status, log]) => {
            if (status.punchedIn && status.record) {
                setPunchedIn(true)
                setCurrentRecord(status.record)
                const start = new Date(status.record.punchIn).getTime()
                setElapsed(Math.floor((Date.now() - start) / 1000))
            }
            setRecentRecords(log.records || [])
            setTodayMinutes(log.totalMinutes || 0)
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [])

    // Running timer - re-calculate from punchIn on every tick with timezone safety
    useEffect(() => {
        if (punchedIn && currentRecord) {
            // Ensure we parse the string correctly
            const punchInStr = currentRecord.punchIn
            const start = new Date(punchInStr).getTime()
            
            console.log(`[TIMER] Syncing: Now=${Date.now()}, Start=${start}, Diff=${Date.now() - start}`)

            timerRef.current = setInterval(() => {
                const now = Date.now()
                // If start is in the future compared to now, show 0 instead of negative
                const diffSeconds = Math.max(0, Math.floor((now - start) / 1000))
                setElapsed(diffSeconds)
            }, 1000)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [punchedIn, currentRecord])



    // Live clock
    useEffect(() => {
        clockRef.current = setInterval(() => setNow(new Date()), 1000)
        return () => { if (clockRef.current) clearInterval(clockRef.current) }
    }, [])

    async function handlePunch() {
        setPunching(true)
        const res = await fetch('/api/attendance/punch', { method: 'POST' })
        const data = await res.json()
        if (data.action === 'punch_in') {
            setPunchedIn(true)
            setCurrentRecord(data.record)
            setElapsed(0)
        } else {
            setPunchedIn(false)
            setCurrentRecord(null)
            setElapsed(0)
            // Refresh records
            const log = await fetch('/api/attendance?period=today&limit=5').then(r => r.json())
            setRecentRecords(log.records || [])
            setTodayMinutes(log.totalMinutes || 0)
        }
        setPunching(false)
    }

    if (loading) return (
            <div className="crm-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, paddingTop: 16 }}>
                <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
    )

    return (
        <div className="crm-content" style={{ paddingTop: 16 }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <h2>Attendance</h2>
                            <StatusBadge active={punchedIn} />
                        </div>
                        <p>Track your daily work hours by clocking in and out.</p>
                    </div>
                    <NotificationCenter />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                    {/* Main punch area */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px', position: 'relative', overflow: 'hidden' }}>
                        {punchedIn && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, transparent, #10b981, transparent)', opacity: 0.3 }} />
                        )}
                        {/* Current time */}
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                            <CalendarDays size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            {format(now, 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 32, fontVariantNumeric: 'tabular-nums' }}>
                            {format(now, 'hh:mm:ss a')}
                        </div>

                        {/* Timer display */}
                        <div style={{
                            width: 200, height: 200, borderRadius: '50%',
                            border: `4px solid ${punchedIn ? '#10b981' : 'var(--border)'}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 32, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: punchedIn ? '0 0 40px rgba(16,185,129,0.1)' : 'none',
                            transform: punchedIn ? 'scale(1.02)' : 'scale(1)'
                        }}>
                            <Timer size={20} color={punchedIn ? '#10b981' : 'var(--text-muted)'} style={{ marginBottom: 8 }} />
                            <div style={{
                                fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                                color: punchedIn ? '#10b981' : 'var(--text-muted)',
                            }}>
                                {formatDuration(elapsed)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {punchedIn ? 'Time Elapsed' : 'Not Started'}
                            </div>
                        </div>

                        {/* Punch button */}
                        <button
                            onClick={handlePunch}
                            disabled={punching}
                            style={{
                                width: 200, height: 52, borderRadius: 14,
                                background: punchedIn
                                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                    : 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white', border: 'none', fontSize: 16, fontWeight: 700,
                                cursor: punching ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: punchedIn
                                    ? '0 8px 24px rgba(239, 68, 68, 0.25)'
                                    : '0 8px 24px rgba(16, 185, 129, 0.25)',
                                opacity: punching ? 0.7 : 1,
                            }}
                        >
                            {punching ? (
                                <div className="spinner" />
                            ) : punchedIn ? (
                                <><Square size={18} fill="white" /> Clock Out</>
                            ) : (
                                <><Play size={18} fill="white" /> Clock In</>
                            )}
                        </button>

                        {punchedIn && currentRecord && (
                            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                                Clocked in at {format(new Date(currentRecord.punchIn), 'hh:mm a')}
                            </div>
                        )}
                    </div>

                    {/* Sidebar summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Today's summary */}
                        <div className="card">
                            <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Timer size={14} color="var(--accent-primary)" />
                                Today&apos;s Summary
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{
                                    flex: 1.5, background: 'rgba(99,102,241,0.06)', borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                                    border: '1px solid rgba(99,102,241,0.1)'
                                }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-secondary)' }}>
                                        {formatSessionTime(todayMinutes * 60 + (punchedIn ? elapsed : 0))}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase' }}>Total Hours</div>
                                </div>
                                <div style={{
                                    flex: 1, background: 'rgba(16,185,129,0.06)', borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                                    border: '1px solid rgba(16,185,129,0.1)'
                                }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{recentRecords.length}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase' }}>Sessions</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent punches */}
                        <div className="card" style={{ padding: 0 }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>Recent Activity</div>
                            {recentRecords.length === 0 && (
                                <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>No sessions recorded today</div>
                            )}
                            {recentRecords.map(rec => (
                                <div key={rec.id} style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                                            {format(new Date(rec.punchIn), 'hh:mm a')}
                                            {rec.punchOut && <span style={{ color: 'var(--text-muted)' }}> → {format(new Date(rec.punchOut), 'hh:mm a')}</span>}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: rec.punchOut ? '#10b981' : '#f59e0b' }}>
                                        {rec.duration ? formatMinutes(rec.duration) : 'In Progress'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
