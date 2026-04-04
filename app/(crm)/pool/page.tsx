'use client'
import { useState, useDeferredValue } from 'react'
import { Search, ChevronLeft, ChevronRight, Hand, Waves, Clock } from 'lucide-react'
import NotificationCenter from '@/components/NotificationCenter'
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
    website: string | null
    industry: string | null
    status: string
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
    const [searchInput, setSearchInput] = useState('')
    const search = useDeferredValue(searchInput)
    const [statusFilter, setStatusFilter] = useState('')
    const [claiming, setClaiming] = useState<string | null>(null)
    const [isScrolled, setIsScrolled] = useState(false)

    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)

    const { data, mutate: fetchPool } = useSWR(`/api/pool?${params}`, fetcher, { keepPreviousData: true })
    const { data: settingsData } = useSWR('/api/admin/settings?category=LEAD_STATUS', fetcher)

    const leads: Lead[] = data?.leads || []
    const total: number = data?.total || 0
    const totalPages: number = data?.totalPages || 1
    const loading = !data

    const statusOptions: string[] = settingsData?.options?.map((o: { value: string }) => o.value) || []

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

    // Sliding window pagination centred on current page
    const pageNums = (() => {
        if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
        const start = Math.max(1, Math.min(page - 2, totalPages - 4))
        return Array.from({ length: 5 }, (_, i) => start + i)
    })()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="crm-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', paddingTop: 16 }}>
                <div className="page-header" style={{
                    marginBottom: isScrolled ? 0 : 12,
                    maxHeight: isScrolled ? 0 : 60,
                    opacity: isScrolled ? 0 : 1,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease-in-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
                            <Waves size={20} color="var(--accent-primary)" /> Open Lead Pool
                        </h2>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} leads available</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: 400, height: 32 }}>
                        <Search size={14} color="var(--text-muted)" />
                        <input
                            placeholder="Search pool..."
                            value={searchInput}
                            onChange={e => { setSearchInput(e.target.value); setPage(1) }}
                            style={{ fontSize: 13 }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                        style={{ width: 140, height: 32, fontSize: 12, padding: '0 8px' }}
                    >
                        <option value="">All Statuses</option>
                        {statusOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <NotificationCenter />

                    {isScrolled && (
                        <div style={{ fontSize: 11, fontWeight: 700, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                            <Waves size={12} /> {total} Left
                        </div>
                    )}
                </div>

                <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        display: 'flex', background: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border)',
                        padding: '10px 18px', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', height: 40, alignItems: 'center'
                    }}>
                        <div style={{ width: '25%' }}>Name & Company</div>
                        <div style={{ width: '25%' }}>Website & Email</div>
                        <div style={{ width: '15%' }}>Industry</div>
                        <div style={{ width: '15%' }}>Last Activity</div>
                        <div style={{ width: '10%' }}>Status</div>
                        <div style={{ width: '10%', textAlign: 'right' }}>Actions</div>
                    </div>

                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        {loading ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner" />
                            </div>
                        ) : leads.length === 0 ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                The pool is empty right now.
                            </div>
                        ) : (
                            <AutoSizer renderProp={({ height, width }: any) => (
                                <List
                                    rowCount={leads.length}
                                    rowHeight={56}
                                    onScroll={(e: any) => setIsScrolled(e.currentTarget.scrollTop > 50)}
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
                                                    <div style={{ flexShrink: 0, scale: '0.85', transformOrigin: 'left center' }}>
                                                        <Avatar name={lead.company || lead.name} />
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company || lead.name}</div>
                                                        {lead.name && lead.name !== lead.company && <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>}
                                                    </div>
                                                </div>
                                                <div style={{ width: '25%', paddingRight: 10 }}>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.website || '—'}</div>
                                                    {lead.email && <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</div>}
                                                </div>
                                                <div style={{ width: '15%', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}>
                                                    {lead.industry || '—'}
                                                </div>
                                                <div style={{ width: '15%', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Clock size={11} color="var(--text-muted)" /> {formatDistanceToNow(new Date(lead.lastActivityAt))}
                                                </div>
                                                <div style={{ width: '10%', scale: '0.9', transformOrigin: 'left center' }}>
                                                    <StatusBadge status={lead.status} />
                                                </div>
                                                <div style={{ width: '10%', textAlign: 'right' }}>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '4px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
                                                        onClick={() => handleClaim(lead.id)}
                                                        disabled={claiming !== null}
                                                    >
                                                        {claiming === lead.id ? <div className="spinner" style={{ width: 12, height: 12, borderColor: '#fff', borderTopColor: 'transparent' }} /> : <Hand size={12} />}
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
                            {total === 0
                                ? 'No leads available'
                                : <>Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> open leads</>
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
        </div>
    )
}
