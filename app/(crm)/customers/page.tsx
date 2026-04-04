'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Search, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import NotificationCenter from '@/components/NotificationCenter'
import EditLeadModal from '@/components/EditLeadModal'
import useSWR from 'swr'

interface Lead {
    id: string; name: string; company: string | null; email: string | null; phone: string | null
    website: string | null; status: string; createdAt: string
    industry: string | null; priority: string | null
    owner: { name: string } | null
}

function StatusBadge({ status }: { status: string }) {
    const cls = status.toLowerCase().replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '-')
    return <span className={`badge badge-${cls}`}>{status}</span>
}

function Avatar({ name }: { name: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
    const bg = colors[name.charCodeAt(0) % colors.length]
    return <div className="avatar" style={{ background: bg, color: 'white', fontSize: 11, width: 30, height: 30 }}>{initials}</div>
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function CustomersPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [deleting, setDeleting] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [editLeadId, setEditLeadId] = useState<string | null>(null)

    const params = new URLSearchParams({ page: String(page), limit: '10', status: 'Converted,Active Client' })
    if (search) params.set('search', search)

    const { data, mutate } = useSWR(`/api/leads?${params}`, fetcher, { keepPreviousData: true })

    const leads: Lead[] = data?.leads || []
    const total: number = data?.total || 0
    const totalPages: number = data?.totalPages || 1
    const loading = !data

    async function executeDelete() {
        if (!deleteConfirmId) return
        setDeleting(deleteConfirmId)
        const idToDelete = deleteConfirmId
        setDeleteConfirmId(null)
        await fetch(`/api/leads/${idToDelete}`, { method: 'DELETE' })
        mutate()
        setDeleting(null)
    }

    const pageNums = totalPages <= 5
        ? Array.from({ length: totalPages }, (_, i) => i + 1)
        : Array.from({ length: 5 }, (_, i) => Math.max(1, Math.min(page - 2, totalPages - 4)) + i)

    return (
        <>
            <div className="crm-content" style={{ paddingTop: 16 }}>
                <div className="page-header" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <h2 style={{ marginBottom: 0 }}>Customer Portfolio</h2>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} clients</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: 400, height: 32 }}>
                        <Search size={14} color="var(--text-muted)" />
                        <input
                            placeholder="Find customers..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            style={{ fontSize: 13 }}
                        />
                    </div>
                    <NotificationCenter />
                </div>

                <div className="card" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ height: 38 }}>
                                <th style={{ padding: '0 16px' }}>Company / Contact</th>
                                <th style={{ padding: '0 16px' }}>Website / Email</th>
                                <th style={{ padding: '0 16px' }}>Phone</th>
                                <th style={{ padding: '0 16px' }}>Industry</th>
                                <th style={{ padding: '0 16px' }}>Priority</th>
                                <th style={{ padding: '0 16px' }}>Status</th>
                                <th style={{ padding: '0 16px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No customers found</td></tr>
                            ) : leads.map(lead => (
                                <tr key={lead.id} style={{ height: 48 }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Avatar name={lead.company || lead.name} />
                                            <div>
                                                <Link href={`/leads/${lead.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 13 }}>{lead.company || lead.name}</Link>
                                                {lead.name && lead.name !== lead.company && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.name}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{lead.website || '—'}</div>
                                        {lead.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.email}</div>}
                                    </td>
                                    <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{lead.phone || '—'}</td>
                                    <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>{lead.industry || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                        {lead.priority ? (
                                            <span style={{
                                                fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                                background: lead.priority === 'High' ? 'rgba(239,68,68,0.1)' : lead.priority === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                color: lead.priority === 'High' ? '#ef4444' : lead.priority === 'Medium' ? '#f59e0b' : '#10b981',
                                                border: `1px solid ${lead.priority === 'High' ? 'rgba(239,68,68,0.2)' : lead.priority === 'Medium' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`
                                            }}>{lead.priority}</span>
                                        ) : '—'}
                                    </td>
                                    <td><StatusBadge status={lead.status} /></td>
                                    <td style={{ padding: '8px 16px' }}>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => setEditLeadId(lead.id)}>
                                                <Pencil size={13} />
                                            </button>
                                            <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => setDeleteConfirmId(lead.id)} disabled={deleting === lead.id}>
                                                {deleting === lead.id ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <Trash2 size={13} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {total === 0
                                ? 'No customers found'
                                : <>Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> customers</>
                            }
                        </span>
                        <div className="pagination">
                            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <ChevronLeft size={14} />
                            </button>
                            {pageNums[0] > 1 && <>
                                <button className="page-btn" onClick={() => setPage(1)}>1</button>
                                {pageNums[0] > 2 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                            </>}
                            {pageNums.map(n => (
                                <button key={n} className={`page-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                            ))}
                            {pageNums[pageNums.length - 1] < totalPages && <>
                                {pageNums[pageNums.length - 1] < totalPages - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                                <button className={`page-btn ${totalPages === page ? 'active' : ''}`} onClick={() => setPage(totalPages)}>{totalPages}</button>
                            </>}
                            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {editLeadId && (
                <EditLeadModal
                    id={editLeadId}
                    onClose={() => setEditLeadId(null)}
                    onSuccess={() => { setEditLeadId(null); mutate() }}
                />
            )}

            {deleteConfirmId && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Trash2 size={32} />
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Delete Customer</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                Are you sure you want to delete this customer? This action cannot be undone and will permanently remove all associated tasks, timelines, and files.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px 0' }}>Cancel</button>
                            <button className="btn-primary" onClick={executeDelete} style={{ flex: 1, padding: '12px 0', background: '#ef4444', borderColor: '#ef4444' }}>
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
