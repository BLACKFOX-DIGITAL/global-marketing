'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import NotificationCenter from '@/components/NotificationCenter'

const fetcher = (url: string) => fetch(url).then(res => res.json())
import Link from 'next/link'
import { Plus, CheckCircle, Calendar, LayoutList, Calendar as CalendarIcon, Building, Search, Pencil } from 'lucide-react'
import { format, parseISO, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns'
import TaskCalendar from '@/components/TaskCalendar'
import EditTaskModal from '@/components/EditTaskModal'

const TASK_TYPES = [
    { value: 'Call', icon: '📞', color: '#6366f1' },
    { value: 'Email', icon: '📧', color: '#06b6d4' },
    { value: 'Meeting', icon: '🤝', color: '#f59e0b' },
    { value: 'Follow-up', icon: '🔄', color: '#10b981' },
    { value: 'Send Proposal', icon: '📄', color: '#8b5cf6' },
    { value: 'Other', icon: '📌', color: '#94a3b8' },
]

interface Task {
    id: string; title: string; description: string | null; priority: string; taskType: string
    completed: boolean; dueDate: string | null; recurrence: string; createdAt: string
    owner: { name: string } | null
    lead?: { id: string; name: string; company: string | null } | null
}

type TabType = 'All' | 'Pending' | 'Completed' | 'Overdue'
const TABS: TabType[] = ['All', 'Pending', 'Completed', 'Overdue']

interface CreateTaskModalProps {
    onClose: () => void
    onCreated: () => void
    leads: Array<{ id: string; name: string; company: string | null }>
    priorities: Array<{ value: string; color: string | null }>
    preSelectedLeadId?: string
    preSelectedDate?: string
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

function CreateTaskModal({ onClose, onCreated, leads, priorities, preSelectedLeadId, preSelectedDate }: CreateTaskModalProps) {
    const defaultPriority = priorities.length > 0 ? priorities[0].value : 'Medium'
    const [form, setForm] = useState({
        title: '',
        description: '',
        taskType: 'Follow-up',
        priority: defaultPriority,
        dueDate: preSelectedDate || '',
        leadId: preSelectedLeadId || '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.title.trim() || !form.leadId) return
        setLoading(true)
        setError(null)
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        setLoading(false)
        if (res.ok) {
            onCreated()
        } else {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Failed to create task')
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 520 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>New Task</h3>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">For Lead <span style={{ color: '#ef4444' }}>*</span></label>
                        <SearchableLeadPicker
                            leads={leads}
                            value={form.leadId}
                            onChange={val => setForm(f => ({ ...f, leadId: val }))}
                        />
                    </div>

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
                        <label className="form-label">What do you need to do? <span style={{ color: '#ef4444' }}>*</span></label>
                        <input placeholder="e.g. Call back about pricing, Send contract draft..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes (optional)</label>
                        <textarea rows={2} placeholder="Any additional context..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
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

                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13 }}>
                            {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading || !form.leadId}>
                            {loading ? <div className="spinner" /> : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function ViewTaskModal({ task, onClose, onToggle, onEdit, priorities }: { task: Task, onClose: () => void, onToggle: (id: string) => void, onEdit: (id: string) => void, priorities: any[] }) {
    const priorityColor = priorities.find(p => p.value === task.priority)?.color || 'var(--text-muted)'

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 460 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div className="badge" style={{ background: `${priorityColor}15`, color: priorityColor, border: `1px solid ${priorityColor}40` }}>{task.priority} Priority</div>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12, background: 'var(--accent-primary)10',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                    }}>
                        {TASK_TYPES.find(t => t.value === task.taskType)?.icon || '📌'}
                    </div>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{task.title}</h3>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                            {task.taskType} • {task.dueDate ? format(parseISO(task.dueDate), 'MMMM d, h:mm a') : 'No due date'}
                        </div>
                    </div>
                </div>

                {task.description && (
                    <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 12, fontSize: 14, color: 'var(--text-primary)', marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                        {task.description}
                    </div>
                )}

                {task.lead && (
                    <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Lead</div>
                            <div style={{ fontWeight: 600 }}>{task.lead.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.lead.company || 'No company'}</div>
                        </div>
                        <Link href={`/leads/${task.lead.id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none' }}>View Lead</Link>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        className="btn-primary"
                        style={{ flex: 1, background: task.completed ? 'var(--text-muted)' : 'var(--accent-primary)' }}
                        onClick={() => { onToggle(task.id); onClose(); }}
                    >
                        {task.completed ? 'Undo Completion' : 'Mark as Completed'}
                    </button>
                    {!task.completed && (
                        <button
                            className="btn-secondary"
                            style={{ flex: 0.5 }}
                            onClick={() => { onEdit(task.id); onClose(); }}
                        >
                            <Pencil size={14} /> Edit
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function TasksPage() {
    const [tab, setTab] = useState<TabType>('All')
    const [showModal, setShowModal] = useState(false)
    const [view, setView] = useState<'list' | 'calendar'>('list')
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [viewTask, setViewTask] = useState<Task | null>(null)
    const [editTaskId, setEditTaskId] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [page, setPage] = useState(1)
    const [priorityFilter, setPriorityFilter] = useState('All Priorities')

    useEffect(() => {
        setMounted(true)
    }, [])

    const { data: tasksData, mutate: fetchTasks } = useSWR(`/api/tasks?status=${tab}&priority=${priorityFilter}&page=${page}&limit=10`, fetcher, { keepPreviousData: true })
    const { data: prioritiesData } = useSWR('/api/admin/settings?category=TASK_PRIORITY', fetcher, { keepPreviousData: true })
    const { data: leadsData } = useSWR('/api/leads?limit=100', fetcher, { keepPreviousData: true })

    const tasks: Task[] = Array.isArray(tasksData?.tasks) ? tasksData.tasks : []
    const pagination = tasksData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 }
    const priorities: Array<{ value: string; color: string | null }> = prioritiesData?.options || []
    const leads: Array<{ id: string; name: string; company: string | null }> = leadsData?.leads || (Array.isArray(leadsData) ? leadsData : [])
    
    async function toggleTask(id: string) {
        const task = tasks.find(t => t.id === id)
        const wasCompleted = task?.completed
        const res = await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' })
        
        if (!wasCompleted && res.ok) {
            try {
                const data = await res.json()
                const { handleGamificationResult } = await import('@/lib/confetti')
                if (data.gamification) {
                    handleGamificationResult(data.gamification, 'task')
                }
            } catch {
                const { celebrateSmall } = await import('@/lib/confetti')
                celebrateSmall()
            }
        }
        
        fetchTasks()
    }

    function deleteTaskAsk(id: string) {
        setDeleteConfirmId(id)
    }

    async function executeDeleteTask() {
        if (!deleteConfirmId) return
        const idToDelete = deleteConfirmId
        setDeleteConfirmId(null)
        await fetch(`/api/tasks/${idToDelete}`, { method: 'DELETE' })
        fetchTasks()
    }

    const getTaskTypeInfo = (type: string) => TASK_TYPES.find(t => t.value === type) || TASK_TYPES[5]

    return (
        <>
            <div className="crm-content" style={{ paddingTop: 12, paddingBottom: 12, display: 'flex', flexDirection: 'column' }}>
                <div className="page-header" style={{ marginBottom: 16 }}>
                    <div>
                        <h2 style={{ fontSize: 22 }}>Tasks & Follow-Ups</h2>
                        <p style={{ fontSize: 12 }}>Track calls, emails, meetings and follow-ups.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <NotificationCenter />
                        <div style={{ display: 'flex', background: 'var(--bg-input)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
                            <button
                                onClick={() => setView('list')}
                                style={{
                                    padding: '6px 12px', borderRadius: 8, border: 'none', background: view === 'list' ? 'var(--bg-card)' : 'transparent',
                                    color: view === 'list' ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    boxShadow: view === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                }}
                            ><LayoutList size={14} /> List</button>
                            <button
                                onClick={() => setView('calendar')}
                                style={{
                                    padding: '6px 12px', borderRadius: 8, border: 'none', background: view === 'calendar' ? 'var(--bg-card)' : 'transparent',
                                    color: view === 'calendar' ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    boxShadow: view === 'calendar' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                }}
                            ><CalendarIcon size={14} /> Calendar</button>
                        </div>
                        <button className="btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> New Task
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div className="tabs" style={{ padding: 2 }}>
                        {TABS.map(t => (
                            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setPage(1); }} style={{ padding: '5px 12px', fontSize: 12 }}>
                                {t} {tasksData?.counts?.[t] !== undefined && <span style={{ marginLeft: 4, opacity: 0.6 }}>({tasksData.counts[t]})</span>}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select 
                            style={{ width: 120, height: 32, fontSize: 12, padding: '4px 8px' }}
                            value={priorityFilter}
                            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                        >
                            <option>All Priorities</option>
                            {priorities.map(p => <option key={p.value}>{p.value}</option>)}
                        </select>
                    </div>
                </div>

                {view === 'calendar' ? (
                    <TaskCalendar
                        tasks={tasks}
                        priorities={priorities}
                        onDateClick={(date) => {
                            setSelectedDate(format(date, 'yyyy-MM-dd'));
                            setShowModal(true);
                        }}
                        onTaskClick={(task) => setViewTask(task as any)}
                    />
                ) : (
                    <div className="card" style={{ padding: 0 }}>
                        {!tasksData ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
                        ) : tasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                                <CheckCircle size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No tasks here</div>
                                <div style={{ fontSize: 13 }}>Create a new task from any lead page or click &quot;New Follow-Up&quot;</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {tasks.map(task => {
                                    const isOverdue = !task.completed && task.dueDate && isPast(parseISO(task.dueDate))
                                    const typeInfo = getTaskTypeInfo(task.taskType)
                                    return (
                                        <div key={task.id} className="task-row" style={{
                                            padding: '8px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            minHeight: 52,
                                            transition: 'all 0.2s ease'
                                        }}>
                                            <button
                                                className={`task-check ${task.completed ? 'checked' : ''}`}
                                                onClick={() => toggleTask(task.id)}
                                                style={{
                                                    width: 22, height: 22,
                                                    background: task.completed ? 'var(--accent-primary)' : 'transparent',
                                                    border: `2px solid ${task.completed ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                                                    borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {task.completed && <CheckCircle size={14} color="white" />}
                                            </button>

                                            <div style={{
                                                width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: `${typeInfo.color}15`, fontSize: 14, flexShrink: 0
                                            }}>
                                                {typeInfo.icon}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>
                                                    {task.title}
                                                </div>
                                                {task.lead && (
                                                    <Link href={`/leads/${task.lead.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-secondary)', marginTop: 2, textDecoration: 'none' }}>
                                                        <Building size={11} /> {task.lead.name} {task.lead.company ? `· ${task.lead.company}` : ''}
                                                    </Link>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, justifyContent: 'flex-end', width: 260 }}>
                                                {task.dueDate && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: 7, fontSize: 13,
                                                        color: isOverdue ? '#ef4444' : 'var(--text-secondary)',
                                                        fontWeight: isOverdue ? 600 : 400,
                                                        width: 125, flexShrink: 0
                                                    }}>
                                                        <Calendar size={14} style={{ opacity: 0.6 }} />
                                                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                            {!mounted ? format(parseISO(task.dueDate), 'MMM d') : (
                                                                isToday(parseISO(task.dueDate)) ? 'Today' :
                                                                    isTomorrow(parseISO(task.dueDate)) ? 'Tomorrow' :
                                                                        isPast(parseISO(task.dueDate)) && !task.completed ? formatDistanceToNow(parseISO(task.dueDate)) + ' ago' :
                                                                            format(parseISO(task.dueDate), 'MMM d')
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                                <div style={{ width: 90, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span className="badge" style={{
                                                        fontSize: 10, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                        padding: '4px 0',
                                                        background: `${priorities.find(p => p.value === task.priority)?.color || 'var(--text-muted)'}15`,
                                                        color: priorities.find(p => p.value === task.priority)?.color || 'var(--text-muted)',
                                                        border: `1px solid ${priorities.find(p => p.value === task.priority)?.color || 'var(--text-muted)'}30`
                                                    }}>{task.priority}</span>
                                                </div>
                                                <div style={{ width: 64, display: 'flex', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
                                                    {!task.completed && (
                                                        <button className="btn-ghost" onClick={() => setEditTaskId(task.id)} style={{ borderRadius: '50%', color: 'var(--accent-primary)' }}>
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                    <button className="btn-ghost" onClick={() => deleteTaskAsk(task.id)} style={{ borderRadius: '50%', color: '#ef4444' }}>✕</button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                
                                {tasksData && pagination.totalPages > 1 && (() => {
                                    const totalPages = pagination.totalPages
                                    const pageNums = totalPages <= 5
                                        ? Array.from({ length: totalPages }, (_, i) => i + 1)
                                        : Array.from({ length: 5 }, (_, i) => Math.max(1, Math.min(page - 2, totalPages - 4)) + i)
                                    return (
                                        <div className="pagination-container" style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border)' }}>
                                            <button className="btn-secondary" disabled={page <= 1} onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '6px 12px', fontSize: 13 }}>
                                                Previous
                                            </button>
                                            {pageNums[0] > 1 && <>
                                                <button onClick={() => setPage(1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>1</button>
                                                {pageNums[0] > 2 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                                            </>}
                                            {pageNums.map(n => (
                                                <button key={n} onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    style={{
                                                        width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                                                        background: page === n ? 'var(--accent-primary)' : 'var(--bg-card)',
                                                        color: page === n ? 'white' : 'var(--text-secondary)',
                                                        fontSize: 12, fontWeight: 700, cursor: 'pointer'
                                                    }}>{n}</button>
                                            ))}
                                            {pageNums[pageNums.length - 1] < totalPages && <>
                                                {pageNums[pageNums.length - 1] < totalPages - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                                                <button onClick={() => setPage(totalPages)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: page === totalPages ? 'var(--accent-primary)' : 'var(--bg-card)', color: page === totalPages ? 'white' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{totalPages}</button>
                                            </>}
                                            <button className="btn-secondary" disabled={page >= pagination.totalPages} onClick={() => { setPage(p => Math.min(pagination.totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '6px 12px', fontSize: 13 }}>
                                                Next
                                            </button>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <CreateTaskModal
                    onClose={() => { setShowModal(false); setSelectedDate(null); }}
                    onCreated={() => { setShowModal(false); setSelectedDate(null); fetchTasks(); }}
                    leads={leads}
                    priorities={priorities}
                    preSelectedDate={selectedDate || undefined}
                />
            )}

            {viewTask && (
                <ViewTaskModal
                    task={viewTask}
                    onClose={() => setViewTask(null)}
                    onToggle={toggleTask}
                    onEdit={setEditTaskId}
                    priorities={priorities}
                />
            )}

            {editTaskId && (
                <EditTaskModal
                    taskId={editTaskId}
                    onClose={() => setEditTaskId(null)}
                    onSuccess={() => { setEditTaskId(null); fetchTasks(); }}
                    leads={leads}
                    priorities={priorities}
                />
            )}

            {deleteConfirmId && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <span style={{ fontSize: 24 }}>✕</span>
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Delete Task</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                Are you sure you want to delete this task? This action cannot be undone.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px 0' }}>Cancel</button>
                            <button className="btn-primary" onClick={executeDeleteTask} style={{ flex: 1, padding: '12px 0', background: '#ef4444', borderColor: '#ef4444' }}>
                                Yes, Delete Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
