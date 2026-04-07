'use client'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Filter, Search, Users, Activity, Zap, Calendar, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts'

interface AuditLog {
    id: string
    action: string
    type: string
    description: string
    createdAt: string
    user: { name: string; email: string }
    lead?: { company: string; website: string } | null
}

interface ActionType { action: string; _count: number }
interface AuditUser { id: string; name: string }
interface Stats { totalToday: number; uniqueActiveUsers: number; topAction: string }

const PERIODS = [
    { key: '', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
]

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
            <div style={{ fontSize: 22, fontWeight: 900, color: highlight ? color : '#f8fafc', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>{sub}</div>
        </div>
    )
}

function getActionColor(action: string) {
    if (action.includes('CREATED')) return '#10b981'
    if (action.includes('UPDATED')) return '#3b82f6'
    if (action.includes('DELETED')) return '#ef4444'
    if (action.includes('CONVERTED')) return '#8b5cf6'
    if (action.includes('CLAIMED')) return '#f59e0b'
    if (action.includes('REASSIGNED')) return '#ec4899'
    return '#64748b'
}

function formatActionLabel(action: string) {
    if (!action) return '—'
    return action
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
}

export default function AuditLedger() {
    const [loading, setLoading] = useState(true)
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [actionTypes, setActionTypes] = useState<ActionType[]>([])
    const [allUsers, setAllUsers] = useState<AuditUser[]>([])
    const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([])
    const [stats, setStats] = useState<Stats | null>(null)
    const [auditTotal, setAuditTotal] = useState(0)
    const [auditPage, setAuditPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const [search, setSearch] = useState('')
    const [actionFilter, setActionFilter] = useState('')
    const [userFilter, setUserFilter] = useState('')
    const [period, setPeriod] = useState('')

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(auditPage), limit: '30' })
        if (actionFilter) params.set('action', actionFilter)
        if (userFilter) params.set('userId', userFilter)
        if (search) params.set('search', search)
        if (period) params.set('period', period)

        const res = await fetch(`/api/admin/audit?${params}`)
        if (res.ok) {
            const d = await res.json()
            setLogs(d.logs)
            setAuditTotal(d.total)
            setTotalPages(d.totalPages)
            setActionTypes(d.actionTypes)
            setAllUsers(d.allUsers || [])
            setStats(d.stats || null)
            setTrendData(d.trendData || [])
        }
        setLoading(false)
    }, [auditPage, actionFilter, userFilter, search, period])

    useEffect(() => { fetchAuditLogs() }, [fetchAuditLogs])

    const activeFilterCount = [actionFilter, userFilter, search, period].filter(Boolean).length

    const pageNumbers = useMemo(() => {
        const max = 5
        let start = Math.max(1, auditPage - 2)
        let end = Math.min(totalPages, start + max - 1)
        if (end - start < max - 1) start = Math.max(1, end - max + 1)
        const pages = []
        for (let i = start; i <= end; i++) pages.push(i)
        return pages
    }, [auditPage, totalPages])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <KpiCard
                    label="Total Events"
                    value={auditTotal.toLocaleString()}
                    sub={period ? `in selected period` : 'all time'}
                    icon={Activity}
                    color="#6366f1"
                />
                <KpiCard
                    label="Events Today"
                    value={(stats?.totalToday ?? 0).toLocaleString()}
                    sub="since midnight"
                    icon={Zap}
                    color="#10b981"
                    highlight={(stats?.totalToday ?? 0) > 0}
                />
                <KpiCard
                    label="Active Users (7d)"
                    value={stats?.uniqueActiveUsers ?? 0}
                    sub="unique team members"
                    icon={Users}
                    color="#3b82f6"
                />
                <KpiCard
                    label="Top Action"
                    value={stats?.topAction ? formatActionLabel(stats.topAction) : '—'}
                    sub="most frequent event"
                    icon={BarChart3}
                    color="#f59e0b"
                />
            </div>

            {/* Trend Chart */}
            {trendData.length > 0 && (
                <div style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '16px 20px' }}>
                    <h3 style={{ fontSize: 12, fontWeight: 900, margin: '0 0 16px 0', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BarChart3 size={13} /> Activity — Last 7 Days
                    </h3>
                    <div style={{ height: 140 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="auditGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }}
                                    itemStyle={{ fontWeight: 800 }}
                                    formatter={(val: any) => [val, 'Events']}
                                />
                                <Area type="monotone" dataKey="count" name="Events" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#auditGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Filters Bar */}
            <div style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', gap: 6, flex: 1, minWidth: 200 }}>
                    <Search size={12} color="#475569" />
                    <input
                        placeholder="Search events, users, leads..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setAuditPage(1) }}
                        style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, outline: 'none', width: '100%' }}
                    />
                </div>

                {/* Period */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 2, border: '1px solid rgba(255,255,255,0.06)', gap: 1 }}>
                    {PERIODS.map(p => (
                        <button key={p.key} onClick={() => { setPeriod(p.key); setAuditPage(1) }}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 9, fontWeight: 900, background: period === p.key ? '#6366f1' : 'transparent', color: period === p.key ? '#fff' : '#475569', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Action filter */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', gap: 6 }}>
                    <Filter size={11} color="#475569" />
                    <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setAuditPage(1) }}
                        style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer', minWidth: 130 }}>
                        <option value="" style={{ background: '#0f172a' }}>All Actions</option>
                        {actionTypes.map(at => (
                            <option key={at.action} value={at.action} style={{ background: '#0f172a' }}>{formatActionLabel(at.action)} ({at._count})</option>
                        ))}
                    </select>
                </div>

                {/* User filter */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', gap: 6 }}>
                    <Users size={11} color="#475569" />
                    <select value={userFilter} onChange={e => { setUserFilter(e.target.value); setAuditPage(1) }}
                        style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer', minWidth: 130 }}>
                        <option value="" style={{ background: '#0f172a' }}>All Users</option>
                        {allUsers.map(u => (
                            <option key={u.id} value={u.id} style={{ background: '#0f172a' }}>{u.name}</option>
                        ))}
                    </select>
                </div>

                {activeFilterCount > 0 && (
                    <button
                        onClick={() => { setSearch(''); setActionFilter(''); setUserFilter(''); setPeriod(''); setAuditPage(1) }}
                        style={{ padding: '5px 10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        Clear ({activeFilterCount})
                    </button>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b98160' }} />
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        {auditTotal.toLocaleString()} events
                    </span>
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <tr style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <th style={{ padding: '11px 20px', fontWeight: 900 }}>Time</th>
                                <th style={{ padding: '11px 20px', fontWeight: 900 }}>User</th>
                                <th style={{ padding: '11px 20px', fontWeight: 900 }}>Related Lead</th>
                                <th style={{ padding: '11px 20px', fontWeight: 900 }}>Action</th>
                                <th style={{ padding: '11px 20px', fontWeight: 900 }}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 80 }}><div className="audit-spinner" /></td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 80, color: '#475569', fontSize: 12, fontWeight: 800 }}>No activity logs found</td></tr>
                            ) : logs.map(log => {
                                const col = getActionColor(log.action)
                                return (
                                    <tr key={log.id} className="audit-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: 12, fontWeight: 900, color: '#f8fafc' }}>{format(parseISO(log.createdAt), 'MMM dd, yyyy')}</div>
                                            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{format(parseISO(log.createdAt), 'HH:mm:ss')}</div>
                                        </td>
                                        <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#6366f1', flexShrink: 0 }}>
                                                    {log.user?.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{log.user?.name}</div>
                                                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>{log.user?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                            {log.lead ? (
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{log.lead.company || 'Anonymous'}</div>
                                                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{log.lead.website || '—'}</div>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 10, color: '#334155', fontWeight: 700 }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 20px', verticalAlign: 'middle' }}>
                                            <span style={{ fontSize: 9, fontWeight: 900, padding: '3px 10px', borderRadius: 6, background: `${col}12`, color: col, border: `1px solid ${col}30`, display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                                {formatActionLabel(log.action)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 20px', verticalAlign: 'middle', fontSize: 12, color: '#94a3b8', fontWeight: 600, lineHeight: 1.5, maxWidth: 350 }}>
                                            {log.description}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                        <span style={{ fontSize: 10, color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Page {auditPage} of {totalPages}
                        </span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1}
                                style={{ padding: '5px 9px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#f1f5f9', borderRadius: 7, cursor: auditPage === 1 ? 'not-allowed' : 'pointer', opacity: auditPage === 1 ? 0.3 : 1, display: 'flex' }}>
                                <ChevronLeft size={14} />
                            </button>
                            {pageNumbers.map(n => (
                                <button key={n} onClick={() => setAuditPage(n)}
                                    style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid', borderColor: auditPage === n ? '#6366f1' : 'rgba(255,255,255,0.08)', background: auditPage === n ? '#6366f1' : 'transparent', color: auditPage === n ? '#fff' : '#94a3b8', fontWeight: auditPage === n ? 800 : 600, fontSize: 12, cursor: 'pointer' }}>
                                    {n}
                                </button>
                            ))}
                            <button onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))} disabled={auditPage === totalPages}
                                style={{ padding: '5px 9px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#f1f5f9', borderRadius: 7, cursor: auditPage === totalPages ? 'not-allowed' : 'pointer', opacity: auditPage === totalPages ? 0.3 : 1, display: 'flex' }}>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .audit-spinner { width: 28px; height: 28px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: #6366f1; animation: audit-spin 1s linear infinite; margin: 0 auto; }
                @keyframes audit-spin { to { transform: rotate(360deg); } }
                .audit-row:hover td { background: rgba(255,255,255,0.015); }
            `}</style>
        </div>
    )
}
