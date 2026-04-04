'use client'
import { useState, useEffect, useCallback } from 'react'
import NotificationCenter from '@/components/NotificationCenter'
import { Plus, X, Trash2, Calendar, FileText, Upload } from 'lucide-react'
import { format, parseISO, isWeekend, addDays } from 'date-fns'

interface LeaveRequest {
    id: string; type: string; startDate: string; endDate: string; reason: string | null; status: string; createdAt: string
    user?: { name: string; email: string }
    userId: string
}



function calculateWorkingDays(start: string, end: string) {
    if (!start || !end) return 0;
    const s = parseISO(start);
    const e = parseISO(end);
    if (e < s) return 0;

    let days = 0;
    let curr = s;
    while (curr <= e) {
        if (!isWeekend(curr)) days++;
        curr = addDays(curr, 1);
    }
    return days;
}

function StatusBadge({ status }: { status: string }) {
    const colorMap: Record<string, string> = {
        'Pending': '#f59e0b',
        'Approved': '#10b981',
        'Rejected': '#ef4444',
    }
    const color = colorMap[status] || '#6366f1'
    return (
        <span className="badge" style={{
            background: `${color}15`,
            color,
            border: `1px solid ${color}30`,
            padding: '4px 12px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase'
        }}>
            {status}
        </span>
    )
}

export default function LeavePage() {
    const [requests, setRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const [user, setUser] = useState<{ userId: string } | null>(null)

    // Form state
    const [type, setType] = useState('Casual Leave')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isHalfDay, setIsHalfDay] = useState(false)
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [leaveSettings, setLeaveSettings] = useState<Array<{ id: string, value: string, color: string | null }>>([])

    const [apiHolidays, setApiHolidays] = useState<Array<{ name: string; date: string }>>([])
    const fetchRequests = useCallback(async () => {
        const [leaveRes, settingsRes] = await Promise.all([
            fetch('/api/leave'),
            fetch('/api/admin/settings?category=LEAVE_TYPE')
        ])

        if (leaveRes.ok) {
            const d = await leaveRes.json()
            setRequests(d.requests)
            setUser(d.user)
            setApiHolidays(d.holidays || [])
        }

        const sData = await settingsRes.json()
        const options = sData.options || []
        setLeaveSettings(options)
        if (options.length > 0) setType(t => t || options[0].value)

        setLoading(false)
    }, [])

    useEffect(() => {
        requestAnimationFrame(() => {
            fetchRequests()
        })
    }, [fetchRequests])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setSubmitError(null)

        const res = await fetch('/api/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, startDate, endDate, reason }),
        })

        setSubmitting(false)

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setSubmitError(data.error || 'Failed to submit leave request')
            return
        }

        setShowModal(false)
        setType('Casual Leave')
        setStartDate('')
        setEndDate('')
        setReason('')
        setFile(null)
        setSubmitError(null)
        fetchRequests()
    }

    async function handleCancel(id: string) {
        setProcessing(id)
        await fetch(`/api/leave/${id}`, { method: 'DELETE' })
        fetchRequests()
        setProcessing(null)
    }

    // Logic
    const requestedDays = isHalfDay ? 0.5 : calculateWorkingDays(startDate, endDate)
    const requireDoc = type.toLowerCase().includes('sick') && requestedDays > 2

    const myRequests = requests.filter(r => r.userId === user?.userId)

    // Calculate Balances dynamically
    const myApprovedOrPending = myRequests.filter(r => ['Approved', 'Pending'].includes(r.status))
    const balances = leaveSettings.slice(0, 2).map((_ls, idx) => {
        const total = idx === 0 ? 14 : 7 // Default 14 for first, 7 for second
        const consumed = myApprovedOrPending
            .filter((_r: LeaveRequest) => _r.type === _ls.value)
            .reduce((sum: number, _r: LeaveRequest) => {
                const d = _r.reason?.includes('Half day') ? 0.5 : calculateWorkingDays(_r.startDate, _r.endDate)
                return sum + d
            }, 0)
        return {
            ..._ls,
            total,
            consumed,
            remaining: Math.max(0, total - consumed)
        }
    })

    return (
        <>
            <div className="crm-content" style={{ paddingTop: 16 }}>
                <div className="page-header" style={{ marginBottom: 20 }}>
                    <div>
                        <h2>Leave</h2>
                        <p>Apply for leave and track your remaining balance.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <NotificationCenter />
                        <button onClick={() => setShowModal(true)} className="btn-primary">
                            <Plus size={16} /> Request Leave
                        </button>
                    </div>
                </div>

                {/* Balances Block */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    {balances.map(b => (
                        <div key={b.id} className="card" style={{ flex: 1, padding: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: 64, height: 64 }}>
                                <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="var(--bg-input)" strokeWidth="6" />
                                    <circle cx="32" cy="32" r="28" fill="none" stroke={b.color || 'var(--accent-primary)'} strokeWidth="6" strokeDasharray={28 * 2 * Math.PI} strokeDashoffset={(28 * 2 * Math.PI) * (1 - (b.remaining / b.total))} style={{ transition: 'stroke-dashoffset 1s ease' }} strokeLinecap="round" />
                                </svg>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{b.remaining}</div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{b.value}</h3>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{b.consumed} used out of {b.total} days</div>
                            </div>
                        </div>
                    ))}

                    <div className="card" style={{ flex: 1.2, padding: '16px 20px', display: 'flex', flexDirection: 'column', background: 'rgba(99,102,241,0.02)', borderStyle: 'dashed' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upcoming Holidays</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {apiHolidays.length === 0 ? (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No upcoming holidays.</div>
                            ) : (
                                apiHolidays.map((h, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ color: 'var(--accent-primary)', opacity: 0.8 }}><Calendar size={14} /></div>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(h.date), 'MMM d, yyyy')}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>


                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600 }}>My Leave History</h3>
                    </div>
                    <table className="data-table" style={{ borderTop: 'none' }}>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Date Range</th>
                                <th>Duration</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                            ) : myRequests.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No leave requests yet</td></tr>
                            ) : myRequests.map(req => {
                                const days = req.reason?.includes('Half day') ? 0.5 : calculateWorkingDays(req.startDate, req.endDate)
                                return (
                                    <tr key={req.id}>
                                        <td style={{ fontWeight: 500, fontSize: 13, color: leaveSettings.find(ls => ls.value === req.type)?.color || 'var(--accent-primary)' }}>{req.type}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {format(parseISO(req.startDate), 'MMM d, yy')} <span style={{ color: 'var(--text-muted)' }}>→</span> {format(parseISO(req.endDate), 'MMM d, yy')}
                                        </td>
                                        <td style={{ fontSize: 13, fontWeight: 600 }}>{days} working day{days !== 1 ? 's' : ''}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {req.reason || '—'}
                                            {req.type === 'Sick Leave' && days > 2 && <span style={{ color: 'var(--accent-primary)', marginLeft: 8 }} title="Medical certificate attached">📎</span>}
                                        </td>
                                        <td><StatusBadge status={req.status} /></td>
                                        <td style={{ textAlign: 'right' }}>
                                            {req.status === 'Pending' && (
                                                <button
                                                    className="btn-ghost"
                                                    style={{ padding: '4px 8px', color: '#ef4444', fontSize: 12 }}
                                                    onClick={() => handleCancel(req.id)}
                                                    disabled={processing === req.id}
                                                    title="Withdraw Request"
                                                >
                                                    {processing === req.id ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <Trash2 size={13} />}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Request Leave Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 500, padding: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 20, fontWeight: 700 }}>Apply for Leave</h3>
                            <button className="btn-ghost" onClick={() => setShowModal(false)} style={{ padding: 4 }}><X size={18} /></button>
                        </div>

                        {balances.find(b => b.value === type) && balances.find(b => b.value === type)!.remaining <= 0 && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                ⚠️ You have no {type} balance remaining.
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label">Leave Type</label>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {leaveSettings.map(ls => (
                                        <button
                                            key={ls.id}
                                            type="button"
                                            onClick={() => setType(ls.value)}
                                            style={{
                                                flex: '1 1 40%', padding: 12, borderRadius: 8, border: `1px solid ${type === ls.value ? (ls.color || 'var(--accent-primary)') : 'var(--border)'}`,
                                                background: type === ls.value ? `${ls.color || '#6366f1'}15` : 'transparent',
                                                color: type === ls.value ? (ls.color || 'var(--accent-primary)') : 'var(--text-secondary)',
                                                fontWeight: type === ls.value ? 600 : 500, transition: 'all 0.2s', cursor: 'pointer'
                                            }}
                                        >
                                            {ls.value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 16 }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Start Date</label>
                                    <input type="date" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={e => {
                                        setStartDate(e.target.value);
                                        if (endDate && new Date(e.target.value) > new Date(endDate)) setEndDate(e.target.value);
                                    }} required />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">End Date</label>
                                    <input type="date" value={endDate} min={startDate || new Date().toISOString().split('T')[0]} onChange={e => setEndDate(e.target.value)} required disabled={isHalfDay} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 8 }}>
                                <input
                                    type="checkbox"
                                    id="half-day"
                                    checked={isHalfDay}
                                    onChange={e => {
                                        setIsHalfDay(e.target.checked);
                                        if (e.target.checked) setEndDate(startDate);
                                    }}
                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                />
                                <label htmlFor="half-day" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>I am requesting a half-day</label>
                            </div>

                            {startDate && (isHalfDay || endDate) && (
                                <div style={{ background: 'rgba(99,102,241,0.05)', padding: '14px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Total Leave Duration</span>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)' }}>{requestedDays} Day{requestedDays !== 1 ? 's' : ''}</span>
                                </div>
                            )}

                            {requireDoc && (
                                <div className="form-group">
                                    <label className="form-label" style={{ color: '#ef4444' }}>Medical Certificate Required *</label>
                                    <div style={{ border: '1px dashed var(--border)', padding: 20, borderRadius: 8, textAlign: 'center', background: 'var(--bg-input)' }}>
                                        {file ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--accent-primary)' }}><FileText size={16} /> {file.name}</div>
                                                <button type="button" onClick={() => setFile(null)} className="btn-ghost" style={{ padding: 4, color: '#ef4444' }}><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
                                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upload your doctor&apos;s note (PDF, JPG)</div>
                                                <input type="file" id="med-cert" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => e.target.files && setFile(e.target.files[0])} />
                                                <label htmlFor="med-cert" style={{ display: 'inline-block', marginTop: 12, padding: '6px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Select File</label>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Reason (Optional)</label>
                                <textarea
                                    placeholder="Briefly describe the reason for your time off..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            {submitError && (
                                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13 }}>
                                    {submitError}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2, display: 'flex', justifyContent: 'center' }} disabled={submitting || requestedDays === 0 || (requireDoc && !file) || (balances.find(b => b.value === type) && balances.find(b => b.value === type)!.remaining < requestedDays)}>
                                    {submitting ? <div className="spinner" /> : 'Confirm Leave Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
