'use client'
import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface DeletedLead {
    id: string
    name: string
    company: string | null
    deletedAt: string
    deletedBy: { name: string } | null
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
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid border', display: 'flex', alignItems: 'center', gap: 12, background: '#fef2f2', borderBottomColor: '#fecaca' }}>
                <AlertTriangle size={18} color="#ef4444" />
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#991b1b' }}>Critical Action Queue</h3>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginLeft: 'auto' }}>{deletedLeads.length} PENDING REVIEW</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#fafafa', borderBottom: '1px solid var(--border)' }}>
                    <tr style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '16px 24px', fontWeight: 600 }}>Entity Name</th>
                        <th style={{ padding: '16px 24px', fontWeight: 600 }}>Organization</th>
                        <th style={{ padding: '16px 24px', fontWeight: 600 }}>Termination Details</th>
                        <th style={{ padding: '16px 24px', fontWeight: 600 }}>Action Taken</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                    ) : deletedLeads.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Deletion queue is empty.</td></tr>
                    ) : (
                        deletedLeads.map((lead, idx) => (
                            <tr key={lead.id} style={{ borderBottom: idx === deletedLeads.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{lead.name}</div>
                                    <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 500, marginTop: 4 }}>Queued for Deprecation</div>
                                </td>
                                <td style={{ padding: '16px 24px', fontWeight: 500, fontSize: 14, color: 'var(--text-secondary)' }}>
                                    {lead.company || '—'}
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{format(parseISO(lead.deletedAt), 'MMM dd, HH:mm')}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Operator: {lead.deletedBy?.name || 'System Action'}</div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            onClick={() => handleRestore(lead.id)}
                                            disabled={processingId === lead.id}
                                            style={{ padding: '6px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', background: 'transparent', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: processingId === lead.id ? 'not-allowed' : 'pointer' }}
                                        >
                                            <RotateCcw size={14} /> Restore
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(lead.id)}
                                            disabled={processingId === lead.id}
                                            style={{ padding: '6px 12px', fontSize: 13, borderRadius: 6, background: '#ef4444', border: 'none', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: processingId === lead.id ? 'not-allowed' : 'pointer' }}
                                        >
                                            <Trash2 size={14} /> Purge
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
