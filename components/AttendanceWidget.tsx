'use client'
import { useState, useEffect } from 'react'
import { Timer, ArrowRight, Play, Square, History, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface AttendanceRecord {
    id: string
    punchIn: string
    punchOut: string | null
    duration: number | null
}

export function AttendanceWidget() {
    const [punchedIn, setPunchedIn] = useState(false)
    const [punchRecord, setPunchRecord] = useState<AttendanceRecord | null>(null)
    const [elapsed, setElapsed] = useState(0)
    const [punching, setPunching] = useState(false)
    const [lastRecords, setLastRecords] = useState<AttendanceRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStatus() {
            try {
                const [statusRes, historyRes] = await Promise.all([
                    fetch('/api/attendance/status', { cache: 'no-store' }),
                    fetch('/api/attendance?period=month&limit=5', { cache: 'no-store' })
                ])
                
                const status = await statusRes.json()
                const history = await historyRes.json()
                
                if (status.punchedIn && status.record) {
                    setPunchedIn(true)
                    setPunchRecord(status.record)
                    setElapsed(Math.floor((Date.now() - new Date(status.record.punchIn).getTime()) / 1000))
                }
                
                if (history && Array.isArray(history.records)) {
                    setLastRecords(history.records.slice(0, 3))
                }
            } catch (err) {
                console.error('Failed to fetch attendance:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchStatus()
    }, [])

    useEffect(() => {
        if (!punchedIn) return
        const interval = setInterval(() => {
            setElapsed(e => e + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [punchedIn])

    async function handlePunch() {
        setPunching(true)
        try {
            const res = await fetch('/api/attendance/punch', { method: 'POST' })
            const d = await res.json()
            if (d.action === 'punch_in') {
                setPunchedIn(true)
                setPunchRecord(d.record)
                setElapsed(0)
            } else {
                setPunchedIn(false)
                setPunchRecord(null)
                // Refresh history
                const hRes = await fetch('/api/attendance?period=month&limit=5', { cache: 'no-store' })
                const history = await hRes.json()
                if (history && Array.isArray(history.records)) setLastRecords(history.records.slice(0, 3))
            }
        } catch (err) {
            console.error('Punch failed:', err)
        } finally {
            setPunching(false)
        }
    }

    const timerH = String(Math.floor(elapsed / 3600)).padStart(2, '0')
    const timerM = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
    const timerS = String(elapsed % 60).padStart(2, '0')

    const totalExpectedHours = 8
    const progressPercent = Math.min(100, (elapsed / (totalExpectedHours * 3600)) * 100)

    if (loading) return (
        <div className="card glass" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
        </div>
    )

    return (
        <div className="card glass" style={{ 
            padding: '24px', 
            background: punchedIn ? 'linear-gradient(145deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.05) 100%)' : 'var(--bg-card)',
            border: punchedIn ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            minHeight: 380,
            flex: 1
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: punchedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: punchedIn ? '#10b981' : 'var(--accent-primary)' }}>
                        <Timer size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Work Session</h3>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{punchedIn ? 'In Progress' : 'Pending'}</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: punchedIn ? '#10b981' : 'var(--text-muted)' }}>
                        {timerH}:{timerM}:{timerS}
                    </div>
                </div>
            </div>

            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ 
                    height: '100%', 
                    width: `${progressPercent}%`, 
                    background: punchedIn ? 'linear-gradient(90deg, #10b981, #34d399)' : 'var(--border)',
                    borderRadius: 10,
                    transition: 'width 1s ease-out'
                }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <button 
                    onClick={handlePunch}
                    disabled={punching}
                    style={{
                        flex: 1, height: 44, borderRadius: 12, border: 'none',
                        background: punchedIn ? '#ef4444' : 'var(--accent-primary)',
                        color: 'white', fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: punchedIn ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(99, 102, 241, 0.3)',
                        cursor: punching ? 'wait' : 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {punching ? '...' : punchedIn ? <><Square size={16} fill="white" /> Finish Shift</> : <><Play size={16} fill="white" /> Start Shift</>}
                </button>
            </div>

            {/* Last Sessions mini-list */}
            <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <History size={12} /> Recent Sessions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {lastRecords.length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No recent sessions.</div>
                    ) : (
                        lastRecords.map(rec => (
                            <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(0,0,0,0.1)', borderRadius: 8, fontSize: 11 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Clock size={10} color="var(--text-muted)" />
                                    <span style={{ fontWeight: 600 }}>{format(new Date(rec.punchIn), 'MMM d')}</span>
                                </div>
                                <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    {rec.duration ? `${Math.floor(rec.duration / 60)}h ${rec.duration % 60}m` : '—'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
