'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { Search, ChevronLeft, ChevronRight, Hand, Waves } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { format, formatDistanceToNow } from 'date-fns'

interface Lead {
    id: string
    name: string
    company: string | null
    email: string | null
    phone: string | null
    status: string
    country: string | null
    lastActivityAt: string
}

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function PoolPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [claiming, setClaiming] = useState<string | null>(null)

    const params = new URLSearchParams({ page: String(page), limit: '10' })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)

    const { data, mutate: fetchPool } = useSWR(`/api/pool?${params}`, fetcher, { keepPreviousData: true })

    const leads: Lead[] = data?.leads || []
    const total: number = data?.total || 0
    const totalPages: number = data?.totalPages || 1
    const loading = !data

    async function handleClaim(id: string) {
        setClaiming(id)
        const res = await fetch(`/api/leads/${id}/claim`, { method: 'POST' })

        if (res.ok) {
            fetchPool()
            // Optional: You could redirect to the lead page immediately, or just let them stay on the pool page
        } else {
            const err = await res.json()
            alert(err.error || 'Failed to claim lead')
        }
        setClaiming(null)
    }

    const pageNums = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <Header title="Open Pool" user={null} />
            <div className="crm-content">
                <div className="page-header">
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Waves size={24} color="var(--accent-primary)" /> Open Lead Pool
                        </h2>
                        <p>Browse unassigned, newly imported, scaled, and recirculated leads ready for claiming.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
                        <Search size={15} color="var(--text-muted)" />
                        <input
                            placeholder="Search pool..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                        style={{ width: 160 }}
                    >
                        <option value="">All Statuses</option>
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Unqualified">Unqualified</option>
                        <option value="Follow-up">Follow-up</option>
                    </select>
                </div>

                <div className="card" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name & Company</th>
                                <th>Contact Info</th>
                                <th>Location</th>
                                <th>Idle Time</th>
                                <th>Last Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                                        <div className="spinner" style={{ margin: '0 auto' }} />
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                        No leads available in the pool right now.
                                    </td>
                                </tr>
                            ) : leads.map(lead => (
                                <tr key={lead.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{lead.name}</div>
                                        {lead.company && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{lead.company}</div>}
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {lead.email && <div>{lead.email}</div>}
                                        {lead.phone && <div style={{ marginTop: 2 }}>{lead.phone}</div>}
                                        {!lead.email && !lead.phone && '—'}
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lead.country || '—'}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {formatDistanceToNow(new Date(lead.lastActivityAt))} ago
                                    </td>
                                    <td><StatusBadge status={lead.status} /></td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="btn-primary"
                                            style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                            onClick={() => handleClaim(lead.id)}
                                            disabled={claiming === lead.id}
                                        >
                                            {claiming === lead.id ? <div className="spinner" style={{ width: 14, height: 14, borderColor: '#fff', borderTopColor: 'transparent' }} /> : <Hand size={14} />}
                                            Claim
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Showing {total > 0 ? ((page - 1) * 10) + 1 : 0}–{Math.min(page * 10, total)} of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> open leads
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
        </div>
    )
}
