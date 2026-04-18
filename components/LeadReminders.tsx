'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Bell, Plus, Trash2, Clock } from 'lucide-react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ReminderData {
    id: string
    message: string | null
    remindAt: string
    isTriggered: boolean
    createdAt: string
}

export default function LeadReminders({ leadId }: { leadId: string }) {
    const { data, mutate } = useSWR<{ reminders: ReminderData[] }>(`/api/leads/${leadId}/reminders`, fetcher)
    const [showForm, setShowForm] = useState(false)
    const [message, setMessage] = useState('')
    const [remindAt, setRemindAt] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleCreate = async () => {
        if (!remindAt || submitting) return
        setSubmitting(true)
        try {
            const res = await fetch(`/api/leads/${leadId}/reminders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message.trim() || null, remindAt })
            })
            if (!res.ok) throw new Error('Failed')
            setMessage('')
            setRemindAt('')
            setShowForm(false)
            mutate()
        } catch { /* toast? */ }
        finally { setSubmitting(false) }
    }

    const handleDelete = async (reminderId: string) => {
        try {
            const res = await fetch(`/api/leads/${leadId}/reminders`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reminderId })
            })
            if (!res.ok) throw new Error('Failed')
            mutate()
        } catch { /* toast? */ }
    }

    const reminders = data?.reminders || []
    const activeReminders = reminders.filter(r => !r.isTriggered)
    const pastReminders = reminders.filter(r => r.isTriggered)

    return (
        <div style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={14} color="#f59e0b" />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Reminders</span>
                    {activeReminders.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: 100 }}>
                            {activeReminders.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--accent-primary)', fontSize: 10, fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={12} /> Set Reminder
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <div style={{ padding: 16, background: 'rgba(15,23,42,0.6)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.1)', marginBottom: 12, animation: 'slideDown 0.15s ease' }}>
                    <input
                        type="datetime-local"
                        value={remindAt}
                        onChange={e => setRemindAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        style={{
                            width: '100%', padding: '8px 10px', borderRadius: 6,
                            border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)',
                            color: 'var(--text-primary)', fontSize: 12, marginBottom: 8, outline: 'none'
                        }}
                    />
                    <input
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Optional message (e.g. 'Follow up about proposal')"
                        style={{
                            width: '100%', padding: '8px 10px', borderRadius: 6,
                            border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)',
                            color: 'var(--text-primary)', fontSize: 12, marginBottom: 8, outline: 'none'
                        }}
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowForm(false)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleCreate} disabled={!remindAt || submitting} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 700, cursor: remindAt ? 'pointer' : 'not-allowed', opacity: remindAt ? 1 : 0.5 }}>Save</button>
                    </div>
                </div>
            )}

            {/* Active reminders */}
            {activeReminders.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activeReminders.map(r => (
                        <div key={r.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 14px', background: 'rgba(245,158,11,0.08)',
                            border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12,
                            boxShadow: 'inset 0 1px 0 rgba(245,158,11,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clock size={12} color="#f59e0b" />
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {format(new Date(r.remindAt), 'MMM d, yyyy · h:mm a')}
                                    </div>
                                    {r.message && (
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{r.message}</div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(r.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, opacity: 0.5 }}
                                onMouseEnter={e => (e.target as HTMLElement).style.opacity = '1'}
                                onMouseLeave={e => (e.target as HTMLElement).style.opacity = '0.5'}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Past/triggered reminders (collapsed) */}
            {pastReminders.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                    {pastReminders.length} past reminder{pastReminders.length > 1 ? 's' : ''} triggered
                </div>
            )}

            {reminders.length === 0 && !showForm && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
                    No reminders set
                </div>
            )}
        </div>
    )
}
