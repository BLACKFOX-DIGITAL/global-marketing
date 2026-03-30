'use client'
import { useState, useDeferredValue } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Plus, Search, Filter, Trash2, Pencil, ChevronLeft, ChevronRight, UserPlus, PhoneCall, Mail, BookOpen } from 'lucide-react'
import { List } from 'react-window'
import { AutoSizer } from 'react-virtualized-auto-sizer'
import useSWR from 'swr'

// Lazy-load heavy modals — saves ~82 KB from the initial bundle
const NewLeadModal = dynamic<any>(() => import('@/components/NewLeadModal'), { ssr: false })
const EditLeadModal = dynamic<any>(() => import('@/components/EditLeadModal'), { ssr: false })

interface Lead {
    id: string; name: string; company: string | null; email: string | null; phone: string | null
    website: string | null; status: string; createdAt: string
    industry: string | null; priority: string | null
    owner: { name: string } | null;
    lastCallOutcome: string | null;
    lastMailOutcome: string | null;
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

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function LeadsPage() {
    const [page, setPage] = useState(1)
    const [searchInput, setSearchInput] = useState('')
    const search = useDeferredValue(searchInput)
    const [status, setStatus] = useState('')
    const [deleting, setDeleting] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editLeadId, setEditLeadId] = useState<string | null>(null)
    const [periodIndex, setPeriodIndex] = useState(0)

    const currentPeriod = PERIODS[periodIndex]

    const cyclePeriod = () => {
        setPeriodIndex(i => (i + 1) % PERIODS.length)
    }

    const { data: settingsData } = useSWR(`/api/admin/settings?category=LEAD_STATUS`, fetcher, { keepPreviousData: true })
    const { data: statsData } = useSWR(`/api/leads/stats?period=${currentPeriod.key}`, fetcher, { keepPreviousData: true })
    
    let searchString = `?page=${page}&limit=50`
    if (search) searchString += `&search=${encodeURIComponent(search)}`
    if (status) searchString += `&status=${encodeURIComponent(status)}`
    else searchString += `&exclude=Converted,Active%20Client`
    
    const { data: leadsData, mutate: fetchLeads } = useSWR(`/api/leads${searchString}`, fetcher, { keepPreviousData: true })

    const statusOptions = settingsData?.options ? [''].concat(settingsData.options.map((o: { value: string }) => o.value)) : ['']
    const stats: LeadStats = statsData || { newLeads: 0, calledLeads: 0, mailSentLeads: 0 }
    
    const leads: Lead[] = leadsData?.leads || []
    const total: number = leadsData?.total || 0
    const totalPages: number = leadsData?.totalPages || 1
    
    const loading = !leadsData || !statsData

    function handleDeleteAsk(id: string) {
        setDeleteConfirmId(id)
    }

    async function executeDelete() {
        if (!deleteConfirmId) return
        setDeleting(deleteConfirmId)
        const idToDelete = deleteConfirmId
        setDeleteConfirmId(null)
        await fetch(`/api/leads/${idToDelete}`, { method: 'DELETE' })
        fetchLeads()
        setDeleting(null)
    }

    const pageNums = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <Header title="Leads Management" user={null} />
            <div className="crm-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <div className="page-header">
                    <div>
                        <h2>Leads</h2>
                        <p>Manage and track your incoming prospects and pipeline conversion.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Link href="/leads/guide" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookOpen size={16} /> Guide
                        </Link>
                        <button onClick={() => setShowAddModal(true)} className="btn-primary">
                            <Plus size={16} /> New Lead
                        </button>
                    </div>
                </div>

                {/* Stats Dashboard */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    <StatCard
                        icon={<UserPlus size={22} color="#6366f1" />}
                        label="New Leads"
                        value={stats.newLeads}
                        color="#6366f1"
                        periodLabel={currentPeriod.label}
                        onClick={cyclePeriod}
                    />
                    <StatCard
                        icon={<PhoneCall size={22} color="#f59e0b" />}
                        label="Call"
                        value={stats.calledLeads}
                        color="#f59e0b"
                        periodLabel={currentPeriod.label}
                        onClick={cyclePeriod}
                    />
                    <StatCard
                        icon={<Mail size={22} color="#10b981" />}
                        label="Mail"
                        value={stats.mailSentLeads}
                        color="#10b981"
                        periodLabel={currentPeriod.label}
                        onClick={cyclePeriod}
                    />
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: 480 }}>
                        <Search size={15} color="var(--text-muted)" />
                        <input
                            placeholder="Search leads by name, email or company..."
                            value={searchInput}
                            onChange={e => { setSearchInput(e.target.value); setPage(1) }}
                        />
                    </div>
                    <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} style={{ width: 140 }}>
                        {statusOptions.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
                    </select>
                    <button className="btn-ghost"><Filter size={15} /></button>
                </div>

                <div className="card" style={{ padding: 0, height: 'calc(100vh - 425px)', minHeight: 400, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ 
                        display: 'flex', background: 'var(--bg-card)', 
                        borderBottom: '1px solid var(--border)', 
                        padding: '12px 18px', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', height: 44, alignItems: 'center'
                    }}>
                        <div style={{ width: '20%' }}>Name & Company</div>
                        <div style={{ width: '18%' }}>Website & Email</div>
                        <div style={{ width: '10%' }}>Industry</div>
                        <div style={{ width: '8%' }}>Priority</div>
                        <div style={{ width: '14%' }}>Call Activity</div>
                        <div style={{ width: '14%' }}>Mail Activity</div>
                        <div style={{ width: '8%' }}>Status</div>
                        <div style={{ width: '8%', textAlign: 'right' }}>Actions</div>
                    </div>

                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        {loading ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner" />
                            </div>
                        ) : leads.length === 0 ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                No leads found
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
                                                <div style={{ width: '20%', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Avatar name={lead.company || lead.name} />
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <Link href={`/leads/${lead.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company || lead.name}</Link>
                                                        {lead.name && lead.name !== lead.company && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>}
                                                    </div>
                                                </div>
                                                <div style={{ width: '18%', paddingRight: 10 }}>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.website || '—'}</div>
                                                    {lead.email && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</div>}
                                                </div>
                                                <div style={{ width: '10%', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>{lead.industry || '—'}</div>
                                                <div style={{ width: '8%' }}>
                                                    {lead.priority ? (
                                                        <span style={{
                                                            fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                                            background: lead.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : lead.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: lead.priority === 'High' ? '#ef4444' : lead.priority === 'Medium' ? '#f59e0b' : '#10b981',
                                                            border: `1px solid ${lead.priority === 'High' ? 'rgba(239, 68, 68, 0.2)' : lead.priority === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                                        }}>{lead.priority}</span>
                                                    ) : '—'}
                                                </div>
                                                <div style={{ width: '14%' }}>
                                                    {lead.lastCallOutcome ? (
                                                        <div style={{ fontSize: 11, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <PhoneCall size={10} />
                                                            </div>
                                                            <span style={{ textTransform: 'capitalize' }}>{lead.lastCallOutcome.replace(/_/g, ' ')}</span>
                                                        </div>
                                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No Calls</span>}
                                                </div>
                                                <div style={{ width: '14%' }}>
                                                    {lead.lastMailOutcome ? (
                                                        <div style={{ fontSize: 11, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Mail size={10} />
                                                            </div>
                                                            <span style={{ textTransform: 'capitalize' }}>{lead.lastMailOutcome.replace(/_/g, ' ')}</span>
                                                        </div>
                                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No Emails</span>}
                                                </div>
                                                <div style={{ width: '8%' }}>
                                                    <StatusBadge status={lead.status} />
                                                </div>
                                                <div style={{ width: '8%', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button className="btn-ghost" style={{ padding: '5px 8px' }} onClick={() => setEditLeadId(lead.id)}>
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button className="btn-ghost" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={() => handleDeleteAsk(lead.id)} disabled={deleting === lead.id}>
                                                        {deleting === lead.id ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <Trash2 size={13} />}
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
                            Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> leads
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

            {showAddModal && <NewLeadModal
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                    setShowAddModal(false)
                    fetchLeads()
                }}
            />}

            {editLeadId && <EditLeadModal
                id={editLeadId}
                onClose={() => setEditLeadId(null)}
                onSuccess={() => {
                    setEditLeadId(null)
                    fetchLeads()
                }}
            />}

            {deleteConfirmId && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Trash2 size={32} />
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Delete Lead</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                Are you sure you want to delete this lead? This action cannot be undone and will permanently remove all associated tasks, timelines, and files.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px 0' }}>Cancel</button>
                            <button className="btn-primary" onClick={executeDelete} style={{ flex: 1, padding: '12px 0', background: '#ef4444', borderColor: '#ef4444' }}>
                                Yes, Delete Lead
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
