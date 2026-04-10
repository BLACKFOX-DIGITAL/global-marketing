'use client'
import { useState, useEffect } from 'react'
import { Search, Info } from 'lucide-react'

const TASK_TYPES = [
    { value: 'Call', icon: '📞', color: '#6366f1' },
    { value: 'Email', icon: '📧', color: '#06b6d4' },
    { value: 'Meeting', icon: '🤝', color: '#f59e0b' },
    { value: 'Follow-up', icon: '🔄', color: '#10b981' },
    { value: 'Send Proposal', icon: '📄', color: '#8b5cf6' },
    { value: 'Other', icon: '📌', color: '#94a3b8' },
]

interface EditTaskModalProps {
    taskId: string
    onClose: () => void
    onSuccess: () => void
    leads: Array<{ id: string; name: string; company: string | null }>
    priorities: Array<{ value: string; color: string | null }>
}

function SearchableLeadPicker({ leads, value, onChange }: { leads: any[], value: string, onChange: (val: string) => void }) {
    const [search, setSearch] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const selectedLead = leads.find(l => l.id === value)
    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.company || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10)

    return (
        <div style={{ position: 'relative' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg-input)', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', fontSize: 13
                }}
            >
                {selectedLead ? (
                    <span>{selectedLead.name} {selectedLead.company ? `(${selectedLead.company})` : ''}</span>
                ) : (
                    <span style={{ color: 'var(--text-muted)' }}>— Select a Lead —</span>
                )}
                <Search size={14} color="var(--text-muted)" />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden'
                }}>
                    <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                        <input
                            autoFocus
                            placeholder="Type to search leads..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '6px 10px', borderRadius: 6,
                                border: '1px solid var(--border)', background: 'var(--bg-input)',
                                fontSize: 13
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {filteredLeads.length === 0 ? (
                            <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No leads found</div>
                        ) : filteredLeads.map(l => (
                            <div
                                key={l.id}
                                onClick={() => { onChange(l.id); setIsOpen(false); setSearch('') }}
                                style={{
                                    padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background: value === l.id ? 'var(--accent-primary)15' : 'transparent',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                                onMouseLeave={e => e.currentTarget.style.background = value === l.id ? 'var(--accent-primary)15' : 'transparent'}
                            >
                                <div style={{ fontWeight: 600 }}>{l.name}</div>
                                {l.company && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.company}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function EditTaskModal({ taskId, onClose, onSuccess, leads, priorities }: EditTaskModalProps) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        taskType: 'Follow-up',
        priority: 'Medium',
        dueDate: '',
        leadId: '',
    })
    const [leadDisplay, setLeadDisplay] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch(`/api/tasks/${taskId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error)
                } else {
                    setForm({
                        title: data.title || '',
                        description: data.description || '',
                        taskType: data.taskType || 'Follow-up',
                        priority: data.priority || 'Medium',
                        dueDate: data.dueDate ? new Date(data.dueDate).toISOString().slice(0, 16) : '',
                        leadId: data.leadId || '',
                    })
                    if (data.lead) {
                        setLeadDisplay(data.lead.company
                            ? `${data.lead.name} (${data.lead.company})`
                            : data.lead.name
                        )
                    }
                }
                setLoading(false)
            })
            .catch(() => {
                setError('Failed to load task')
                setLoading(false)
            })
    }, [taskId])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.title.trim()) return
        setSubmitting(true)
        setError('')
        
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            
            if (res.ok) {
                onSuccess()
            } else {
                const d = await res.json()
                setError(d.error || 'Failed to update task')
            }
        } catch {
            setError('Connection error')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 520, display: 'flex', justifyContent: 'center', padding: 100 }}>
                <div className="spinner" />
            </div>
        </div>
    )

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 520 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>Edit Follow-Up Task</h3>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
                </div>
                
                {error && (
                    <div style={{ 
                        padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                        borderRadius: 10, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 
                    }}>
                        <Info size={14} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {leadDisplay && (
                        <div className="form-group">
                            <label className="form-label">Associated Lead</label>
                            <div style={{
                                padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                                background: 'var(--bg-input)', fontSize: 13, color: 'var(--text-secondary)'
                            }}>
                                {leadDisplay}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Task Type</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {TASK_TYPES.map(t => (
                                <button key={t.value} type="button"
                                    onClick={() => setForm(f => ({ ...f, taskType: t.value }))}
                                    style={{
                                        padding: '8px 12px', borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 600,
                                        borderColor: form.taskType === t.value ? t.color : 'var(--border)',
                                        background: form.taskType === t.value ? `${t.color}15` : 'transparent',
                                        color: form.taskType === t.value ? t.color : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                                    }}
                                >{t.icon} {t.value}</button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Action Item <span style={{ color: '#ef4444' }}>*</span></label>
                        <input placeholder="What needs to be done?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea rows={3} placeholder="Add more details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Due Date & Time</label>
                            <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {priorities.map(p => (
                                    <button key={p.value} type="button"
                                        onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                                        style={{
                                            padding: '8px 12px', borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 600,
                                            borderColor: form.priority === p.value ? (p.color || 'var(--accent-primary)') : 'var(--border)',
                                            background: form.priority === p.value ? `${p.color || 'var(--accent-primary)'}20` : 'transparent',
                                            color: form.priority === p.value ? (p.color || 'var(--accent-primary)') : 'var(--text-secondary)',
                                            flex: 1, textAlign: 'center', cursor: 'pointer'
                                        }}
                                    >{p.value}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? <div className="spinner" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
