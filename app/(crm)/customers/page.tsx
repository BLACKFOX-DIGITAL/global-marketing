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
    const bg = 'linear-gradient(135deg, #6366f1, #8b5cf6)'
    return <div className="avatar" style={{ background: bg, color: 'white', fontSize: 13, fontWeight: 700, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }}>{initials}</div>
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
                <div className="page-header" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 0, letterSpacing: '-0.5px' }}>Customer Portfolio</h2>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} clients</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: 400, height: 42, borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            placeholder="Find customers by name or company..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            style={{ fontSize: 13, fontWeight: 500 }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <NotificationCenter />
                    </div>
                </div>

                <div className="card" style={{ padding: 0, borderRadius: 24, background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ height: 44, background: 'var(--bg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <th style={{ padding: '0 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Company / Contact</th>
                                <th style={{ padding: '0 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Website / Email</th>
                                <th style={{ padding: '0 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Phone</th>
                                <th style={{ padding: '0 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Industry</th>
                                <th style={{ padding: '0 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Priority</th>
                                <th style={{ padding: '0 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Status</th>
                                <th style={{ padding: '0 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No customers found</td></tr>
                            ) : leads.map(lead => (
                                <tr key={lead.id} style={{ height: 60, borderBottom: '1px solid var(--border)', transition: 'background 0.2s', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '0 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <Avatar name={lead.company || lead.name} />
                                            <div>
                                                <Link href={`/leads/${lead.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14 }}>{lead.company || lead.name}</Link>
                                                {lead.name && lead.name !== lead.company && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{lead.name}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0 20px' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{lead.website || '—'}</div>
                                        {lead.email && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{lead.email}</div>}
                                    </td>
                                    <td style={{ padding: '0 20px', color: 'var(--text-secondary)', fontSize: 13 }}>{lead.phone || '—'}</td>
                                    <td style={{ padding: '0 20px', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{lead.industry || '—'}</td>
                                    <td style={{ padding: '0 20px', color: 'var(--text-secondary)', fontSize: 13 }}>
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
                                Are you sure you want to delete this customer? This will remove them from your list and send them to admin review.
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
