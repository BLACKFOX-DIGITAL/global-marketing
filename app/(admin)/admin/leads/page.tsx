'use client'
import { useState, useEffect, useCallback } from 'react'
import {
    Users,
    Search,
    Upload,
    X,
    Target,
    Database,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Filter,
    Download,
    UserPlus,
    Trash2,
    LayoutGrid,
    ArrowUpDown,
    Download as DownloadIcon,
    Plus,
    History as HistoryIcon
} from 'lucide-react'
import { useRef } from 'react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import DeletionReview from '@/components/DeletionReview'

interface Lead { id: string; name: string; company: string | null; email: string | null; phone: string | null; status: string; country: string | null; createdAt: string; updatedAt: string; owner: { id: string; name: string } | null }
interface SalesRep { id: string; name: string }

export default function LeadOperationsHub() {
    const searchParams = useSearchParams()
    const initialTab = (searchParams.get('tab') as 'leads' | 'deletions') || 'leads'
    const [activeTab, setActiveTab] = useState<'leads' | 'deletions'>(initialTab)
    const [leads, setLeads] = useState<Lead[]>([])
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])
    const [statusOptions, setStatusOptions] = useState<Array<{ value: string; color: string | null }>>([])

    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [sortBy, setSortBy] = useState('updatedAt')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [newOwnerId, setNewOwnerId] = useState('')
    const [distributing, setDistributing] = useState(false)

    const [showImport, setShowImport] = useState(false)
    const [importing, setImporting] = useState(false)
    const [csvData, setCsvData] = useState<any[]>([])
    const [importAssignTo, setImportAssignTo] = useState('')

    // Advanced Filters
    const [filterCountry, setFilterCountry] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterOwnerId, setFilterOwnerId] = useState('')
    const [availableCountries, setAvailableCountries] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const filterRef = useRef<HTMLDivElement>(null)

    const fetchData = useCallback(async () => {
        if (activeTab !== 'leads') return
        setLoading(true)
        try {
            const params = new URLSearchParams({ 
                page: String(page), 
                limit: String(limit),
                sortBy,
                sortOrder
            })
            if (search) params.set('search', search)
            if (filterCountry) params.set('country', filterCountry)
            if (filterStatus) params.set('status', filterStatus)
            if (filterOwnerId) params.set('ownerId', filterOwnerId)

            const [leadsRes, settingsRes] = await Promise.all([
                fetch(`/api/admin/leads?${params}`), fetch('/api/admin/settings?category=LEAD_STATUS')
            ])

            if (leadsRes.ok) {
                const d = await leadsRes.json()
                setLeads(d.leads)
                setTotal(d.total)
                setSalesReps(d.salesReps)
                setAvailableCountries(d.countries || [])
            }
            if (settingsRes.ok) setStatusOptions((await settingsRes.json()).options || [])
        } finally { setLoading(false) }
    }, [activeTab, page, limit, sortBy, sortOrder, search, filterCountry, filterStatus, filterOwnerId])

    useEffect(() => {
        if (!showFilters) return
        function handleClickOutside(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showFilters])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(field)
            setSortOrder('asc')
        }
    }

    const toggleSelectAll = () => setSelectedIds(selectedIds.size === leads.length ? new Set() : new Set(leads.map(l => l.id)))
    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id); else next.add(id)
        setSelectedIds(next)
    }

    const handleMassDistribution = async () => {
        if (selectedIds.size === 0 || !newOwnerId) return
        setDistributing(true)
        try {
            const res = await fetch('/api/admin/reassign', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: Array.from(selectedIds), newOwnerId })
            })
            if (res.ok) { setSelectedIds(new Set()); setNewOwnerId(''); fetchData() }
        } finally {
            setDistributing(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            const lines = text.split('\n').filter(line => line.trim())
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
            const data = []
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim())
                const row: any = {}
                headers.forEach((h, idx) => { row[h] = values[idx] || '' })
                if (row.name) data.push(row)
            }
            setCsvData(data)
        }
        reader.readAsText(file)
    }

    const handleImport = async () => {
        setImporting(true)
        const res = await fetch('/api/admin/leads', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads: csvData, assignTo: importAssignTo || null })
        })
        if (res.ok) { setCsvData([]); setShowImport(false); fetchData() }
        setImporting(false)
    }

    const totalPages = Math.ceil(total / limit)

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <MoreHorizontal size={14} style={{ opacity: 0.3, marginLeft: 8 }} />
        return sortOrder === 'asc' ? <ChevronLeft size={14} style={{ transform: 'rotate(90deg)', marginLeft: 8 }} /> : <ChevronRight size={14} style={{ transform: 'rotate(90deg)', marginLeft: 8 }} />
    }

    return (
        <div style={{ padding: '20px 32px', maxWidth: '100%', margin: '0 auto', width: '100%', position: 'relative' }}>
            <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', margin: 0, color: 'var(--text-primary)' }}>Global Leads</h1>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>View, filter, and manage all leads across the team.</p>
                    </div>
                    {activeTab === 'leads' && (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => {}} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Download size={14} /> Export
                            </button>
                            <button onClick={() => setShowImport(true)} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <Upload size={14} /> Import
                            </button>
                            <button style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Plus size={14} /> New Lead
                            </button>
                        </div>
                    )}
                </div>

                {/* Tactical Tab Switcher */}
                <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                    <button
                        onClick={() => setActiveTab('leads')}
                        style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: activeTab === 'leads' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'leads' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                    >
                        <LayoutGrid size={14} /> All Leads
                    </button>
                    <button
                        onClick={() => setActiveTab('deletions')}
                        style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: activeTab === 'deletions' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'deletions' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                    >
                        <Trash2 size={14} /> Deletion Review
                    </button>
                </div>

                {activeTab === 'leads' && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', flex: 1, maxWidth: 320 }}>
                            <Search size={16} color="var(--text-muted)" style={{ marginRight: 8 }} />
                            <input placeholder="Search leads..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: 13 }} />
                        </div>
                        
                        {/* Advanced Filter Dropdown */}
                        <div style={{ position: 'relative' }} ref={filterRef}>
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                style={{ 
                                    background: (filterCountry || filterStatus || filterOwnerId) ? 'var(--accent-glow)' : 'var(--bg-card)', 
                                    border: (filterCountry || filterStatus || filterOwnerId) ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                    color: (filterCountry || filterStatus || filterOwnerId) ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Filter size={16} />
                                {(filterCountry || filterStatus || filterOwnerId) && <span style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, background: 'var(--accent-primary)', borderRadius: '50%', border: '1px solid var(--bg-card)' }} />}
                            </button>

                            {showFilters && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, width: 280, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, zIndex: 50, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', animation: 'slideDown 0.2s ease-out' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Refine Search</h4>
                                        <button onClick={() => { setFilterCountry(''); setFilterStatus(''); setFilterOwnerId(''); setPage(1) }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Reset All</button>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.5px' }}>Location / Country</label>
                                            <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); setPage(1) }} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', fontSize: 13 }}>
                                                <option value="">All Regions</option>
                                                {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.5px' }}>Lead Status</label>
                                            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', fontSize: 13 }}>
                                                <option value="">Any Status</option>
                                                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.5px' }}>Assigned Owner</label>
                                            <select value={filterOwnerId} onChange={e => { setFilterOwnerId(e.target.value); setPage(1) }} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', fontSize: 13 }}>
                                                <option value="">All Members</option>
                                                <option value="pool">Unassigned (Pool)</option>
                                                {salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{total.toLocaleString()} leads found</div>
                        
                        <div style={{ flex: 1 }} />
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Show:</span>
                            <select 
                                value={limit} 
                                onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'leads' ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <th style={{ padding: '12px 20px', width: 60, textAlign: 'center' }}><input type="checkbox" checked={leads.length > 0 && selectedIds.size === leads.length} onChange={toggleSelectAll} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent-primary)' }} /></th>
                                <th onClick={() => handleSort('company')} style={{ padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: 320 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Company / Lead <SortIcon field="company" /></div></th>
                                <th onClick={() => handleSort('status')} style={{ padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: 150 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Status <SortIcon field="status" /></div></th>
                                <th onClick={() => handleSort('owner')} style={{ padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: 220 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Owner <SortIcon field="owner" /></div></th>
                                <th onClick={() => handleSort('updatedAt')} style={{ padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: 140 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Last Activity <SortIcon field="updatedAt" /></div></th>
                                <th style={{ padding: '12px 16px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 100 }}><div className="spinner" /></td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>No leads found.</td></tr>
                            ) : (
                                leads.map(l => {
                                    const isSelected = selectedIds.has(l.id)
                                    const statusCol = statusOptions.find(so => so.value === l.status)?.color || 'var(--accent-primary)'
                                    return (
                                        <tr key={l.id} className="lead-row" style={{ background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'all 0.2s', cursor: 'default' }}>
                                            <td style={{ padding: '8px 20px', textAlign: 'center', verticalAlign: 'middle', width: 60 }}><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(l.id)} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent-primary)' }} /></td>
                                            <td style={{ padding: '8px 16px', verticalAlign: 'middle', width: 320 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#f8fafc', flexShrink: 0 }}>{(l.company || 'L')[0].toUpperCase()}</div><Link href={`/admin/leads/${l.id}`} style={{ fontWeight: 800, color: '#f8fafc', textDecoration: 'none', fontSize: 12, display: 'block' }}>{l.company || l.name}</Link></div></td>
                                            <td style={{ padding: '8px 16px', verticalAlign: 'middle', width: 150 }}><div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 6, background: `${statusCol}15`, color: statusCol, border: `1px solid ${statusCol}30`, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l.status}</span></div></td>
                                            <td style={{ padding: '8px 16px', verticalAlign: 'middle', width: 220 }}>{l.owner ? (<div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}><div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'var(--accent-primary)', flexShrink: 0 }}>{l.owner.name[0]}</div><span style={{ fontWeight: 700, fontSize: 12, color: '#f1f5f9' }}>{l.owner.name}</span></div>) : <span style={{ color: '#475569', fontSize: 11, fontWeight: 700 }}>Unassigned</span>}</td>
                                            <td style={{ padding: '8px 16px', verticalAlign: 'middle', width: 140 }}><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.2px' }}>{format(parseISO(l.updatedAt), 'MMM dd, yyyy')}</div></td>
                                            <td style={{ padding: '8px 16px' }}></td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} records
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))} 
                            disabled={page === 1} 
                            style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.3 : 1 }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        {/* Number buttons logic */}
                        {(() => {
                            const pages = []
                            const maxVisible = 5
                            let start = Math.max(1, page - 2)
                            let end = Math.min(totalPages, start + maxVisible - 1)
                            if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
                            
                            for (let i = start; i <= end; i++) {
                                pages.push(
                                    <button 
                                        key={i} 
                                        onClick={() => setPage(i)} 
                                        style={{ 
                                            width: 36, height: 36, borderRadius: 8, border: '1px solid',
                                            borderColor: page === i ? 'var(--accent-primary)' : 'var(--border)',
                                            background: page === i ? 'var(--accent-primary)' : 'transparent',
                                            color: page === i ? '#fff' : 'var(--text-primary)',
                                            fontWeight: page === i ? 700 : 500, fontSize: 13, cursor: 'pointer'
                                        }}
                                    >
                                        {i}
                                    </button>
                                )
                            }
                            return pages
                        })()}

                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                            disabled={page === totalPages || totalPages === 0} 
                            style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.3 : 1 }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
            ) : (
                <DeletionReview />
            )}

            {/* Mass Distribution Toolbar */}
            {selectedIds.size > 0 && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={14} /></div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedIds.size} Leads Selected</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mass Reassignment</div>
                        </div>
                    </div>
                    <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <select value={newOwnerId} onChange={e => setNewOwnerId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', fontSize: 13, minWidth: 180 }}>
                            <option value="">Assign to...</option>
                            {salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                        </select>
                        <button onClick={handleMassDistribution} disabled={!newOwnerId || distributing} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: (!newOwnerId || distributing) ? 'not-allowed' : 'pointer', opacity: (!newOwnerId || distributing) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {distributing ? 'Processing...' : <><Target size={14} /> Transfer</>}
                        </button>
                        <button onClick={() => setSelectedIds(new Set())} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex' }}><X size={18} /></button>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowImport(false)}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, width: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Import Leads</h3>
                            <button onClick={() => setShowImport(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>CSV File</label>
                                <input type="file" accept=".csv" onChange={handleFileUpload} style={{ padding: 16, border: '2px dashed var(--border)', borderRadius: 12, width: '100%', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', cursor: 'pointer' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Default Assignment</label>
                                <select value={importAssignTo} onChange={e => setImportAssignTo(e.target.value)} style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', fontSize: 13, width: '100%' }}>
                                    <option value="">Unassigned (Lead Pool)</option>
                                    {salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                <button onClick={() => setShowImport(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleImport} disabled={csvData.length === 0 || importing} style={{ flex: 2, padding: '12px', border: 'none', background: 'var(--accent-primary)', color: 'white', borderRadius: 8, fontWeight: 600, cursor: (csvData.length === 0 || importing) ? 'not-allowed' : 'pointer', opacity: (csvData.length === 0 || importing) ? 0.5 : 1 }}>
                                    {importing ? 'Importing...' : `Import ${csvData.length} records`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

