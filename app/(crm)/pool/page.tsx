'use client'
import { useState } from 'react'
import Header from '@/components/Header'
import { Search, ChevronLeft, ChevronRight, Hand, Waves, MapPin, AtSign, Clock } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { List } from 'react-window'
import { AutoSizer } from 'react-virtualized-auto-sizer'
import useSWR, { useSWRConfig } from 'swr'

interface Lead {
    id: string
    name: string
    company: string | null
    email: string | null
    phone: string | null
    status: string
    industry: string | null
    website: string | null
    lastActivityAt: string
}

function Avatar({ name }: { name: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
    const bg = colors[name.charCodeAt(0) % colors.length]
    return <div className="avatar" style={{ background: bg, color: 'white', fontSize: 11, width: 30, height: 30 }}>{initials}</div>
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function PoolPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [claiming, setClaiming] = useState<string | null>(null)

    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)

    const { data, mutate: fetchPool } = useSWR(`/api/pool?${params}`, fetcher, { keepPreviousData: true })

    const leads: Lead[] = data?.leads || []
    const total: number = data?.total || 0
    const totalPages: number = data?.totalPages || 1
    const loading = !data

    const { mutate } = useSWRConfig()
    
    async function handleClaim(id: string) {
        setClaiming(id)
        const res = await fetch(`/api/leads/${id}/claim`, { method: 'POST' })

        if (res.ok) {
            fetchPool()
            mutate('/api/dashboard/stats')
            mutate((key: any) => typeof key === 'string' && key.startsWith('/api/leads'))
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
            <div className="crm-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <div className="page-header">
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Waves size={24} color="var(--accent-primary)" /> Open Lead Pool
                        </h2>
                        <p>Browse unassigned, newly imported, scaled, and recirculated leads ready for claiming.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: 480 }}>
                        <Search size={15} color="var(--text-muted)" />
                        <input
                            placeholder="Find leads in the pool..."
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

                <div className="card" style={{ padding: 0, height: 'calc(100vh - 350px)', minHeight: 400, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ 
                        display: 'flex', background: 'var(--bg-card)', 
                        borderBottom: '1px solid var(--border)', 
                        padding: '12px 18px', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', height: 44, alignItems: 'center'
                    }}>
                        <div style={{ width: '25%' }}>Name & Company</div>
                        <div style={{ width: '25%' }}>Website & Email</div>
                        <div style={{ width: '15%' }}>Industry</div>
                        <div style={{ width: '15%' }}>Idle Time</div>
                        <div style={{ width: '10%' }}>Last Status</div>
                        <div style={{ width: '10%', textAlign: 'right' }}>Actions</div>
                    </div>

                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        {loading ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner" />
                            </div>
                        ) : leads.length === 0 ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                No leads available in the pool right now.
                            </div>
                        ) : (
                            <AutoSizer renderProp={({ height, width }: any) => (
                                <List
                                    rowCount={leads.length}
                                    rowHeight={80} 
                                    style={{ height: height as any, width: width as any, overflowY: 'auto' as any }}
                                    rowProps={{}}
                                    rowComponent={({ index, style }: any) => {
                                        const lead = leads[index]
                                        return (
                                            <div style={{ 
                                                ...style, 
                                                display: 'flex', alignItems: 'center', 
                                                padding: '0 18px', borderBottom: '1px solid var(--border)',
                                                background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'
                                            }} className="lead-row-container">
                                                <div style={{ width: '25%', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Avatar name={lead.company || lead.name} />
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company || lead.name}</div>
                                                        {lead.name && lead.name !== lead.company && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>}
                                                    </div>
                                                </div>
                                                <div style={{ width: '25%', paddingRight: 10 }}>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.website || '—'}</div>
                                                    {lead.email && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</div>}
                                                </div>
                                                <div style={{ width: '15%', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>
                                                    {lead.industry || '—'}
                                                </div>
                                                <div style={{ width: '15%', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Clock size={12} color="var(--text-muted)" /> {formatDistanceToNow(new Date(lead.lastActivityAt))} ago
                                                </div>
                                                <div style={{ width: '10%' }}>
                                                    <StatusBadge status={lead.status} />
                                                </div>
                                                <div style={{ width: '10%', textAlign: 'right' }}>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '6px 16px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
                                                        onClick={() => handleClaim(lead.id)}
                                                        disabled={claiming === lead.id}
                                                    >
                                                        {claiming === lead.id ? <div className="spinner" style={{ width: 14, height: 14, borderColor: '#fff', borderTopColor: 'transparent' }} /> : <Hand size={14} />}
                                                        Claim
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    }}
                                />
                            )} />
                        )}
                    </div>

                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Showing {total > 0 ? ((page - 1) * 50) + 1 : 0}–{Math.min(page * 50, total)} of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> open leads
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
