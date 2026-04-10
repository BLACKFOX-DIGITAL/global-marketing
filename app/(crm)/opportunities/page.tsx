'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'

import { Calendar, CheckCircle2, ListTodo, Search } from 'lucide-react'
import NotificationCenter from '@/components/NotificationCenter'
import { format, parseISO, differenceInDays } from 'date-fns'

interface Opportunity {
    id: string; title: string; company: string | null; stage: string
    probability: number; closeDate: string | null; createdAt: string; updatedAt: string
    owner: { name: string } | null; lead: { id: string; name: string; company: string | null } | null
}






function QuickTaskModal({ oppId, leadId, onClose, onCreated }: { oppId: string, leadId: string | null, onClose: () => void, onCreated: () => void }) {
    const [task, setTask] = useState({ title: '', taskType: 'Follow-up', priority: 'Medium', dueDate: '', ownerId: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!leadId) {
            setError('This opportunity has no linked lead. Tasks require a lead.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...task, opportunityId: oppId, leadId })
            })
            if (!res.ok) {
                const data = await res.json()
                setError(data.error || 'Failed to create task')
                return
            }
            onCreated()
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>Add Task</h3>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
                    <div className="form-group"><label className="form-label">Task Title</label><input placeholder="e.g. Schedule demo" value={task.title} onChange={e => setTask(f => ({ ...f, title: e.target.value }))} required /></div>
                    <div className="grid-2">
                        <div className="form-group"><label className="form-label">Type</label>
                            <select value={task.taskType} onChange={e => setTask(f => ({ ...f, taskType: e.target.value }))}>
                                <option>Follow-up</option>
                                <option>Call</option>
                                <option>Email</option>
                                <option>Meeting</option>
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Priority</label>
                            <select value={task.priority} onChange={e => setTask(f => ({ ...f, priority: e.target.value }))}>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group"><label className="form-label">Due Date</label><input type="datetime-local" value={task.dueDate} onChange={e => setTask(f => ({ ...f, dueDate: e.target.value }))} /></div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Add Task'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function OpportunitiesPage() {
    const { data: oppsData, mutate: mutateOpps } = useSWR('/api/opportunities', fetcher, { keepPreviousData: true })
    const { data: settingsData } = useSWR('/api/admin/settings?category=OPPORTUNITY_STAGE', fetcher, { keepPreviousData: true })

    const opportunities: Opportunity[] = Array.isArray(oppsData) ? oppsData : []
    const stages: Array<{ value: string; color: string | null }> = settingsData?.options || []
    
    const loading = !oppsData || !settingsData

    const [dragId, setDragId] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [taskModalOpp, setTaskModalOpp] = useState<{ oppId: string, leadId: string | null } | null>(null)
    const [stageConfirm, setStageConfirm] = useState<{ id: string, newStage: string, oppTitle: string } | null>(null)
    const [stageUpdating, setStageUpdating] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const filteredOpportunities = opportunities.filter(o =>
        (o.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.company || o.lead?.company || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    async function handleDrop(stage: string) {
        if (!dragId) return
        await fetch(`/api/opportunities/${dragId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage }),
        })
        setDragId(null)
        mutateOpps()
    }

    async function executeDelete() {
        if (!deleteConfirmId) return
        await fetch(`/api/opportunities/${deleteConfirmId}`, { method: 'DELETE' })
        setDeleteConfirmId(null)
        mutateOpps()
    }

    const updateStage = async (id: string, newStage: string, oppTitle: string) => {
        if (newStage === 'Closed Won' || newStage === 'Closed Lost') {
            setStageConfirm({ id, newStage, oppTitle })
        } else {
            await executeStageUpdate(id, newStage)
        }
    }

    const executeStageUpdate = async (id: string, newStage: string) => {
        if (stageUpdating) return
        setStageUpdating(true)

        if (newStage === 'Closed Won') {
            import('canvas-confetti').then((confetti) => {
                confetti.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
            }).catch(e => console.error('Confetti error', e))
        }

        await fetch(`/api/opportunities/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: newStage })
        })
        setStageUpdating(false)
        setStageConfirm(null)
        mutateOpps()
    }

    return (
            <div className="crm-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 16 }}>
                <div className="page-header" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ marginBottom: 0 }}>Opportunities Board</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {filteredOpportunities.length} deals</span>
                            <div className="search-bar" style={{ width: 220, height: 30 }}>
                                <Search size={13} color="var(--text-muted)" />
                                <input placeholder="Search deals..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ fontSize: 12 }} />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <NotificationCenter />
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
                ) : (
                    <div className="kanban-board">
                        {stages.map(stageObj => {
                            const stage = stageObj.value
                            const cards = filteredOpportunities.filter(o => o.stage === stage)
                            const count = cards.length
                            const avgProb = count > 0 ? Math.round(cards.reduce((sum, c) => sum + (c.probability || 0), 0) / count) : 0

                            return (
                                <div
                                    key={stage}
                                    className="kanban-column"
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => handleDrop(stage)}
                                >
                                    <div className="kanban-column-header">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div className="kanban-column-title" style={{ color: stageObj.color || 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {stage}
                                                <span className="kanban-column-count">{count}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                                                {avgProb}% Avg Win
                                            </div>
                                        </div>
                                    </div>
                                    <div className="kanban-cards">
                                        {cards.length === 0 && (
                                            <div style={{ padding: 24, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 12, opacity: 0.5 }}>
                                                Drag cards here
                                            </div>
                                        )}
                                        {cards.map(opp => {
                                            const daysInStage = differenceInDays(new Date(), parseISO(opp.updatedAt))
                                            return (
                                                <div
                                                    key={opp.id}
                                                    className={`kanban-card ${dragId === opp.id ? 'dragging' : ''}`}
                                                    draggable
                                                    onDragStart={() => setDragId(opp.id)}
                                                    onDragEnd={() => setDragId(null)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                        <div className="kanban-card-days">{daysInStage}d in stage</div>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            {stage !== 'Closed Won' && stage !== 'Closed Lost' && (
                                                                <>
                                                                    <button title="Quick Task" className="btn-ghost" style={{ padding: '2px 4px', color: 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); setTaskModalOpp({ oppId: opp.id, leadId: opp.lead ? opp.lead.id : null }) }}><ListTodo size={14} /></button>
                                                                    <button title="Mark Won" className="btn-ghost" style={{ padding: '2px 4px', color: '#10b981' }} onClick={(e) => { e.stopPropagation(); updateStage(opp.id, 'Closed Won', opp.title) }}><CheckCircle2 size={14} /></button>
                                                                </>
                                                            )}
                                                            <button title="Delete" className="btn-ghost" style={{ padding: '2px 4px', fontSize: 11, color: 'var(--text-muted)' }} onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(opp.id) }}>✕</button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Link href={`/opportunities/${opp.id}`} className="kanban-card-title" style={{ textDecoration: 'none', display: 'block' }}>
                                                            {opp.title}
                                                        </Link>
                                                        <div className="kanban-card-company">{opp.company || opp.lead?.company || '—'}</div>
                                                    </div>
                                                    <div className="kanban-card-footer" style={{ marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                                                        {opp.owner ? (
                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>
                                                                    {opp.owner.name[0].toUpperCase()}
                                                                </div>
                                                                {opp.owner.name}
                                                            </div>
                                                        ) : <div />}

                                                        {opp.closeDate && (
                                                            <div className="kanban-card-date">
                                                                <Calendar size={11} />
                                                                {format(parseISO(opp.closeDate), 'MMM dd')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}


                {taskModalOpp && <QuickTaskModal oppId={taskModalOpp.oppId} leadId={taskModalOpp.leadId} onClose={() => setTaskModalOpp(null)} onCreated={() => { setTaskModalOpp(null); mutateOpps() }} />}
                {deleteConfirmId && (
                    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
                        <div className="modal" style={{ maxWidth: 400 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Delete Opportunity</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                                Are you sure you want to delete this opportunity? This action cannot be undone. Any associated lead will automatically be marked as &apos;Lost&apos;.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                                <button className="btn-primary" style={{ background: '#ef4444', color: 'white' }} onClick={executeDelete}>Delete Opportunity</button>
                            </div>
                        </div>
                    </div>
                )}
                {stageConfirm && (
                    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setStageConfirm(null)}>
                        <div className="modal" style={{ maxWidth: 440, padding: 32 }}>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ width: 64, height: 64, background: stageConfirm.newStage === 'Closed Won' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: stageConfirm.newStage === 'Closed Won' ? '#10b981' : '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                                    Mark as {stageConfirm.newStage === 'Closed Won' ? 'Won' : 'Lost'}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                    Are you sure you want to mark <strong style={{ color: 'var(--text-primary)' }}>{stageConfirm.oppTitle}</strong> as {stageConfirm.newStage === 'Closed Won' ? 'Won' : 'Lost'}?
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button className="btn-secondary" onClick={() => setStageConfirm(null)} style={{ flex: 1, padding: '12px 0' }}>Cancel</button>
                                <button className="btn-primary" onClick={() => executeStageUpdate(stageConfirm.id, stageConfirm.newStage)} disabled={stageUpdating} style={{ flex: 1, padding: '12px 0', background: stageConfirm.newStage === 'Closed Won' ? '#10b981' : '#ef4444', borderColor: stageConfirm.newStage === 'Closed Won' ? '#10b981' : '#ef4444' }}>
                                    {stageUpdating ? 'Saving...' : `Yes, Mark as ${stageConfirm.newStage === 'Closed Won' ? 'Won' : 'Lost'}`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }
