'use client'
import { useState, useEffect, use, useCallback, useRef } from 'react'
import { Pencil, Building, Briefcase, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import ActivityTimeline from '@/components/ActivityTimeline'
import AttachmentList from '@/components/AttachmentList'
import Editor from '@/components/Editor'
import { Loader2, Check } from 'lucide-react'

interface Opportunity {
    id: string; title: string; company: string | null; closeDate: string | null;
    stage: string; probability: number | null; notes: string | null; createdAt: string; updatedAt: string
    owner: { name: string; email: string } | null
    lead: { name: string; company: string | null } | null
    activityLogs: Array<{ id: string, action: string, description: string, createdAt: string, user: { name: string } }>
    attachments: Array<{ id: string, name: string, fileUrl: string, fileSize: number, fileType: string | null, createdAt: string }>
}

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [opp, setOpp] = useState<Opportunity | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'timeline' | 'attachments' | 'notes'>('timeline')
    const [uploading, setUploading] = useState(false)
    const [stages, setStages] = useState<{ value: string, color: string | null }[]>([])
    const [stageConfirm, setStageConfirm] = useState<{ newStage: string } | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [savingNotes, setSavingNotes] = useState<'idle' | 'saving' | 'saved'>('idle')
    const initialNotesRef = useRef<string | null>(null)

    const fetchOppAndOptions = useCallback(async () => {
        setLoading(true)
        const safeFetch = async (url: string) => {
            try {
                const res = await fetch(url)
                if (!res.ok) return {}
                const text = await res.text()
                if (!text) return {}
                return JSON.parse(text)
            } catch (err) {
                console.error(`Fetch failed for ${url}:`, err)
                return {}
            }
        }

        const [oppData, stageData] = await Promise.all([
            safeFetch(`/api/opportunities/${id}`),
            safeFetch(`/api/admin/settings?category=OPPORTUNITY_STAGE`)
        ])

        if (oppData.id) setOpp(oppData)
        if (stageData.options) setStages(stageData.options)
        setLoading(false)
    }, [id])

    useEffect(() => {
        requestAnimationFrame(() => {
            fetchOppAndOptions()
        })
    }, [fetchOppAndOptions])

    useEffect(() => {
        if (!opp) return
        if (initialNotesRef.current === null) {
            initialNotesRef.current = opp.notes || ''
            return
        }

        const currentNotes = opp.notes || ''
        if (currentNotes !== initialNotesRef.current) {
            setSavingNotes('saving')
            const timer = setTimeout(async () => {
                try {
                    await fetch(`/api/opportunities/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: currentNotes })
                    })
                    initialNotesRef.current = currentNotes
                    setSavingNotes('saved')
                    setTimeout(() => setSavingNotes('idle'), 2000)
                } catch (e) {
                    console.error(e)
                    setSavingNotes('idle')
                }
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [opp?.notes, id, opp])

    const updateStage = async (newStage: string) => {
        if (!opp || opp.stage === newStage) return

        if (newStage === 'Closed Won' || newStage === 'Closed Lost') {
            setStageConfirm({ newStage })
        } else {
            await executeStageUpdate(newStage)
        }
    }

    const executeStageUpdate = async (newStage: string) => {
        if (!opp) return

        setOpp({ ...opp, stage: newStage })
        try {
            await fetch(`/api/opportunities/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage })
            })
            setStageConfirm(null)

            // 🎉 Big celebration for winning a deal!
            if (newStage === 'Closed Won') {
                const { celebrateBig } = await import('@/lib/confetti')
                celebrateBig()
            }

            fetchOppAndOptions()
        } catch (e) { console.error(e) }
    }

    const handleDeleteAttachment = async (attachId: string) => {
        setDeleteConfirmId(attachId)
    }

    const executeDeleteAttachment = async (attachId: string) => {
        await fetch(`/api/attachments?id=${attachId}`, { method: 'DELETE' })
        setDeleteConfirmId(null)
        fetchOppAndOptions()
    }

    // File upload requires a storage backend (e.g. S3/R2). Not yet implemented.
    const handleUpload = async (_name: string) => {
        alert('File upload is not yet configured. Please contact your administrator.')
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
    if (!opp) return <div style={{ padding: 40 }}><p style={{ color: 'var(--text-muted)' }}>Opportunity not found.</p></div>

    const displayTitle = opp.title || 'Untitled Opportunity'

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/opportunities" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Opportunities</Link>
                <span>›</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{opp.title}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--accent-glow)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                                    <Briefcase size={28} />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px 0' }}>{displayTitle}</h1>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
                                        <Building size={14} /> {opp.company || 'No company'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn-secondary" disabled title="Edit coming soon" style={{ opacity: 0.5, cursor: 'not-allowed' }}><Pencil size={14} /> Edit</button>
                                {opp.stage !== 'Closed Won' ? (
                                    <button onClick={() => updateStage('Closed Won')} className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>Won</button>
                                ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 16px', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 8, fontWeight: 700, fontSize: 13, border: '1px solid rgba(16,185,129,0.3)' }}>🎉 Won</span>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: 24, padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Probability</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{opp.probability || 0}%</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Exp. Close</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{opp.closeDate ? format(parseISO(opp.closeDate), 'MMM d, yyyy') : 'TBD'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 0, minHeight: 400 }}>
                        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 32, padding: '0 32px' }}>
                            <button onClick={() => setActiveTab('timeline')} className={`tab ${activeTab === 'timeline' ? 'active' : ''}`} style={{ padding: '16px 0', border: 'none', background: 'none', borderBottom: `2.5px solid ${activeTab === 'timeline' ? 'var(--accent-primary)' : 'transparent'}`, color: activeTab === 'timeline' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Timeline</button>
                            <button onClick={() => setActiveTab('attachments')} className={`tab ${activeTab === 'attachments' ? 'active' : ''}`} style={{ padding: '16px 0', border: 'none', background: 'none', borderBottom: `2.5px solid ${activeTab === 'attachments' ? 'var(--accent-primary)' : 'transparent'}`, color: activeTab === 'attachments' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Files</button>
                            <button onClick={() => setActiveTab('notes')} className={`tab ${activeTab === 'notes' ? 'active' : ''}`} style={{ padding: '16px 0', border: 'none', background: 'none', borderBottom: `2.5px solid ${activeTab === 'notes' ? 'var(--accent-primary)' : 'transparent'}`, color: activeTab === 'notes' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Notes</button>
                        </div>
                        <div style={{ padding: 24 }}>
                            {activeTab === 'timeline' && <ActivityTimeline activities={opp.activityLogs} />}
                            {activeTab === 'attachments' && <AttachmentList attachments={opp.attachments} onDelete={handleDeleteAttachment} onUpload={handleUpload} uploading={uploading} />}
                            {activeTab === 'notes' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', height: 16 }}>
                                        {savingNotes === 'saving' && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Loader2 size={10} className="spinner" /> Saving...</span>}
                                        {savingNotes === 'saved' && <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={10} /> Saved</span>}
                                    </div>
                                    <Editor 
                                        content={opp.notes || ''} 
                                        onUpdate={(html) => setOpp(o => o ? { ...o, notes: html } : null)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 16 }}>CURRENT STAGE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {stages.map(s => {
                                const isClosed = opp.stage === 'Closed Won' || opp.stage === 'Closed Lost'
                                const isCurrent = opp.stage === s.value
                                return (
                                    <button
                                        key={s.value}
                                        onClick={() => updateStage(s.value)}
                                        disabled={isClosed && !isCurrent}
                                        style={{
                                            padding: '10px 14px', borderRadius: 8, border: '1px solid', textAlign: 'left', fontSize: 13, fontWeight: 600,
                                            borderColor: isCurrent ? (s.color || 'var(--accent-primary)') : 'var(--border)',
                                            background: isCurrent ? `${s.color || 'var(--accent-primary)'}15` : 'transparent',
                                            color: isCurrent ? (s.color || 'var(--accent-primary)') : 'var(--text-secondary)',
                                            cursor: (isClosed && !isCurrent) ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            opacity: (isClosed && !isCurrent) ? 0.5 : 1
                                        }}>
                                        {s.value}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 20 }}>OPPORTUNITY OVERVIEW</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Owner</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{opp.owner?.name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{format(parseISO(opp.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                            {opp.lead && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Source Lead</span>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{opp.lead.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                                Are you sure you want to mark <strong style={{ color: 'var(--text-primary)' }}>{opp.title}</strong> as {stageConfirm.newStage === 'Closed Won' ? 'Won' : 'Lost'}?
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setStageConfirm(null)} style={{ flex: 1, padding: '12px 0' }}>Cancel</button>
                            <button className="btn-primary" onClick={() => executeStageUpdate(stageConfirm.newStage)} style={{ flex: 1, padding: '12px 0', background: stageConfirm.newStage === 'Closed Won' ? '#10b981' : '#ef4444', borderColor: stageConfirm.newStage === 'Closed Won' ? '#10b981' : '#ef4444' }}>
                                Yes, Mark as {stageConfirm.newStage === 'Closed Won' ? 'Won' : 'Lost'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmId && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
                    <div className="modal" style={{ maxWidth: 440, padding: 32 }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Loader2 size={32} />
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Delete Attachment</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                Are you sure you want to permanently delete this file? This action cannot be undone.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px 0' }}>Cancel</button>
                            <button className="btn-primary" onClick={() => executeDeleteAttachment(deleteConfirmId)} style={{ flex: 1, padding: '12px 0', background: '#ef4444', borderColor: '#ef4444' }}>
                                Yes, Delete File
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
