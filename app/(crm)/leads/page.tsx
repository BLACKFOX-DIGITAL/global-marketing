'use client'
import React, { useState, useDeferredValue } from 'react'
import Header from '@/components/Header' // Will remove after relocations
import NotificationCenter from '@/components/NotificationCenter'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Plus, Search, Filter, Trash2, Pencil, ChevronLeft, ChevronRight, UserPlus, PhoneCall, Mail, BookOpen, Copy } from 'lucide-react'
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
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                userSelect: 'none', position: 'relative', overflow: 'hidden',
                minWidth: 160, flex: 1
            }}
            onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = `0 4px 12px ${color}15`
                e.currentTarget.style.borderColor = `${color}30`
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'var(--border)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                </div>
            </div>
            <div style={{ fontSize: 9, color, fontWeight: 700, background: `${color}12`, padding: '2px 6px', borderRadius: 4 }}>
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
    const [isScrolled, setIsScrolled] = useState(false)

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
            <div className="crm-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', paddingTop: 16 }}>
                <div className="page-header" style={{ 
                    marginBottom: isScrolled ? 0 : 12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <h2 style={{ marginBottom: 0 }}>Leads</h2>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} total prospects</span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <NotificationCenter />
                        <Link href="/leads/guide" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', fontSize: 13 }}>
                            <BookOpen size={14} /> Guide
                        </Link>
                        <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '4px 14px', fontSize: 13 }}>
                            <Plus size={14} /> New Lead
                        </button>
                    </div>
                </div>

                {/* Stats Dashboard - Collapses on scroll */}
                <div style={{
                    display: 'flex', gap: 12,
                    maxHeight: isScrolled ? 0 : 100,
                    opacity: isScrolled ? 0 : 1,
                    overflow: 'hidden',
                    marginBottom: isScrolled ? 0 : 16,
                    visibility: isScrolled ? 'hidden' : 'visible',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: isScrolled ? 'none' : 'auto'
                }}>
                    <StatCard
                        icon={<UserPlus size={18} color="#6366f1" />}
                        label="New"
                        value={stats.newLeads}
                        color="#6366f1"
                        periodLabel={currentPeriod.label}
                        onClick={cyclePeriod}
                    />
                    <StatCard
                        icon={<PhoneCall size={18} color="#f59e0b" />}
                        label="Called"
                        value={stats.calledLeads}
                        color="#f59e0b"
                        periodLabel={currentPeriod.label}
                        onClick={cyclePeriod}
                    />
                    <StatCard
                        icon={<Mail size={18} color="#10b981" />}
                        label="Mailed"
                        value={stats.mailSentLeads}
                        color="#10b981"
                        periodLabel={currentPeriod.label}
                        onClick={cyclePeriod}
                    />
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: 400, height: 32 }}>
                        <Search size={14} color="var(--text-muted)" />
                        <input
                            placeholder="Find leads..."
                            value={searchInput}
                            onChange={e => { setSearchInput(e.target.value); setPage(1) }}
                            style={{ fontSize: 13 }}
                        />
                    </div>
                    <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} style={{ width: 120, height: 32, fontSize: 12, padding: '0 8px' }}>
                        {statusOptions.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
                    </select>

                    {/* Mini Stats (Persistent while scrolled) */}
                    <div style={{
                        display: 'flex', gap: 6, opacity: isScrolled ? 1 : 0, transition: 'opacity 0.2s',
                        pointerEvents: isScrolled ? 'auto' : 'none', flexShrink: 0
                    }}>
                        <div title={`${stats.newLeads} New Leads`} style={{ fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <UserPlus size={12} /> {stats.newLeads}
                        </div>
                        <div title={`${stats.calledLeads} Called`} style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <PhoneCall size={12} /> {stats.calledLeads}
                        </div>
                        <div title={`${stats.mailSentLeads} Mailed`} style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={12} /> {stats.mailSentLeads}
                        </div>
                    </div>

                    <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }}><Filter size={14} /></button>
                </div>

                <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
                                                <div style={{ width: '20%', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ flexShrink: 0, scale: '0.85', transformOrigin: 'left center' }}>
                                                        <Avatar name={lead.company || lead.name} />
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <Link href={`/leads/${lead.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company || lead.name}</Link>
                                                        {lead.name && lead.name !== lead.company && <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>}
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
