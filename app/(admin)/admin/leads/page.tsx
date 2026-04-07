'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Users, Search, Upload, X, Target, Database,
    ChevronLeft, ChevronRight, ChevronsUpDown, Filter,
    Download, UserPlus, Trash2, LayoutGrid, Plus, BarChart3,
    Check
} from 'lucide-react'
import { useRef } from 'react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DeletionReview from '@/components/DeletionReview'

interface Lead { id: string; name: string; company: string | null; email: string | null; phone: string | null; status: string; country: string | null; createdAt: string; updatedAt: string; owner: { id: string; name: string } | null }
interface SalesRep { id: string; name: string }
interface Stats { totalAll: number; unassigned: number; newThisMonth: number; statusBreakdown: { status: string; _count: number }[] }

function KpiCard({ label, value, sub, icon: Icon, color, highlight = false }: {
    label: string; value: string | number; sub: string
    icon: React.ElementType; color: string; highlight?: boolean
}) {
    return (
        <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: highlight ? `${color}12` : 'rgba(30,41,59,0.45)',
            border: `1px solid ${highlight ? color + '30' : 'rgba(255,255,255,0.06)'}`,
            backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', gap: 6,
            boxShadow: highlight ? `0 0 20px ${color}18` : 'none'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} strokeWidth={2.5} />
                </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: highlight ? color : '#f8fafc', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>{sub}</div>
        </div>
    )
}

export default function LeadOperationsHub() {
    const searchParams = useSearchParams()
    const initialTab = (searchParams.get('tab') as 'leads' | 'deletions') || 'leads'
    const [activeTab, setActiveTab] = useState<'leads' | 'deletions'>(initialTab)
    const [leads, setLeads] = useState<Lead[]>([])
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])
    const [statusOptions, setStatusOptions] = useState<Array<{ value: string; color: string | null }>>([])
    const [stats, setStats] = useState<Stats | null>(null)

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

    const [showNewLead, setShowNewLead] = useState(false)
    const [newLeadForm, setNewLeadForm] = useState({ name: '', company: '', email: '', phone: '', country: '', status: 'New', ownerId: '' })
    const [savingLead, setSavingLead] = useState(false)
    const [newLeadError, setNewLeadError] = useState('')

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
            const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortOrder })
            if (search) params.set('search', search)
            if (filterCountry) params.set('country', filterCountry)
            if (filterStatus) params.set('status', filterStatus)
            if (filterOwnerId) params.set('ownerId', filterOwnerId)

            const [leadsRes, settingsRes] = await Promise.all([
                fetch(`/api/admin/leads?${params}`),
                fetch('/api/admin/settings?category=LEAD_STATUS')
            ])

            if (leadsRes.ok) {
                const d = await leadsRes.json()
                setLeads(d.leads)
                setTotal(d.total)
                setSalesReps(d.salesReps)
                setAvailableCountries(d.countries || [])
                setStats(d.stats || null)
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
        if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        else { setSortBy(field); setSortOrder('asc') }
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
        } finally { setDistributing(false) }
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

    const handleExport = async () => {
        const params = new URLSearchParams({ export: 'true', sortBy, sortOrder })
        if (search) params.set('search', search)
        if (filterCountry) params.set('country', filterCountry)
        if (filterStatus) params.set('status', filterStatus)
        if (filterOwnerId) params.set('ownerId', filterOwnerId)

        const res = await fetch(`/api/admin/leads?${params}`)
        if (!res.ok) return
        const data = await res.json()
        const rows: Lead[] = data.leads

        const headers = ['Name', 'Company', 'Email', 'Phone', 'Country', 'Status', 'Owner', 'Updated']
        const csv = [
            headers.join(','),
            ...rows.map(r => [
                `"${r.name}"`,
                `"${r.company || ''}"`,
                `"${r.email || ''}"`,
                `"${r.phone || ''}"`,
                `"${r.country || ''}"`,
                `"${r.status}"`,
                `"${r.owner?.name || 'Unassigned'}"`,
                `"${format(parseISO(r.updatedAt), 'yyyy-MM-dd')}"`,
            ].join(','))
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `leads-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleCreateLead = async () => {
        setNewLeadError('')
        if (!newLeadForm.name.trim()) { setNewLeadError('Name is required'); return }
        setSavingLead(true)
        try {
            const res = await fetch('/api/admin/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leads: [{ ...newLeadForm }],
                    assignTo: newLeadForm.ownerId || null
                })
            })
            if (res.ok) {
                setShowNewLead(false)
                setNewLeadForm({ name: '', company: '', email: '', phone: '', country: '', status: 'New', ownerId: '' })
                fetchData()
            } else {
                setNewLeadError('Failed to create lead')
            }
        } finally { setSavingLead(false) }
    }

    const totalPages = Math.ceil(total / limit)

    const chartData = useMemo(() => {
        if (!stats?.statusBreakdown) return []
        return stats.statusBreakdown.map(s => ({
            status: s.status,
            count: s._count,
            color: statusOptions.find(opt => opt.value === s.status)?.color || '#3b82f6'
        }))
    }, [stats, statusOptions])

    const activeFilterCount = [filterCountry, filterStatus, filterOwnerId].filter(Boolean).length

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ChevronsUpDown size={14} style={{ opacity: 0.3, marginLeft: 8 }} />
        return sortOrder === 'asc'
            ? <ChevronLeft size={14} style={{ transform: 'rotate(90deg)', marginLeft: 8 }} />
            : <ChevronRight size={14} style={{ transform: 'rotate(90deg)', marginLeft: 8 }} />
    }

    return (
        <div style={{ padding: '14px 20px', maxWidth: '100%', margin: '0 auto', width: '100%', position: 'relative' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: 7, borderRadius: 10, color: '#fff', boxShadow: '0 0 18px rgba(99,102,241,0.25)' }}>
                        <Database size={17} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.4px', margin: 0, color: '#f8fafc' }}>Global Leads</h1>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>View, filter, and manage all leads across the team</div>
                    </div>
                </div>
                {activeTab === 'leads' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleExport} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Download size={13} /> Export CSV
                        </button>
                        <button onClick={() => setShowImport(true)} style={{ background: 'linear-gradient(to bottom, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                            <Upload size={13} /> Import
                        </button>
                        <button onClick={() => setShowNewLead(true)} style={{ background: 'linear-gradient(to bottom, #10b981, #059669)', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                            <Plus size={13} /> New Lead
                        </button>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
                <KpiCard label="Total Leads" value={(stats?.totalAll ?? 0).toLocaleString()} sub="across all reps" icon={Database} color="#6366f1" />
                <KpiCard label="Unassigned" value={(stats?.unassigned ?? 0).toLocaleString()} sub="in lead pool" icon={Users} color="#f59e0b" highlight={(stats?.unassigned ?? 0) > 0} />
                <KpiCard label="New This Month" value={(stats?.newThisMonth ?? 0).toLocaleString()} sub="leads created" icon={UserPlus} color="#10b981" highlight={(stats?.newThisMonth ?? 0) > 0} />
                <KpiCard label="Filtered Results" value={total.toLocaleString()} sub={activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : 'no filters applied'} icon={Filter} color="#3b82f6" highlight={activeFilterCount > 0} />
            </div>

            {/* Status Breakdown Chart */}
            {activeTab === 'leads' && chartData.length > 0 && (
                <div style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '16px 20px', marginBottom: 18 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 900, margin: '0 0 16px 0', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BarChart3 size={13} /> Lead Status Breakdown
                    </h3>
                    <div style={{ height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }}
                                    itemStyle={{ fontWeight: 800 }}
                                    formatter={(val: any) => [val, 'Leads']}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                <button onClick={() => setActiveTab('leads')} style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: activeTab === 'leads' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'leads' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                    <LayoutGrid size={14} /> All Leads
                </button>
                <button onClick={() => setActiveTab('deletions')} style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: activeTab === 'deletions' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'deletions' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                    <Trash2 size={14} /> Deletion Review
                </button>
            </div>

            {activeTab === 'leads' && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', flex: 1, maxWidth: 320 }}>
                        <Search size={16} color="var(--text-muted)" style={{ marginRight: 8 }} />
                        <input placeholder="Search leads..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: 13 }} />
                    </div>

                    {/* Filter dropdown */}
                    <div style={{ position: 'relative' }} ref={filterRef}>
                        <button onClick={() => setShowFilters(!showFilters)} style={{ background: activeFilterCount > 0 ? 'var(--accent-glow)' : 'var(--bg-card)', border: activeFilterCount > 0 ? '1px solid var(--accent-primary)' : '1px solid var(--border)', color: activeFilterCount > 0 ? 'var(--accent-primary)' : 'var(--text-primary)', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                            <Filter size={16} />
                            {activeFilterCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: 'var(--accent-primary)', borderRadius: '50%', border: '2px solid var(--bg-card)', fontSize: 8, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>}
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

                    <div style={{ flex: 1 }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Show:</span>
                        <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            )}

            {activeTab === 'leads' ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                            <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <th style={{ padding: '12px 20px', width: 60, textAlign: 'center' }}>
                                        <div onClick={toggleSelectAll} style={{ margin: '0 auto', width: 16, height: 16, borderRadius: 4, background: leads.length > 0 && selectedIds.size === leads.length ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', border: leads.length > 0 && selectedIds.size === leads.length ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                                            {leads.length > 0 && selectedIds.size === leads.length && <Check size={12} strokeWidth={3} color="#fff" />}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('company')} style={{ padding: '12px 16px', fontWeight: 800, cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Company / Lead <SortIcon field="company" /></div></th>
                                    <th onClick={() => handleSort('status')} style={{ padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: 150 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Status <SortIcon field="status" /></div></th>
                                    <th onClick={() => handleSort('owner')} style={{ padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: 220 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Owner <SortIcon field="owner" /></div></th>
                                    <th onClick={() => handleSort('updatedAt')} style={{ padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: 160 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Last Activity <SortIcon field="updatedAt" /></div></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 100 }}><div className="spinner" /></td></tr>
                                ) : leads.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>No leads found.</td></tr>
                                ) : leads.map(l => {
                                    const isSelected = selectedIds.has(l.id)
                                    const statusCol = statusOptions.find(so => so.value === l.status)?.color || 'var(--accent-primary)'
                                    return (
                                        <tr key={l.id} className="lead-row" style={{ background: isSelected ? 'rgba(99,102,241,0.05)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }}>
                                            <td style={{ padding: '8px 20px', textAlign: 'center', verticalAlign: 'middle', width: 60 }}>
                                                <div onClick={() => toggleSelect(l.id)} style={{ margin: '0 auto', width: 16, height: 16, borderRadius: 4, background: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                    {isSelected && <Check size={12} strokeWidth={3} color="#fff" />}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 16px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#f8fafc', flexShrink: 0 }}>
                                                        {(l.company || 'L')[0].toUpperCase()}
                                                    </div>
                                                    <Link href={`/admin/leads/${l.id}`} style={{ fontWeight: 800, color: '#f8fafc', textDecoration: 'none', fontSize: 12 }}>{l.company || l.name}</Link>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 16px', verticalAlign: 'middle', width: 150 }}>
                                                <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 6, background: `${statusCol}15`, color: statusCol, border: `1px solid ${statusCol}30`, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l.status}</span>
                                            </td>
                                            <td style={{ padding: '8px 16px', verticalAlign: 'middle', width: 220 }}>
                                                {l.owner ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'var(--accent-primary)', flexShrink: 0 }}>{l.owner.name[0]}</div>
                                                        <span style={{ fontWeight: 700, fontSize: 12, color: '#f1f5f9' }}>{l.owner.name}</span>
                                                    </div>
                                                ) : <span style={{ color: '#475569', fontSize: 11, fontWeight: 700 }}>Unassigned</span>}
                                            </td>
                                            <td style={{ padding: '8px 16px', verticalAlign: 'middle', width: 160 }}>
                                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{format(parseISO(l.updatedAt), 'MMM dd, yyyy')}</div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Showing {total === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} records
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.3 : 1 }}>
                                <ChevronLeft size={16} />
                            </button>
                            {(() => {
                                const pages = []
                                const maxVisible = 5
                                let start = Math.max(1, page - 2)
                                let end = Math.min(totalPages, start + maxVisible - 1)
                                if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
                                for (let i = start; i <= end; i++) {
                                    pages.push(
                                        <button key={i} onClick={() => setPage(i)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid', borderColor: page === i ? 'var(--accent-primary)' : 'var(--border)', background: page === i ? 'var(--accent-primary)' : 'transparent', color: page === i ? '#fff' : 'var(--text-primary)', fontWeight: page === i ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>{i}</button>
                                    )
                                }
                                return pages
                            })()}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.3 : 1 }}>
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
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={14} /></div>
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

            {/* New Lead Modal */}
            {showNewLead && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowNewLead(false)}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, width: 520, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: 7, borderRadius: 9, color: '#fff' }}><UserPlus size={16} /></div>
                                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>New Lead</h3>
                            </div>
                            <button onClick={() => setShowNewLead(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        {newLeadError && (
                            <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 12, fontWeight: 700 }}>
                                {newLeadError}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {[
                                { label: 'Name *', key: 'name', placeholder: 'Contact name', span: false },
                                { label: 'Company', key: 'company', placeholder: 'Company name', span: false },
                                { label: 'Email', key: 'email', placeholder: 'email@example.com', span: false },
                                { label: 'Phone', key: 'phone', placeholder: '+1 555 000 0000', span: false },
                                { label: 'Country', key: 'country', placeholder: 'e.g. Australia', span: false },
                            ].map(field => (
                                <div key={field.key} style={field.span ? { gridColumn: '1 / -1' } : {}}>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</label>
                                    <input
                                        value={(newLeadForm as any)[field.key]}
                                        onChange={e => setNewLeadForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        placeholder={field.placeholder}
                                        style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                            ))}
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                                <select value={newLeadForm.status} onChange={e => setNewLeadForm(prev => ({ ...prev, status: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
                                    {statusOptions.length > 0 ? statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>) : <option value="New">New</option>}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assign To</label>
                                <select value={newLeadForm.ownerId} onChange={e => setNewLeadForm(prev => ({ ...prev, ownerId: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
                                    <option value="">Unassigned (Pool)</option>
                                    {salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button onClick={() => setShowNewLead(false)} style={{ flex: 1, padding: '11px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                            <button onClick={handleCreateLead} disabled={savingLead} style={{ flex: 2, padding: '11px', border: 'none', background: 'linear-gradient(to bottom, #10b981, #059669)', color: 'white', borderRadius: 8, fontWeight: 700, cursor: savingLead ? 'not-allowed' : 'pointer', fontSize: 13, opacity: savingLead ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                {savingLead ? 'Creating...' : <><UserPlus size={14} /> Create Lead</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: #6366f1; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
                .lead-row:hover td { background: rgba(255,255,255,0.015); }
            `}</style>
        </div>
    )
}
