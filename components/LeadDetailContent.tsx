'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Pencil, Mail, Phone, MapPin, Globe, Rocket, CheckSquare, Check, Calendar, User, Plus, History, MessageSquare, CheckCircle, AlertCircle, Loader2, Search, Copy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import EditLeadModal from '@/components/EditLeadModal'
import ActivityTimeline from '@/components/ActivityTimeline'
import Editor from '@/components/Editor'

import EditTaskModal from '@/components/EditTaskModal'

// Auto-validates email on mount, shows tick/cross
// Capped at 500 entries to prevent unbounded memory growth on long sessions
// Network errors are NOT cached so a retry on next visit gives an accurate result
const EMAIL_CACHE_MAX = 500
const emailBadgeCache = new Map<string, { state: 'loading' | 'valid' | 'unknown' | 'invalid' }>()
function setEmailCache(key: string, value: { state: 'loading' | 'valid' | 'unknown' | 'invalid' }) {
    if (emailBadgeCache.size >= EMAIL_CACHE_MAX) {
        emailBadgeCache.delete(emailBadgeCache.keys().next().value!)
    }
    emailBadgeCache.set(key, value)
}
function EmailBadge({ email }: { email: string }) {
    const [state, setState] = useState<'loading' | 'valid' | 'unknown' | 'invalid' | 'error'>('loading')
    useEffect(() => {
        // Handle multiple emails by taking the first one for the badge status
        const firstEmail = email.split(',')[0] || ''
        const trimmed = firstEmail.trim().toLowerCase()
        if (!trimmed) {
            setState('unknown')
            return
        }

        let mounted = true

        if (emailBadgeCache.has(trimmed)) {
            // Using requestAnimationFrame inside effect to avoid React devtools warning
            // when rapidly switching cached values.
            requestAnimationFrame(() => {
                if (mounted) setState(emailBadgeCache.get(trimmed)!.state)
            })
            return
        }
        const ctrl = new AbortController()
        fetch('/api/leads/validate-email', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: trimmed }), signal: ctrl.signal,
        }).then(r => r.json()).then(data => {
            const s = data.valid ? (data.unknown ? 'unknown' : 'valid') : 'invalid'
            setEmailCache(trimmed, { state: s })
            if (mounted) setState(s)
        }).catch(() => {
            // Network/timeout error — don't cache so the next visit retries the validation
            if (mounted) setState('error')
        })
        return () => {
            mounted = false
            ctrl.abort()
        }
    }, [email])

    const size = 14
    const iconStyle: React.CSSProperties = { flexShrink: 0, display: 'inline-flex' }
    if (state === 'loading') return <Loader2 size={size} color="var(--text-muted)" style={{ ...iconStyle, animation: 'spin 1s linear infinite' }} />
    if (state === 'valid') return <div title="Email verified" style={{ ...iconStyle, width: 16, height: 16, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center' }}><Check size={10} color="#22c55e" strokeWidth={3} /></div>
    if (state === 'unknown') return <div title="Domain verified" style={{ ...iconStyle, width: 16, height: 16, borderRadius: '50%', background: 'rgba(234,179,8,0.15)', alignItems: 'center', justifyContent: 'center' }}><Check size={10} color="#eab308" strokeWidth={3} /></div>
    if (state === 'invalid') return <div title="Invalid email" style={{ ...iconStyle, width: 16, height: 16, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={10} color="#ef4444" /></div>
    if (state === 'error') return <div title="Could not verify (network error)" style={{ ...iconStyle, width: 16, height: 16, borderRadius: '50%', background: 'rgba(148,163,184,0.15)', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={10} color="var(--text-muted)" /></div>
    return null
}

const TASK_TYPES = [
    { value: 'Call', icon: '📞', color: '#6366f1' },
    { value: 'Email', icon: '📧', color: '#06b6d4' },
    { value: 'Meeting', icon: '🤝', color: '#f59e0b' },
    { value: 'Follow-up', icon: '🔄', color: '#10b981' },
    { value: 'Send Proposal', icon: '📄', color: '#8b5cf6' },
    { value: 'Other', icon: '📌', color: '#94a3b8' },
]

interface Lead {
    id: string; name: string; company: string | null; email: string | null; phone: string | null; website: string | null; country: string | null;
    status: string; callOutcome: string | null; notes: string | null; socials: string | null; createdAt: string; updatedAt: string
    priority: string | null; industry: string | null;
    ownerId: string | null; owner: { id: string; name: string; email: string } | null;
    contacts: Array<{ id: string; name: string; email: string | null; phone: string | null; position: string | null; socials: string | null; isPrimary: boolean }>;
    tasks: Array<{ id: string; title: string; taskType: string; priority: string; completed: boolean; dueDate: string | null; owner: { name: string } | null }>;
    mailCount: number; callCount: number; lastCallOutcome: string | null; lastMailOutcome: string | null;
}

const CALL_OUTCOME_OPTIONS = [
    { value: 'connected_interested', label: 'Connected - Interested', icon: '✅', color: '#22c55e' },
    { value: 'no_answer', label: 'No Answer', icon: '📵', color: '#f59e0b' },
    { value: 'voicemail', label: 'Voicemail Left', icon: '📞', color: '#6366f1' },
    { value: 'call_back_later', label: 'Call Back Later', icon: '🔄', color: '#06b6d4' },
    { value: 'connected_not_interested', label: 'Not Interested', icon: '❌', color: '#ef4444' },
]

const MAIL_OUTCOME_OPTIONS = [
    { value: 'sent', label: 'Mail Sent', icon: '📧', color: '#6366f1' },
    { value: 'follow_up', label: 'Follow-up Mail', icon: '🔁', color: '#f59e0b' },
    { value: 'response_interested', label: 'Got Response - Interested', icon: '✅', color: '#22c55e' },
    { value: 'response_not_interested', label: 'Got Response - Not Interested', icon: '❌', color: '#ef4444' },
]

const OUTCOME_STATUSES = ['Lost', 'Converted']

const parseSocialLinks = (socials: string | null): string[] => {
    if (!socials) return [];
    try {
        const parsed = JSON.parse(socials);
        if (Array.isArray(parsed)) {
            return parsed.map((s: any) => typeof s === 'string' ? s : s.url || '').filter(Boolean);
        }
    } catch {
        // Not a JSON array, fallback to comma separated parsing
    }
    return socials.split(',').filter(Boolean);
}

// Extract only the scalar fields safe to send to the PUT endpoint.
// Sending the full lead object (with contacts[], tasks[], activityLogs[] etc.) causes the
// API to delete + recreate all contacts on every save, which is destructive.
function toLeadPayload(lead: Lead) {
    return {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        country: lead.country,
        status: lead.status,
        callOutcome: lead.callOutcome,
        notes: lead.notes,
        socials: lead.socials,
        priority: lead.priority,
        industry: lead.industry,
        ownerId: lead.owner?.id ?? null,
    }
}

function Stepper({ lead, onRefresh, onConvert, onNotify, availableStatuses }: { lead: Lead, onRefresh: () => void, onConvert: () => void, onNotify: (msg: string, type: 'success' | 'error') => void, availableStatuses: { value: string, color: string | null }[] }) {
    const [activePopup, setActivePopup] = useState<string | null>(null)
    const [note, setNote] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            // Don't close if clicking inside the popup, the trigger, or if it's an input/calendar interaction
            if (activePopup && 
                !target.closest('.action-popup') && 
                !target.closest('.action-trigger') &&
                target.tagName !== 'INPUT' && 
                target.tagName !== 'SELECT'
            ) {
                setActivePopup(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [activePopup])

    const status = lead.status

    if (availableStatuses.length === 0) {
        return <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 10 }}>Pipeline stages aren&apos;t configured yet. Contact your admin.</div>
    }

    const pipelineSteps = availableStatuses.filter(s => !OUTCOME_STATUSES.includes(s.value))
    const outcomeSteps = availableStatuses.filter(s => OUTCOME_STATUSES.includes(s.value))
    const isOutcome = OUTCOME_STATUSES.includes(status)
    const currentIndex = pipelineSteps.findIndex(s => s.value === status)
    const effectiveIndex = isOutcome ? pipelineSteps.length - 1 : currentIndex

    const handleStepClick = (stepValue: string) => {
        const val = stepValue.toLowerCase()
        if (val.includes('call')) {
            setActivePopup(activePopup === 'Call' ? null : 'Call')
            setNote('')
            setDueDate('')
            setShowDatePicker(false)
        } else if (val.includes('mail') || val.includes('email')) {
            setActivePopup(activePopup === 'Mail' ? null : 'Mail')
            setNote('')
            setDueDate('')
        }
    }

    const logCallAttempt = async (outcome: string) => {
        if (outcome === 'call_back_later' && !dueDate) {
            setShowDatePicker(true)
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch(`/api/leads/${lead.id}/call-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome, note: note || undefined, dueDate: dueDate || undefined }),
            })
            if (!res.ok) throw new Error('Failed to log call')
            setActivePopup(null)
            setNote('')
            setDueDate('')
            setShowDatePicker(false)
            onNotify('Call outcome logged', 'success')
            onRefresh()
        } catch {
            onNotify('Failed to log call outcome. Please try again.', 'error')
        } finally { setSubmitting(false) }
    }

    const logMailAttempt = async (outcome: string) => {
        setSubmitting(true)
        try {
            const res = await fetch(`/api/leads/${lead.id}/mail-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome, note: note || undefined }),
            })
            if (!res.ok) throw new Error('Failed to log mail')
            setActivePopup(null)
            setNote('')
            onNotify('Mail outcome logged', 'success')
            onRefresh()
        } catch {
            onNotify('Failed to log mail outcome. Please try again.', 'error')
        } finally { setSubmitting(false) }
    }

    const handleDirectStatus = async (newStatus: string) => {
        try {
            await fetch(`/api/leads/${lead.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...toLeadPayload(lead), status: newStatus }),
            })
            onRefresh()
        } catch (err) { console.error(err) }
    }

    const getStepBadge = (stepValue: string) => {
        const val = stepValue.toLowerCase()
        if (val.includes('call')) return lead.callCount > 0 ? lead.callCount : null
        if (val.includes('mail') || val.includes('email')) return lead.mailCount > 0 ? lead.mailCount : null
        return null
    }

    const getStepBadgeColor = (stepValue: string) => {
        const val = stepValue.toLowerCase()
        if (val.includes('call')) {
            if (lead.lastCallOutcome === 'connected_interested') return '#22c55e'
            if (lead.callCount > 0) return '#f59e0b'
        }
        if (val.includes('mail') || val.includes('email')) {
            if (lead.lastMailOutcome === 'response_interested') return '#22c55e'
            if (lead.mailCount > 0) return '#6366f1'
        }
        return 'var(--accent-primary)'
    }

    return (
        <div>
            {/* Linear Pipeline Stepper */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginTop: 30, marginBottom: 16 }}>
                <div style={{ position: 'absolute', top: 16, left: 10, right: 10, height: 2, background: 'var(--border)', zIndex: 0 }}></div>
                <div style={{ position: 'absolute', top: 16, left: 10, width: `${(Math.max(0, effectiveIndex) / (pipelineSteps.length - 1 || 1)) * 100}%`, height: 2, background: isOutcome && status === 'Lost' ? '#ef4444' : 'var(--accent-primary)', zIndex: 1, transition: 'width 0.3s' }}></div>

                {pipelineSteps.map((step, i) => {
                    const isActive = i <= (effectiveIndex !== -1 ? effectiveIndex : -1)
                    const isCurrent = !isOutcome && i === currentIndex
                    const barColor = isOutcome && status === 'Lost' ? '#ef4444' : (step.color || 'var(--accent-primary)')
                    const badge = getStepBadge(step.value)
                    const badgeColor = getStepBadgeColor(step.value)
                    const isClickable = step.value.toLowerCase().includes('call') || step.value.toLowerCase().includes('mail') || step.value.toLowerCase().includes('email')

                    return (
                        <div key={step.value} className={isClickable ? 'action-trigger' : ''} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: 10, flex: 1 }}>
                            <div
                                onClick={() => isClickable ? handleStepClick(step.value) : (step.value !== 'New' && handleDirectStatus(step.value))}
                                style={{
                                    width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isActive ? barColor : 'var(--bg-card)',
                                    border: `2px solid ${isActive ? barColor : 'var(--border)'}`,
                                    color: isActive ? '#fff' : 'var(--text-muted)',
                                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    zIndex: 3,
                                    boxShadow: (activePopup === 'Call' && step.value.toLowerCase().includes('call')) || (activePopup === 'Mail' && (step.value.toLowerCase().includes('mail') || step.value.toLowerCase().includes('email'))) ? `0 0 0 3px ${barColor}40` : 'none',
                                }}>
                                {isActive && !isCurrent ? <Check size={16} strokeWidth={3} /> : badge ? badge : (i + 1)}
                            </div>
                            {/* Badge counter */}
                            {badge && badge > 0 && (
                                <div style={{
                                    position: 'absolute', top: -6, right: 'calc(50% - 22px)',
                                    background: badgeColor, color: '#fff',
                                    fontSize: 9, fontWeight: 800, borderRadius: 10,
                                    width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid var(--bg-card)', zIndex: 4
                                }}>{badge}</div>
                            )}
                            <div
                                onClick={() => isClickable ? handleStepClick(step.value) : undefined}
                                style={{
                                    fontSize: 11,
                                    color: isCurrent ? (step.color || 'var(--accent-primary)') : (isActive ? 'var(--text-primary)' : 'var(--text-muted)'),
                                    fontWeight: isCurrent ? 600 : 500,
                                    cursor: isClickable ? 'pointer' : 'default',
                                    textAlign: 'center',
                                    lineHeight: 1.2
                                }}>
                                {step.value}
                                {step.value === 'Called' && lead.lastCallOutcome && (
                                    <div style={{ fontSize: 9, color: CALL_OUTCOME_OPTIONS.find(o => o.value === lead.lastCallOutcome)?.color || 'var(--text-muted)', marginTop: 4, opacity: 0.9 }}>
                                        {CALL_OUTCOME_OPTIONS.find(o => o.value === lead.lastCallOutcome)?.label}
                                    </div>
                                )}
                                {step.value === 'Mail Sent' && lead.lastMailOutcome && (
                                    <div style={{ fontSize: 9, color: MAIL_OUTCOME_OPTIONS.find(o => o.value === lead.lastMailOutcome)?.color || 'var(--text-muted)', marginTop: 4, opacity: 0.9 }}>
                                        {MAIL_OUTCOME_OPTIONS.find(o => o.value === lead.lastMailOutcome)?.label}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Outcome Buttons */}
            {outcomeSteps.length > 0 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {outcomeSteps.map(oc => {
                        const isLost = oc.value === 'Lost'
                        const isActive = status === oc.value
                        const btnColor = isLost ? '#ef4444' : (oc.color || '#10b981')

                        if (isActive && isLost) {
                            return (
                                <button key="restore"
                                    onClick={() => {
                                        const restoreStatus = (lead.mailCount > 0 && pipelineSteps.some(s => s.value === 'Mail Sent')) ? 'Mail Sent' :
                                            (lead.callCount > 0 && pipelineSteps.some(s => s.value === 'Called')) ? 'Called' :
                                                (pipelineSteps[0]?.value || 'New');
                                        handleDirectStatus(restoreStatus)
                                    }}
                                    style={{
                                        padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        border: `1.5px solid ${btnColor}`,
                                        background: `${btnColor}20`,
                                        color: btnColor,
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: 6
                                    }}
                                >
                                    ⟲ Restore Lead
                                </button>
                            )
                        }

                        return (
                            <button key={oc.value}
                                onClick={() => oc.value === 'Converted' ? onConvert() : handleDirectStatus(oc.value)}
                                style={{
                                    padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    border: `1.5px solid ${isActive ? btnColor : `${btnColor}50`}`,
                                    background: isActive ? `${btnColor}20` : 'transparent',
                                    color: isActive ? btnColor : `${btnColor}90`,
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    opacity: (status === 'Lost' && !isLost) ? 0.3 : 1,
                                    pointerEvents: (status === 'Lost' && !isLost) ? 'none' : 'auto'
                                }}
                            >
                                {isLost ? '✕' : '✓'} {oc.value}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Call Outcome Popup */}
            {activePopup === 'Call' && (
                <div className="action-popup" style={{
                    marginTop: 12, padding: 16, background: 'var(--bg-input)', borderRadius: 12,
                    border: '1px solid var(--border)', animation: 'fadeIn 0.15s ease-out'
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        📞 Log Call Outcome
                        {lead.callCount > 0 && <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: 4 }}>{lead.callCount} previous</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {CALL_OUTCOME_OPTIONS.map(opt => (
                            <button key={opt.value}
                                onClick={() => logCallAttempt(opt.value)}
                                disabled={submitting}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                    border: '1px solid var(--border)', background: 'transparent',
                                    color: opt.color, transition: 'all 0.15s', textAlign: 'left',
                                    borderColor: (opt.value === 'call_back_later' && showDatePicker) ? opt.color : 'var(--border)',
                                    boxShadow: (opt.value === 'call_back_later' && showDatePicker) ? `0 0 0 2px ${opt.color}15` : 'none'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = `${opt.color}12`; e.currentTarget.style.borderColor = `${opt.color}40` }}
                                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = (opt.value === 'call_back_later' && showDatePicker) ? opt.color : 'var(--border)' }}
                            >
                                <span style={{ fontSize: 14 }}>{opt.icon}</span> {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Follow-up date picker for Call Back Later */}
                    {showDatePicker && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                            <button onClick={() => logCallAttempt('call_back_later')} disabled={!dueDate || submitting}
                                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid #06b6d4', background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>
                                Schedule
                            </button>
                        </div>
                    )}

                    {/* Optional note */}
                    <input placeholder="Add a note (optional)..." value={note} onChange={e => setNote(e.target.value)}
                        style={{ marginTop: 8, width: '100%', fontSize: 11, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                </div>
            )}

            {/* Mail Outcome Popup */}
            {activePopup === 'Mail' && (
                <div className="action-popup" style={{
                    marginTop: 12, padding: 16, background: 'var(--bg-input)', borderRadius: 12,
                    border: '1px solid var(--border)', animation: 'fadeIn 0.15s ease-out'
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        📧 Log Mail Outcome
                        {lead.mailCount > 0 && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#6366f1', padding: '2px 6px', borderRadius: 4 }}>{lead.mailCount} previous</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {MAIL_OUTCOME_OPTIONS.map(opt => (
                            <button key={opt.value}
                                onClick={() => logMailAttempt(opt.value)}
                                disabled={submitting}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                    border: '1px solid var(--border)', background: 'transparent',
                                    color: opt.color, transition: 'all 0.15s', textAlign: 'left'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = `${opt.color}12`; e.currentTarget.style.borderColor = `${opt.color}40` }}
                                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                            >
                                <span style={{ fontSize: 14 }}>{opt.icon}</span> {opt.label}
                            </button>
                        ))}
                    </div>
                    <input placeholder="Add a note (optional)..." value={note} onChange={e => setNote(e.target.value)}
                        style={{ marginTop: 8, width: '100%', fontSize: 11, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                </div>
            )}

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    )
}


export default function LeadDetailContent({ id, linkPrefix = '' }: { id: string, linkPrefix?: string }) {
    const router = useRouter()
    const [lead, setLead] = useState<Lead | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [converting, setConverting] = useState(false)
    const [showConvertModal, setShowConvertModal] = useState(false)
    const [activeTab, setActiveTab] = useState<'tasks'>('tasks')
    const [newTask, setNewTask] = useState({ title: '', taskType: 'Follow-up', dueDate: '', priority: 'Medium' })
    const [creatingTask, setCreatingTask] = useState(false)
    const [priorities, setPriorities] = useState<{ value: string; color: string | null }[]>([])
    // Sync the new-task priority to the first loaded option when priorities arrive
    // and the current default ('Medium') isn't actually available.
    const [newTaskPriorityInit, setNewTaskPriorityInit] = useState(false)
    const [savingNotes, setSavingNotes] = useState<'idle' | 'saving' | 'saved'>('idle')
    // Track the last notes value that was saved so we only auto-save on actual changes.
    const savedNotesRef = useRef<string | null | undefined>(undefined)
    // notesDirtyRef: true when the user has typed notes that haven't been saved yet.
    // pendingNotesRef: the user's in-progress notes content (separate from server state).
    // Without these, a server refresh (e.g. after logging a call) would overwrite the
    // user's typed notes in lead.notes, causing the auto-save to write back stale data.
    const notesDirtyRef = useRef(false)
    const pendingNotesRef = useRef<string | null | undefined>(undefined)
    const leadRef = useRef<Lead | null>(null)

    const [error, setError] = useState<number | null>(null)
    const [editTaskId, setEditTaskId] = useState<string | null>(null)
    const [statuses, setStatuses] = useState<{ value: string, color: string | null }[]>([])
    const [users, setUsers] = useState<{ id: string, name: string }[]>([])
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        
        // Modern approach
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setNotification({ message: `${label} copied to clipboard`, type: 'success' });
            }).catch(() => {
                // Fallback if modern API fails
                copyFallback(text, label);
            });
        } else {
            // Fallback for non-secure origins (HTTP)
            copyFallback(text, label);
        }
    };

    const copyFallback = (text: string, label: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";  // avoid scrolling to bottom
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setNotification({ message: `${label} copied to clipboard`, type: 'success' });
        } catch (err) {
            console.error('Fallback copy failed', err);
            setNotification({ message: `Failed to copy ${label}`, type: 'error' });
        }
    };


    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [notification])

    async function handleConvert() {
        setShowConvertModal(true)
    }

    async function executeConvert() {
        setShowConvertModal(false)
        setConverting(true)
        try {
            const res = await fetch(`/api/leads/${id}/convert`, { method: 'POST' })
            if (res.ok) {
                // 🎉 Celebrate the conversion!
                const { celebrateBig } = await import('@/lib/confetti')
                celebrateBig()
                // Small delay so user sees confetti before navigating
                setTimeout(() => router.push(`${linkPrefix}/opportunities`), 800)
            } else {
                const data = await res.json().catch(() => ({}))
                setNotification({ message: data.error || 'Failed to convert lead. Please try again.', type: 'error' })
            }
        } catch {
            setNotification({ message: 'Failed to convert lead. Please try again.', type: 'error' })
        } finally {
            setConverting(false)
        }
    }

    const fetchLeadAndOptions = useCallback(async () => {
        setLoading(true)
        setError(null)
        const safeFetch = async (url: string, isLead = false) => {
            try {
                const res = await fetch(url)
                if (!res.ok) {
                    if (isLead) setError(res.status)
                    return {}
                }
                const text = await res.text()
                if (!text) return {}
                try {
                    return JSON.parse(text)
                } catch (parseErr) {
                    console.error(`JSON parse failed for ${url}:`, parseErr)
                    return {}
                }
            } catch (err) {
                console.error(`Fetch failed for ${url}:`, err)
                return {}
            }
        }

        const [leadData, statusData, priorityData, userData] = await Promise.all([
            safeFetch(`/api/leads/${id}`, true),
            safeFetch(`/api/admin/settings?category=LEAD_STATUS`),
            safeFetch(`/api/admin/settings?category=TASK_PRIORITY`),
            safeFetch('/api/users')
        ])

        if (leadData.id) {
            // If the user is actively editing notes, preserve their in-progress content
            // so a concurrent server refresh doesn't wipe unsaved work.
            if (notesDirtyRef.current && pendingNotesRef.current !== undefined) {
                leadData.notes = pendingNotesRef.current
            }
            setLead(leadData)
            leadRef.current = leadData
        }
        if (statusData.options) setStatuses(statusData.options)
        if (priorityData.options) setPriorities(priorityData.options)
        if (userData && userData.users) setUsers(userData.users)
        else setUsers([])
        setLoading(false)
    }, [id])

    const reassignLead = async (userId: string) => {
        if (!lead) return
        try {
            const res = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...toLeadPayload(lead), ownerId: userId })
            })
            if (!res.ok) throw new Error('Failed to reassign')
            await fetchLeadAndOptions()
            setNotification({ message: 'Lead reassigned successfully', type: 'success' })
        } catch {
            setNotification({ message: 'Failed to reassign lead. Please try again.', type: 'error' })
        }
    }

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTask.title.trim()) return
        setCreatingTask(true)
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTask, leadId: id })
            })
            if (!res.ok) throw new Error('Failed to create task')
            setNewTask(f => ({ title: '', taskType: f.taskType, dueDate: '', priority: f.priority }))
            await fetchLeadAndOptions()
        } catch {
            setNotification({ message: 'Failed to create task. Please try again.', type: 'error' })
        } finally {
            setCreatingTask(false)
        }
    }

    const togglingTaskRef = useRef<string | null>(null)
    const handleToggleTask = async (taskId: string) => {
        if (togglingTaskRef.current === taskId) return
        togglingTaskRef.current = taskId
        try {
            const res = await fetch(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' })
            if (!res.ok) throw new Error('Failed to toggle task')
            await fetchLeadAndOptions()
        } catch {
            setNotification({ message: 'Failed to update task. Please try again.', type: 'error' })
        } finally {
            togglingTaskRef.current = null
        }
    }

    const handleUpdateLead = useCallback(async (updates: Partial<Lead>) => {
        if (!lead) return
        const updatedLead = { ...lead, ...updates }

        // Optimistic update
        setLead(updatedLead)
        leadRef.current = updatedLead

        try {
            const res = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // Only send scalar fields — sending the full lead (with contacts[], tasks[], etc.)
                // causes the API to delete and recreate all contacts on every save.
                body: JSON.stringify(toLeadPayload(updatedLead))
            })
            if (!res.ok) throw new Error('Failed to update')
            await fetchLeadAndOptions()
            return true
        } catch (e) {
            console.error(e)
            await fetchLeadAndOptions() // Revert on error
            return false
        }
    }, [id, lead, fetchLeadAndOptions])



    // Auto-save notes: only fires when notes content actually changes, not on every lead refresh.
    // Keeping savingNotes/handleUpdateLead out of deps avoids an infinite save loop.
    const currentNotes = lead?.notes
    useEffect(() => {
        // Skip until the lead is loaded for the first time
        if (currentNotes === undefined) return
        // Skip if nothing has changed since the last save
        if (savedNotesRef.current === undefined) {
            // First load — record the initial value without saving
            savedNotesRef.current = currentNotes
            return
        }
        if (currentNotes === savedNotesRef.current) return

        setSavingNotes('idle') // reset badge while the debounce is pending
        const timeout = setTimeout(async () => {
            setSavingNotes('saving')
            try {
                const res = await fetch(`/api/leads/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...toLeadPayload(leadRef.current!), notes: currentNotes })
                })
                if (res.ok) {
                    savedNotesRef.current = currentNotes
                    notesDirtyRef.current = false
                    pendingNotesRef.current = undefined
                    setSavingNotes('saved')
                    setTimeout(() => setSavingNotes('idle'), 2000)
                } else {
                    setSavingNotes('idle')
                }
            } catch {
                setSavingNotes('idle')
            }
        }, 1500)
        return () => clearTimeout(timeout)
         
    }, [currentNotes, id])


    useEffect(() => {
        fetchLeadAndOptions()
    }, [fetchLeadAndOptions])

    // Once priorities load, snap the default to the first option if current default isn't in the list
    useEffect(() => {
        if (priorities.length > 0 && !newTaskPriorityInit) {
            setNewTaskPriorityInit(true)
            setNewTask(f => ({
                ...f,
                priority: priorities.some(p => p.value === f.priority) ? f.priority : priorities[0].value
            }))
        }
    }, [priorities, newTaskPriorityInit])

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
    
    if (error === 403) return (
        <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertCircle size={32} />
            </div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 10 }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 20px' }}>
                You do not have permission to view this lead. It belongs to another user or is restricted.
            </p>
            <Link href={`${linkPrefix}/leads`} className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>Go Back to Leads</Link>
        </div>
    )

    if (!lead || error === 404) return (
        <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Search size={32} />
            </div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 10 }}>Lead Not Found</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 10px' }}>
                We couldn&apos;t find the lead you&apos;re looking for. It may have been deleted or moved.
            </p>
            <Link href={`${linkPrefix}/leads`} className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>Go Back to Leads</Link>
        </div>
    )

    const primaryContact = lead.contacts?.find(c => c.isPrimary) || lead.contacts?.[0]
    const displayTitle = lead.company || lead.name || 'Unknown'
    const initials = displayTitle.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    const ownerInitials = lead.owner?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--bg-main)' }}>
            <div className="crm-content" style={{ padding: '16px 24px' }}>
                {/* Breadcrumb */}
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link href={`${linkPrefix}/leads`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Leads</Link>
                <span>›</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lead.name}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(600px, 1fr) 340px', gap: 24 }}>
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Identity Card */}
                    <div className="card" style={{ padding: 24, position: 'relative' }}>
                        {/* Top row: Identity & Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.3)' }}>
                                    {initials}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</h1>
                                        <button 
                                            onClick={() => copyToClipboard(displayTitle, 'Company Name')}
                                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6 }} 
                                            className="hover-copy"
                                        >
                                            <Copy size={12} />
                                        </button>

                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>
                                        <User size={12} /> {lead.name}{lead.industry ? ` • ${lead.industry}` : ''}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                <button onClick={() => setIsEditing(true)} className="btn-secondary" style={{ height: 32, padding: '0 12px', fontSize: 13 }}><Pencil size={14} /></button>
                            </div>
                        </div>

                        <div style={{ marginTop: 16, padding: '12px 0 0 0', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Pipeline Progress</div>
                                {(() => {
                                    const statusColor = statuses.find(s => s.value === lead.status)?.color || 'var(--accent-primary)'
                                    return (
                                        <div style={{ background: `${statusColor}18`, color: statusColor, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: `1px solid ${statusColor}30` }}>{lead.status}</div>
                                    )
                                })()}
                            </div>
                            <Stepper lead={lead} onRefresh={fetchLeadAndOptions} onConvert={handleConvert} onNotify={(msg, type) => setNotification({ message: msg, type })} availableStatuses={statuses} />
                        </div>

                        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={13} color="var(--accent-primary)" /></div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>Email <EmailBadge email={lead.email || ''} /></div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {lead.email ? lead.email.split(',').map((email) => (
                                            <div key={email.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Link href={`mailto:${email.trim()}`}
                                                    onClick={(e) => { if (e.altKey) { e.preventDefault(); copyToClipboard(email.trim(), 'Email'); } }}
                                                    style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: 12, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {email.trim()}
                                                </Link>
                                                <button onClick={() => copyToClipboard(email.trim(), 'Email')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }} className="hover-copy"><Copy size={10} /></button>

                                            </div>
                                        )) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={13} color="#22c55e" /></div>
                                <div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Phone</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {lead.phone ? lead.phone.split(',').map((phone) => (
                                            <div key={phone.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Link href={`tel:${phone.trim()}`}
                                                    onClick={(e) => { if (e.altKey) { e.preventDefault(); copyToClipboard(phone.trim(), 'Phone'); } }}
                                                    style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: 12, fontWeight: 500 }}>
                                                    {phone.trim()}
                                                </Link>
                                                <button onClick={() => copyToClipboard(phone.trim(), 'Phone')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }} className="hover-copy"><Copy size={10} /></button>

                                            </div>
                                        )) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={13} color="#06b6d4" /></div>
                                <div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Country</div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }}>{lead.country || '—'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Globe size={13} color="#f59e0b" /></div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Website</div>
                                    {lead.website ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Link href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 12, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.website}</Link>
                                            <button onClick={() => copyToClipboard(lead.website!, 'Website')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }} className="hover-copy"><Copy size={10} /></button>
                                        </div>
                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}

                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Globe size={13} color="#8b5cf6" /></div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Socials</div>
                                    {lead.socials ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {parseSocialLinks(lead.socials).map((social) => (
                                                <div key={social.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Link href={social.trim().startsWith('http') ? social.trim() : `https://${social.trim()}`} target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 12, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {social.trim().replace(/^https?:\/\//, '').replace(/^www\./, '')}
                                                    </Link>
                                                    <button onClick={() => copyToClipboard(social.trim(), 'Social Link')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }} className="hover-copy"><Copy size={10} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Section */}
                    <div className="card" style={{ padding: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 0, padding: '0 20px' }}>
                            {(() => {
                                const overdueCount = lead.tasks?.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length ?? 0
                                return [
                                    { key: 'tasks' as const, icon: <CheckSquare size={14} />, label: 'Tasks', badge: overdueCount },
                                ]
                            })().map(t => (
                                <button key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    style={{
                                        padding: '12px 16px', borderBottom: `2.5px solid ${activeTab === t.key ? 'var(--accent-primary)' : 'transparent'}`,
                                        background: 'none', color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                        transition: 'all 0.2s', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
                                    }}
                                >
                                    {t.icon} {t.label}
                                    {'badge' in t && t.badge > 0 && (
                                        <span style={{ background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 8, padding: '1px 5px', marginLeft: 2, lineHeight: 1.6 }}>{t.badge}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: '20px 24px', minHeight: 0, flex: 1 }}>
                            {activeTab === 'tasks' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Compact Quick Add Task Form */}
                                    <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Task</div>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {TASK_TYPES.map(t => (
                                                    <button key={t.value} type="button" onClick={() => setNewTask(f => ({ ...f, taskType: t.value }))}
                                                        style={{
                                                            padding: '3px 8px', borderRadius: 6, border: '1px solid', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                                            borderColor: newTask.taskType === t.value ? t.color : 'transparent',
                                                            background: newTask.taskType === t.value ? `${t.color}15` : 'transparent',
                                                            color: newTask.taskType === t.value ? t.color : 'var(--text-muted)',
                                                            transition: 'all 0.15s',
                                                        }}>{t.icon} {t.value}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <input placeholder="e.g. Call back about pricing..." value={newTask.title}
                                                onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} required
                                                style={{ flex: 1, height: 34, fontSize: 12 }} />
                                            <select value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))}
                                                style={{ width: 90, height: 34, fontSize: 11 }}>
                                                {priorities.length === 0
                                                    ? <option value="" disabled>Loading…</option>
                                                    : priorities.map(p => <option key={p.value} value={p.value}>{p.value}</option>)
                                                }
                                            </select>
                                            <input type="datetime-local" value={newTask.dueDate}
                                                onChange={e => setNewTask(f => ({ ...f, dueDate: e.target.value }))}
                                                style={{ width: 170, height: 34, fontSize: 11 }} />
                                            <button type="submit" className="btn-primary" disabled={creatingTask} style={{ height: 34, fontSize: 12, whiteSpace: 'nowrap', padding: '0 14px' }}>
                                                {creatingTask ? <div className="spinner" /> : <><Plus size={13} /> Add</>}
                                            </button>
                                        </div>
                                    </form>

                                    {/* Task List */}
                                    {(!lead.tasks || lead.tasks.length === 0) ? (
                                        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 10, border: '1px dashed var(--border)' }}>
                                            <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.4 }}>📋</div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>No tasks yet</div>
                                            <div style={{ fontSize: 11, marginTop: 2 }}>Create your first task above to stay on track</div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {lead.tasks.map(task => {
                                                const typeInfo = TASK_TYPES.find(t => t.value === task.taskType) || TASK_TYPES[5]
                                                const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
                                                const prioColor = priorities.find(p => p.value === task.priority)?.color || 'var(--text-muted)'

                                                let dateDisplay = ''
                                                if (task.dueDate) {
                                                    const d = parseISO(task.dueDate)
                                                    dateDisplay = format(d, task.dueDate.includes('T') ? 'MMM d, h:mm a' : 'MMM d')
                                                }

                                                return (
                                                    <div key={task.id}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                                            background: task.completed ? 'transparent' : 'var(--bg-input)',
                                                            borderRadius: 8, border: '1px solid transparent',
                                                            transition: 'all 0.15s', cursor: 'default',
                                                            opacity: task.completed ? 0.6 : 1,
                                                        }}
                                                        onMouseOver={e => { if (!task.completed) e.currentTarget.style.borderColor = 'var(--border)' }}
                                                        onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                                                    >
                                                        <button onClick={() => handleToggleTask(task.id)} className={`task-check ${task.completed ? 'checked' : ''}`} style={{ flexShrink: 0 }}>
                                                            {task.completed && <CheckCircle size={12} color="white" />}
                                                        </button>
                                                        <div style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${typeInfo.color}12`, fontSize: 13, flexShrink: 0 }}>
                                                            {typeInfo.icon}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 500, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
                                                            {task.owner && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Assigned to: {task.owner.name}</div>}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                            {task.dueDate && (
                                                                <span style={{
                                                                    fontSize: 10, display: 'flex', alignItems: 'center', gap: 3,
                                                                    color: isOverdue ? '#ef4444' : 'var(--text-muted)',
                                                                    fontWeight: isOverdue ? 600 : 400,
                                                                    background: isOverdue ? 'rgba(239,68,68,0.08)' : 'transparent',
                                                                    padding: isOverdue ? '2px 6px' : '0', borderRadius: 4,
                                                                }}>
                                                                    <Calendar size={10} /> {dateDisplay}
                                                                </span>
                                                            )}
                                                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: `${prioColor}15`, color: prioColor, border: `1px solid ${prioColor}30` }}>{task.priority}</span>
                                                            {!task.completed && (
                                                                <button onClick={() => setEditTaskId(task.id)} className="btn-ghost" style={{ padding: '4px', color: 'var(--accent-primary)', opacity: 0.6 }}>
                                                                    <Pencil size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Private Notes Section */}
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={16} color="#8b5cf6" />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Private Notes</span>
                                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>Only visible to you</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
                                {savingNotes === 'saving' && <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={14} className="animate-spin" /> Auto-saving...</span>}
                                {savingNotes === 'saved' && <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} strokeWidth={3} /> Saved to cloud</span>}
                            </div>
                        </div>
                        
                        <div style={{ 
                            background: 'var(--bg-input)', 
                            borderRadius: 12, 
                            border: '1px solid var(--border)',
                            overflow: 'hidden'
                        }}>
                            <Editor 
                                content={lead.notes || ''} 
                                onUpdate={(html) => {
                                    notesDirtyRef.current = true
                                    pendingNotesRef.current = html
                                    setLead(l => l ? { ...l, notes: html } : null)
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Convert to Opportunity Button */}
                    {lead.status !== 'Converted' && (
                        <button
                            onClick={handleConvert}
                            disabled={converting}
                            style={{
                                width: '100%', padding: '12px', background: 'var(--bg-card)',
                                border: '1px dashed rgba(99,102,241,0.5)', borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                color: 'var(--accent-primary)', fontSize: 14, fontWeight: 600,
                                cursor: converting ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease'
                            }}>
                            <Rocket size={16} className={converting ? 'animate-pulse' : ''} /> {converting ? 'Converting...' : 'Convert to Opportunity'}
                        </button>
                    )}

                    {/* Contacts */}
                    <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={13} color="var(--accent-primary)" /> Contacts
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {lead.contacts && lead.contacts.length > 0 ? lead.contacts.map(c => (
                                <div key={c.id} style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{c.name}</div>
                                        {c.isPrimary && <div style={{ fontSize: 8, background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', padding: '1px 4px', borderRadius: 4, fontWeight: 800 }}>PRIMARY</div>}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{c.position || ''}</div>
                                    {c.email && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                                            {c.email.split(',').map((email) => (
                                                <div key={email.trim()} style={{ fontSize: 11, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Mail size={10} />
                                                    <span onClick={() => copyToClipboard(email.trim(), 'Email')} style={{ cursor: 'pointer' }}>{email.trim()}</span>
                                                    <span className="hover-copy" style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => copyToClipboard(email.trim(), 'Email')}><Copy size={10} /></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {c.phone && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                                            {c.phone.split(',').map((phone) => (
                                                <div key={phone.trim()} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Phone size={10} />
                                                    <span onClick={() => copyToClipboard(phone.trim(), 'Phone')} style={{ cursor: 'pointer' }}>{phone.trim()}</span>
                                                    <span className="hover-copy" style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => copyToClipboard(phone.trim(), 'Phone')}><Copy size={10} /></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {c.socials && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                                            {parseSocialLinks(c.socials).map((social) => (
                                                <div key={social.trim()} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Globe size={10} />
                                                    <Link href={social.trim().startsWith('http') ? social.trim() : `https://${social.trim()}`} target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'none', cursor: 'pointer', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {social.trim().replace(/^https?:\/\//, '').replace(/^www\./, '')}
                                                    </Link>
                                                    <span className="hover-copy" style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => copyToClipboard(social.trim(), 'Social Link')}><Copy size={10} /></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No contacts found.</div>
                            )}
                        </div>
                    </div>

                    {/* Overview */}
                    <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={12} color="var(--accent-primary)" />
                            <span style={{ fontWeight: 700 }}>Created</span>
                            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {format(parseISO(lead.createdAt), 'MMM d, yyyy')}
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                            <span>Owner</span>
                            <select
                                value={lead.owner?.id || ''}
                                onChange={e => reassignLead(e.target.value)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                <option value="">Reassign</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)', fontWeight: 600 }}>{ownerInitials}</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lead.owner?.name || 'Unassigned'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sales Rep</div>
                            </div>
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <History size={14} /> Activity
                        </div>
                        <ActivityTimeline leadId={lead.id} />
                    </div>
                </div>
            </div >

            {isEditing && lead && (
                <EditLeadModal
                    id={lead.id}
                    onClose={() => setIsEditing(false)}
                    onSuccess={() => {
                        setIsEditing(false)
                        fetchLeadAndOptions()
                    }}
                />
            )}

            {showConvertModal && lead && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowConvertModal(false)}>
                    <div className="modal" style={{ maxWidth: 440, padding: 32 }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Rocket size={32} />
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Convert to Opportunity</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                You are about to convert <strong style={{ color: 'var(--text-primary)' }}>{lead.name}</strong> into an Opportunity.
                                This will formally move them into your sales pipeline.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setShowConvertModal(false)} style={{ flex: 1, padding: '12px 0' }}>Cancel</button>
                            <button className="btn-primary" onClick={executeConvert} disabled={converting} style={{ flex: 1, padding: '12px 0' }}>{converting ? 'Converting...' : 'Yes, Convert Lead'}</button>
                        </div>
                    </div>
                </div>
            )}

            {editTaskId && (
                <EditTaskModal
                    taskId={editTaskId}
                    onClose={() => setEditTaskId(null)}
                    onSuccess={() => {
                        setEditTaskId(null)
                        fetchLeadAndOptions()
                    }}
                    leads={lead ? [{ id: lead.id, name: lead.name, company: lead.company }] : []}
                    priorities={priorities}
                />
            )}

            {/* In-app Notification (Toast) */}
            {notification && (
                <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out' }}>
                    {notification.type === 'error'
                        ? <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={14} /></div>
                        : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={14} /></div>
                    }
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{notification.message}</span>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .hover-copy { opacity: 0.3; transition: opacity 0.2s; }
                .hover-copy:hover { opacity: 1 !important; }
                div:hover > .hover-copy { opacity: 0.8; }
            `}</style>
            </div>
        </div >
    )
}
