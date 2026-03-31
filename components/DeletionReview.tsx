'use client'
import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface DeletedLead {
    id: string
    type: 'Lead' | 'Opportunity'
    name: string
    company: string | null
    deletedAt: string
    deletedBy: string | null
    status: string
}

export default function DeletionReview() {
    const [loading, setLoading] = useState(true)
    const [deletedLeads, setDeletedLeads] = useState<DeletedLead[]>([])
    const [processingId, setProcessingId] = useState<string | null>(null)

    const fetchDeletions = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/deletions')
        if (res.ok) {
            const d = await res.json()
            setDeletedLeads(d.leads)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchDeletions()
    }, [fetchDeletions])

    const handleRestore = async (id: string) => {
        setProcessingId(id)
        const res = await fetch(`/api/admin/deletions/${id}`, { method: 'PUT' })
        if (res.ok) fetchDeletions()
        setProcessingId(null)
    }

    const handlePermanentDelete = async (id: string) => {
        if (!confirm('This action cannot be undone. Purge this data permanently?')) return
        setProcessingId(id)
        const res = await fetch(`/api/admin/deletions/${id}`, { method: 'DELETE' })
        if (res.ok) fetchDeletions()
        setProcessingId(null)
    }

    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.1), transparent)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                    <AlertTriangle size={18} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '1px' }}>Critical Action Queue</h3>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Awaiting terminal data purge authorization</div>
                </div>
                <div style={{ marginLeft: 'auto', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '4px 12px', borderRadius: 8, fontSize: 10, fontWeight: 900, letterSpacing: '0.5px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                    {deletedLeads.length} PENDING REVIEW
                </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                        <tr style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <th style={{ padding: '12px 20px', fontWeight: 800, width: 320 }}>Entity Identity</th>
                            <th style={{ padding: '12px 20px', fontWeight: 800, width: 120 }}>Type</th>
                            <th style={{ padding: '12px 20px', fontWeight: 800, width: 180 }}>Associated Org</th>
                            <th style={{ padding: '12px 20px', fontWeight: 800, width: 180 }}>Termination Log</th>
                            <th style={{ padding: '12px 20px', fontWeight: 800 }}>Strategic Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                        ) : deletedLeads.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 80, color: '#475569', fontSize: 12, fontWeight: 700 }}>SYSTEM NOMINAL • DELETION QUEUE CLEAR</td></tr>
                        ) : (
                            deletedLeads.map((lead) => (
                                <tr key={lead.id} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s', background: 'transparent' }}>
                                    <td style={{ padding: '8px 20px', verticalAlign: 'middle', width: 320 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #451a1a, #1a0505)', border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#f43f5e', flexShrink: 0 }}>{(lead.company || 'L')[0].toUpperCase()}</div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: 12, color: '#f8fafc' }}>{lead.name}</div>
                                                <div style={{ fontSize: 9, color: '#f43f5e', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>Queued for Deprecation</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px 20px', verticalAlign: 'middle', width: 120 }}>
                                        <div style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 900, display: 'inline-block', background: lead.type === 'Lead' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(168, 85, 247, 0.1)', color: lead.type === 'Lead' ? '#38bdf8' : '#a855f7', border: `1px solid ${lead.type === 'Lead' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`, textTransform: 'uppercase' }}>
                                            {lead.type}
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px 20px', verticalAlign: 'middle', width: 180 }}>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)' }}>{lead.company || '—'}</div>
                                    </td>
                                    <td style={{ padding: '8px 20px', verticalAlign: 'middle', width: 180 }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9' }}>{format(parseISO(lead.deletedAt), 'MMM dd, HH:mm')}</div>
                                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>ID: <span style={{ color: '#94a3b8' }}>{lead.id.substring(0, 8)}...</span></div>
                                    </td>
                                    <td style={{ padding: '8px 20px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => handleRestore(lead.id)}
                                                disabled={processingId === lead.id}
                                                style={{ padding: '4px 12px', fontSize: 10, borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, cursor: processingId === lead.id ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                                            >
                                                <RotateCcw size={11} strokeWidth={2.5} /> Restore
                                            </button>
                                            <button
                                                onClick={() => handlePermanentDelete(lead.id)}
                                                disabled={processingId === lead.id}
                                                style={{ padding: '4px 12px', fontSize: 10, borderRadius: 6, background: '#f43f5e', border: 'none', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, cursor: processingId === lead.id ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(244, 63, 94, 0.1)' }}
                                            >
                                                <Trash2 size={11} strokeWidth={2.5} /> Purge
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
