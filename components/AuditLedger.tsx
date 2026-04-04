'use client'
import { useState, useCallback, useEffect } from 'react'
import { Filter, History } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface AuditLog {
    id: string
    action: string
    type: string
    description: string
    createdAt: string
    user: { name: string; email: string }
    lead?: { company: string; website: string } | null
}

interface ActionType {
    action: string
    _count: number
}

export default function AuditLedger() {
    const [loading, setLoading] = useState(true)
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [actionTypes, setActionTypes] = useState<ActionType[]>([])
    const [auditTotal, setAuditTotal] = useState(0)
    const [auditPage, setAuditPage] = useState(1)
    const [actionFilter, setActionFilter] = useState('')

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(auditPage), limit: '30' })
        if (actionFilter) params.set('action', actionFilter)
        const res = await fetch(`/api/admin/audit?${params}`)
        if (res.ok) {
            const d = await res.json()
            setLogs(d.logs)
            setAuditTotal(d.total)
            setActionTypes(d.actionTypes)
        }
        setLoading(false)
    }, [auditPage, actionFilter])

    useEffect(() => {
        fetchAuditLogs()
    }, [fetchAuditLogs])

    const getActionColor = (action: string) => {
        if (action.includes('CREATED')) return '#10b981'
        if (action.includes('UPDATED')) return '#3b82f6'
        if (action.includes('DELETED')) return '#ef4444'
        if (action.includes('CONVERTED')) return '#8b5cf6'
        if (action.includes('CLAIMED')) return '#f59e0b'
        return 'var(--text-muted)'
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Filter size={13} color="#64748b" strokeWidth={2.5} />
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Filter by action:</span>
                </div>
                <select
                    value={actionFilter}
                    onChange={e => { setActionFilter(e.target.value); setAuditPage(1) }}
                    style={{ 
                        width: '240px',
                        padding: '6px 12px', 
                        borderRadius: 8, 
                        border: '1px solid var(--border)', 
                        background: 'rgba(0,0,0,0.2)', 
                        color: '#f1f5f9', 
                        fontSize: 11, 
                        fontWeight: 700, 
                        outline: 'none', 
                        cursor: 'pointer',
                        appearance: 'none'
                    }}
                >
                    <option value="">All Events</option>
                    {actionTypes.map(at => (
                        <option key={at.action} value={at.action}>{at.action} • {at._count}</option>
                    ))}
                </select>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b98150' }} />
                    <span style={{ color: '#f1f5f9', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {auditTotal.toLocaleString()} Events Indexed
                    </span>
                </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                            <tr style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <th style={{ padding: '12px 24px', fontWeight: 800 }}>Time</th>
                                <th style={{ padding: '12px 24px', fontWeight: 800 }}>User</th>
                                <th style={{ padding: '12px 24px', fontWeight: 800 }}>Related Lead</th>
                                <th style={{ padding: '12px 24px', fontWeight: 800 }}>Action</th>
                                <th style={{ padding: '12px 24px', fontWeight: 800 }}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 80, color: '#475569', fontSize: 12, fontWeight: 800 }}>No activity logs found</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }}>
                                        <td style={{ padding: '8px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: 12, fontWeight: 900, color: '#f8fafc' }}>{format(parseISO(log.createdAt), 'MMM dd, yyyy')}</div>
                                            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{format(parseISO(log.createdAt), 'HH:mm:ss')} (UTC)</div>
                                        </td>
                                        <td style={{ padding: '8px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: 'var(--accent-primary)', flexShrink: 0 }}>{log.user?.name.substring(0, 2).toUpperCase()}</div>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{log.user?.name}</div>
                                                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>{log.user?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 24px', verticalAlign: 'middle' }}>
                                            {log.lead ? (
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>{log.lead.company || 'ANONYMOUS'}</div>
                                                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{log.lead.website || '—'}</div>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, fontStyle: 'italic' }}>—</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px 24px', verticalAlign: 'middle' }}>
                                            <div style={{
                                                fontSize: 9, fontWeight: 950, padding: '3px 10px', borderRadius: 6,
                                                background: `${getActionColor(log.action)}10`, color: getActionColor(log.action), border: `1px solid ${getActionColor(log.action)}30`,
                                                display: 'inline-block', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.8px', boxShadow: `0 0 10px ${getActionColor(log.action)}05`
                                            }}>{log.action}</div>
                                        </td>
                                        <td style={{ padding: '8px 24px', verticalAlign: 'middle', fontSize: 12, color: '#94a3b8', fontWeight: 600, lineHeight: 1.5, maxWidth: 350 }}>
                                            {log.description}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {auditTotal > 30 && (
                    <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Page {auditPage} of {Math.ceil(auditTotal / 30)}</span>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} style={{ padding: '6px 14px', border: '1px solid var(--border)', background: 'transparent', color: '#f1f5f9', borderRadius: 8, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: auditPage === 1 ? 'not-allowed' : 'pointer', opacity: auditPage === 1 ? 0.3 : 1, transition: 'all 0.2s' }}>Previous</button>
                            <button onClick={() => setAuditPage(p => Math.min(Math.ceil(auditTotal / 30), p + 1))} disabled={auditPage === Math.ceil(auditTotal / 30)} style={{ padding: '6px 14px', border: '1px solid var(--border)', background: 'transparent', color: '#f1f5f9', borderRadius: 8, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: auditPage === Math.ceil(auditTotal / 30) ? 'not-allowed' : 'pointer', opacity: auditPage === Math.ceil(auditTotal / 30) ? 0.3 : 1, transition: 'all 0.2s' }}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
