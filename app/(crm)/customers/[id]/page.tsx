'use client'
import React, { useState, useEffect, use, useCallback, useRef } from 'react'
import { Pencil, Mail, Phone, MapPin, Globe, Rocket, CheckSquare, Check, Calendar, User, Plus, History, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import EditLeadModal from '@/components/EditLeadModal'
import ActivityTimeline from '@/components/ActivityTimeline'

// Auto-validates email on mount, shows tick/cross
const emailBadgeCache = new Map<string, { state: 'loading' | 'valid' | 'unknown' | 'invalid' }>()
function EmailBadge({ email }: { email: string }) {
    const [state, setState] = useState<'loading' | 'valid' | 'unknown' | 'invalid'>('loading')
    useEffect(() => {
        const trimmed = email.trim().toLowerCase()
        if (!trimmed) return

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
            emailBadgeCache.set(trimmed, { state: s })
            if (mounted) setState(s)
        }).catch(() => { })
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
    callCount: number; mailCount: number; lastCallOutcome: string | null; lastMailOutcome: string | null;
    owner: { id: string; name: string; email: string } | null
    contacts: Array<{ id: string; name: string; email: string | null; phone: string | null; socials: string | null; position: string | null; isPrimary: boolean }>
    activityLogs: { id: string, type: string, action: string, description: string, createdAt: string, user: { name: string } }[]
    tasks: { id: string, title: string, taskType: string, completed: boolean, priority: string, dueDate: string | null, owner: { name: string } | null }[]
    callAttempts: { id: string, outcome: string, note?: string, createdAt: string }[]
    mailAttempts: { id: string, outcome: string, note?: string, createdAt: string }[]
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

function Stepper({ lead, onRefresh, onConvert, availableStatuses }: { lead: Lead, onRefresh: () => void, onConvert: () => void, availableStatuses: { value: string, color: string | null }[] }) {
    const [activePopup, setActivePopup] = useState<string | null>(null)
    const [note, setNote] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const status = lead.status

    if (availableStatuses.length === 0) {
        return <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 10 }}>No statuses defined. Please configure them in Admin Settings.</div>
    }

    const pipelineSteps = availableStatuses.filter(s => !OUTCOME_STATUSES.includes(s.value))
    const outcomeSteps = availableStatuses.filter(s => OUTCOME_STATUSES.includes(s.value))
    const isOutcome = OUTCOME_STATUSES.includes(status)
    const currentIndex = pipelineSteps.findIndex(s => s.value === status)
    const effectiveIndex = isOutcome ? pipelineSteps.length - 1 : currentIndex

    const handleStepClick = (stepValue: string) => {
        if (stepValue === 'Called' || stepValue === 'Mail Sent') {
            setActivePopup(activePopup === stepValue ? null : stepValue)
            setNote('')
            setDueDate('')
        }
    }

    const logCallAttempt = async (outcome: string) => {
        setSubmitting(true)
        try {
            await fetch(`/api/leads/${lead.id}/call-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome, note: note || undefined, dueDate: dueDate || undefined }),
            })
            setActivePopup(null)
            setNote('')
            setDueDate('')
            onRefresh()
        } catch (err) { console.error(err) }
        finally { setSubmitting(false) }
    }

    const logMailAttempt = async (outcome: string) => {
        setSubmitting(true)
        try {
            await fetch(`/api/leads/${lead.id}/mail-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome, note: note || undefined }),
            })
            setActivePopup(null)
            setNote('')
            onRefresh()
        } catch (err) { console.error(err) }
        finally { setSubmitting(false) }
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
        if (stepValue === 'Called') return lead.callCount > 0 ? lead.callCount : null
        if (stepValue === 'Mail Sent') return lead.mailCount > 0 ? lead.mailCount : null
        return null
    }

    const getStepBadgeColor = (stepValue: string) => {
        if (stepValue === 'Called') {
            if (lead.lastCallOutcome === 'connected_interested') return '#22c55e'
            if (lead.callCount > 0) return '#f59e0b'
        }
        if (stepValue === 'Mail Sent') {
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
                    const isClickable = step.value === 'Called' || step.value === 'Mail Sent'

                    return (
                        <div key={step.value} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: 10, flex: 1 }}>
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
                                    boxShadow: activePopup === step.value ? `0 0 0 3px ${barColor}40` : 'none',
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
                                {step.value === 'Called' ? 'Call' : step.value === 'Mail Sent' ? 'Mail' : step.value}
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
            {activePopup === 'Called' && (
                <div style={{
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
                                onClick={() => opt.value === 'call_back_later' && !dueDate ? setDueDate('show') : logCallAttempt(opt.value)}
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

                    {/* Follow-up date picker for Call Back Later */}
                    {dueDate === 'show' && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="datetime-local" onChange={e => setDueDate(e.target.value)}
                                style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                            <button onClick={() => logCallAttempt('call_back_later')} disabled={!dueDate || dueDate === 'show' || submitting}
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
            {activePopup === 'Mail Sent' && (
                <div style={{
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


export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)
    const [lead, setLead] = useState<Lead | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [converting, setConverting] = useState(false)
    const [showConvertModal, setShowConvertModal] = useState(false)
    const [activeTab, setActiveTab] = useState<'tasks'>('tasks')
    const [newTask, setNewTask] = useState({ title: '', taskType: 'Follow-up', dueDate: '', priority: 'Medium' })
    const [creatingTask, setCreatingTask] = useState(false)
    const [priorities, setPriorities] = useState<{ value: string; color: string | null }[]>([])
    const [savingNotes, setSavingNotes] = useState<'idle' | 'saving' | 'saved'>('idle')
    // Track the last notes value that was saved so we only auto-save on actual changes.
    const savedNotesRef = useRef<string | null | undefined>(undefined)

    const [statuses, setStatuses] = useState<{ value: string, color: string | null }[]>([])
    const [users, setUsers] = useState<{ id: string, name: string }[]>([])
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

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
                router.push(`/opportunities`)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setConverting(false)
        }
    }

    const fetchLeadAndOptions = useCallback(async () => {
        const [leadRes, statusRes, priorityRes, userRes] = await Promise.all([
            fetch(`/api/leads/${id}`).then(r => r.json()),
            fetch(`/api/admin/settings?category=LEAD_STATUS`).then(r => r.json()),
            fetch(`/api/admin/settings?category=TASK_PRIORITY`).then(r => r.json()),
            fetch('/api/users').then(r => r.json())
        ])
        setLead(leadRes)
        if (statusRes.options) setStatuses(statusRes.options)
        if (priorityRes.options) setPriorities(priorityRes.options)
        if (userRes && userRes.users) setUsers(userRes.users)
        else setUsers([])
        setLoading(false)
    }, [id])

    const reassignLead = async (userId: string) => {
        if (!lead) return
        try {
            await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...toLeadPayload(lead), ownerId: userId })
            })
            await fetchLeadAndOptions()
            setNotification({ message: 'Lead reassigned successfully', type: 'success' })
        } catch (e) { console.error(e) }
    }

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTask.title.trim()) return
        setCreatingTask(true)
        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newTask, leadId: id })
        })
        setNewTask({ title: '', taskType: 'Follow-up', dueDate: '', priority: 'Medium' })
        setCreatingTask(false)
        await fetchLeadAndOptions()
    }

    const handleToggleTask = async (taskId: string) => {
        await fetch(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' })
        await fetchLeadAndOptions()
    }

    const handleUpdateLead = useCallback(async (updates: Partial<Lead>) => {
        if (!lead) return
        const updatedLead = { ...lead, ...updates }

        // Optimistic update
        setLead(updatedLead)

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
                    body: JSON.stringify({ ...toLeadPayload(lead!), notes: currentNotes })
                })
                if (res.ok) {
                    savedNotesRef.current = currentNotes
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

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
    if (!lead) return <div style={{ padding: 40 }}><p style={{ color: 'var(--text-muted)' }}>Lead not found.</p></div>

    const primaryContact = lead.contacts?.find(c => c.isPrimary) || lead.contacts?.[0]
    const position = primaryContact?.position || 'Contact'
    const displayTitle = lead.company || lead.name || 'Unknown'
    const initials = displayTitle.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    const ownerInitials = lead.owner?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

    return (
        <div style={{ padding: '24px 32px' }}>
            {/* Breadcrumb */}
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/customers" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Customers</Link>
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
                                <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.4)' }}>
                                    {initials}
                                </div>
                                <div>
                                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{displayTitle}</h1>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
                                        <User size={14} /> {lead.name && lead.name !== lead.company ? `${lead.name} • ${position}` : 'Lead Company'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setIsEditing(true)} className="btn-secondary"><Pencil size={14} /> Edit</button>

                            </div>
                        </div>

                        {/* Pipeline Status */}
                        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>PIPELINE STATUS</div>
                                <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-secondary)', padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
                                    {lead.status}
                                </div>
                            </div>
                            <Stepper lead={lead} onRefresh={fetchLeadAndOptions} onConvert={handleConvert} availableStatuses={statuses} />
                        </div>

                        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                background: 'var(--bg-input)', borderRadius: 10, border: '1px solid transparent',
                                transition: 'border-color 0.2s',
                            }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Mail size={14} color="var(--accent-primary)" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
                                    {lead.email ? lead.email.split(',').map((e: string, i: number) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Link href={`mailto:${e.trim()}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.trim()}</Link>
                                            <EmailBadge email={e.trim()} />
                                        </div>
                                    )) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
                                </div>
                            </div>

                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                background: 'var(--bg-input)', borderRadius: 10, border: '1px solid transparent',
                                transition: 'border-color 0.2s',
                            }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={14} color="#06b6d4" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</span>
                                    <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{lead.country || 'Unknown'}</span>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                background: 'var(--bg-input)', borderRadius: 10, border: '1px solid transparent',
                                transition: 'border-color 0.2s',
                            }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Phone size={14} color="#22c55e" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</span>
                                    {lead.phone ? lead.phone.split(',').map((p: string, i: number) => (
                                        <Link key={i} href={`tel:${p.trim()}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>{p.trim()}</Link>
                                    )) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
                                </div>
                            </div>

                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                background: 'var(--bg-input)', borderRadius: 10, border: '1px solid transparent',
                                transition: 'border-color 0.2s',
                            }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Globe size={14} color="#f59e0b" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Web & Social</span>
                                    {lead.website ? (
                                        <Link href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.website}</Link>
                                    ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
                                    {lead.socials && (() => {
                                        try {
                                            const socials = JSON.parse(lead.socials);
                                            return (
                                                <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                                                    {socials.map((s: { platform: string, url: string }, i: number) => (
                                                        <Link key={`lead-social-${i}`} href={s.url.startsWith('http') ? s.url : `https://${s.url}`} target="_blank"
                                                            style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontSize: 11, fontWeight: 600, background: 'rgba(139,92,246,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                                                            {s.platform}
                                                        </Link>
                                                    ))}
                                                </div>
                                            );
                                        } catch { return null; }
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Section */}
                    <div className="card" style={{ padding: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 0, padding: '0 24px' }}>
                            {[
                                { key: 'tasks' as const, icon: <CheckSquare size={15} />, label: 'Tasks', count: lead.tasks?.filter(t => !t.completed).length },
                            ].map(t => (
                                <button key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    style={{
                                        padding: '14px 16px', borderBottom: `2.5px solid ${activeTab === t.key ? 'var(--accent-primary)' : 'transparent'}`,
                                        background: 'none', color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                        transition: 'all 0.2s', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
                                    }}
                                >
                                    {t.icon} {t.label}
                                    {(t.count ?? 0) > 0 && <span style={{ fontSize: 10, background: activeTab === t.key ? 'rgba(99,102,241,0.15)' : 'var(--bg-input)', color: activeTab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{t.count}</span>}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: '20px 24px', minHeight: 0, flex: 1 }}>
                            {activeTab === 'tasks' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Compact Quick Add Task Form */}
                                    <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Add Follow-Up</div>
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
                                                {priorities.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
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
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>No follow-ups yet</div>
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
                                                            {task.owner && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>→ {task.owner.name}</div>}
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

                    {/* Private Notes Card - Dedicated Space */}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={14} color="#8b5cf6" />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Private Notes</span>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>Only visible to you</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                                {savingNotes === 'saving' && <><Loader2 size={12} className="animate-spin" /> Saving...</>}
                                {savingNotes === 'saved' && <><Check size={12} color="#22c55e" /> Saved</>}
                            </div>
                        </div>
                        <textarea value={lead.notes || ''}
                            onChange={e => setLead(l => l ? { ...l, notes: e.target.value } : null)}
                            placeholder="Write your notes about this lead here...&#10;&#10;💡 Tips:&#10;• Key discussion points&#10;• Budget & timeline&#10;• Decision makers&#10;• Next steps"
                            style={{
                                width: '100%', minHeight: 180, padding: '16px 18px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10,
                                color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.7, resize: 'vertical',
                                fontFamily: 'inherit',
                            }} />
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
                                width: '100%', padding: '16px', background: 'var(--bg-card)',
                                border: '1px dashed rgba(99,102,241,0.5)', borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                color: 'var(--accent-primary)', fontSize: 16, fontWeight: 600,
                                cursor: converting ? 'not-allowed' : 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                opacity: converting ? 0.7 : 1
                            }} onMouseOver={e => !converting && (e.currentTarget.style.background = 'rgba(99,102,241,0.05)', e.currentTarget.style.transform = 'translateY(-2px)')} onMouseOut={e => !converting && (e.currentTarget.style.background = 'var(--bg-card)', e.currentTarget.style.transform = 'translateY(0)')}>
                            <Rocket size={20} className={converting ? 'animate-pulse' : ''} /> {converting ? 'Converting...' : 'Convert to Opportunity'}
                        </button>
                    )}

                    {/* Contacts */}
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 16 }}>
                            <User size={16} color="var(--accent-primary)" /> Contact Persons
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {lead.contacts?.length ? lead.contacts.map(c => (
                                <div key={c.id} style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{c.name}</div>
                                        {c.isPrimary && <div style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>PRIMARY</div>}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.position || 'No Title'}</div>
                                    {c.email && c.email.split(',').map((e: string, i: number) => (
                                        <Link key={`email-${i}`} href={`mailto:${e.trim()}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-primary)', marginTop: i === 0 ? 4 : 0, textDecoration: 'none' }}><Mail size={12} /> {e.trim()}</Link>
                                    ))}
                                    {c.phone && c.phone.split(',').map((p: string, i: number) => (
                                        <Link key={`phone-${i}`} href={`tel:${p.trim()}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}><Phone size={12} /> {p.trim()}</Link>
                                    ))}
                                    {c.socials && (() => {
                                        try {
                                            const socials = JSON.parse(c.socials);
                                            return socials.map((s: { platform: string, url: string }, i: number) => (
                                                <Link key={`contact-social-${i}`} href={s.url.startsWith('http') ? s.url : `https://${s.url}`} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-secondary)', textDecoration: 'none' }}><Globe size={12} /> {s.platform}</Link>
                                            ));
                                        } catch {
                                            return null;
                                        }
                                    })()}
                                </div>
                            )) : (
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No contacts found.</div>
                            )}
                        </div>
                    </div>

                    {/* Overview */}
                    <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 16 }}>LEAD OVERVIEW</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{format(parseISO(lead.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Last Active</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatDistanceToNow(parseISO(lead.updatedAt))} ago</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Country</span>
                                <span style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{lead.country || 'Unknown'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Industry</span>
                                <span style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{lead.industry || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Priority</span>
                                {lead.priority ? (
                                    <span style={{
                                        fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                        background: lead.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : lead.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: lead.priority === 'High' ? '#ef4444' : lead.priority === 'Medium' ? '#f59e0b' : '#10b981',
                                        border: `1px solid ${lead.priority === 'High' ? 'rgba(239, 68, 68, 0.2)' : lead.priority === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                    }}>{lead.priority}</span>
                                ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </div>
                        </div>

                        <div style={{ height: 1, borderBottom: '1px solid var(--border)', margin: '16px 0' }} />

                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Lead Owner</span>
                            <select
                                value={lead.owner?.id || ''}
                                onChange={e => reassignLead(e.target.value)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            >
                                <option value="">Reassign</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)', fontWeight: 600 }}>
                                {ownerInitials}
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lead.owner?.name || 'Unassigned'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sales Rep</div>
                            </div>
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <History size={14} /> ACTIVITY TIMELINE
                        </div>
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            <ActivityTimeline activities={lead.activityLogs} />
                        </div>
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
                            <button className="btn-primary" onClick={executeConvert} style={{ flex: 1, padding: '12px 0' }}>Yes, Convert Lead</button>
                        </div>
                    </div>
                </div>
            )}

            {/* In-app Notification (Toast) */}
            {
                notification && (
                    <div style={{
                        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
                        zIndex: 1000, animation: 'slideUp 0.3s ease-out', color: 'var(--text-primary)'
                    }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={14} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{notification.message}</span>
                    </div>
                )
            }

            <style>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    )
}
