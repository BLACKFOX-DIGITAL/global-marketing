'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Plus, Search, Filter, Trash2, Pencil, ChevronLeft, ChevronRight, UserPlus, PhoneCall, Mail } from 'lucide-react'
import { } from 'date-fns'
import NotificationCenter from '@/components/NotificationCenter'
import NewLeadModal from '@/components/NewLeadModal'
import EditLeadModal from '@/components/EditLeadModal'

interface Lead {
    id: string; name: string; company: string | null; email: string | null; phone: string | null
    website: string | null; status: string; createdAt: string
    industry: string | null; priority: string | null
    owner: { name: string } | null
}



const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'half', label: 'Half Yearly' },
    { key: 'year', label: 'This Year' },
]

interface LeadStats {
    newLeads: number
    calledLeads: number
    mailSentLeads: number
}

function StatCard({ icon, label, value, color, periodLabel, onClick }: {
    icon: React.ReactNode, label: string, value: number, color: string, periodLabel: string, onClick: () => void
}) {
    return (
        <div
            onClick={onClick}
            style={{
                flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                userSelect: 'none', position: 'relative', overflow: 'hidden',
            }}
            onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 6px 20px ${color}20`
                e.currentTarget.style.borderColor = `${color}40`
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'var(--border)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    {icon}
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
                </div>
            </div>
            <div style={{ fontSize: 10, color, fontWeight: 600, background: `${color}15`, padding: '3px 8px', borderRadius: 6 }}>
                {periodLabel}
            </div>
        </div>
    )
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

export default function CustomersPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [editLeadId, setEditLeadId] = useState<string | null>(null)

    const fetchCustomers = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(page), limit: '10' })
        if (search) params.set('search', search)
        params.set('status', 'Converted,Active Client')

        const res = await fetch(`/api/leads?${params}`)
        if (res.ok) {
            const d = await res.json()
            setLeads(d.leads); setTotal(d.total); setTotalPages(d.totalPages)
        }
        setLoading(false)
    }, [page, search])

    useEffect(() => {
        requestAnimationFrame(() => {
            fetchCustomers()
        })
    }, [fetchCustomers])

    function handleDeleteAsk(id: string) {
        setDeleteConfirmId(id)
    }

    async function executeDelete() {
        if (!deleteConfirmId) return
        setDeleting(deleteConfirmId)
        const idToDelete = deleteConfirmId
        setDeleteConfirmId(null)
        await fetch(`/api/leads/${idToDelete}`, { method: 'DELETE' })
        fetchCustomers()
        setDeleting(null)
    }

    const pageNums = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1)

    return (
        <>
            <div className="crm-content" style={{ paddingTop: 16 }}>
                <div className="page-header">
                    <div>
                        <h2>Customers</h2>
                        <p>Manage and track all of your converted clients and active customers.</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: 480 }}>
                        <Search size={15} color="var(--text-muted)" />
                        <input
                            placeholder="Search customers by name, email or company..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                        />
                    </div>
                    <NotificationCenter />
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name & Company</th>
                                <th>Website & Email</th>
                                <th>Phone</th>
                                <th>Industry</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No customers found</td></tr>
                            ) : leads.map(lead => (
                                <tr key={lead.id}>
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
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{lead.phone || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>{lead.industry || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                        {lead.priority ? (
                                            <span style={{
                                                fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                                background: lead.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : lead.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: lead.priority === 'High' ? '#ef4444' : lead.priority === 'Medium' ? '#f59e0b' : '#10b981',
                                                border: `1px solid ${lead.priority === 'High' ? 'rgba(239, 68, 68, 0.2)' : lead.priority === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                            }}>{lead.priority}</span>
                                        ) : '—'}
                                    </td>
                                    <td><StatusBadge status={lead.status} /></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn-ghost" style={{ padding: '5px 8px' }} onClick={() => setEditLeadId(lead.id)}>
                                                <Pencil size={13} />
                                            </button>
                                            <button className="btn-ghost" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={() => handleDeleteAsk(lead.id)} disabled={deleting === lead.id}>
                                                {deleting === lead.id ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <Trash2 size={13} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> leads
                        </span>
                        <div className="pagination">
                            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <ChevronLeft size={14} />
                            </button>
                            {pageNums.map(n => (
                                <button key={n} className={`page-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                            ))}
                            {totalPages > 5 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>...</span>}
                            {totalPages > 5 && <button className={`page-btn ${totalPages === page ? 'active' : ''}`} onClick={() => setPage(totalPages)}>{totalPages}</button>}
                            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {editLeadId && <EditLeadModal
                id={editLeadId}
                onClose={() => setEditLeadId(null)}
                onSuccess={() => {
                    setEditLeadId(null)
                    fetchCustomers()
                }}
            />}

            {deleteConfirmId && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
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
                                Yes, Delete Customer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
