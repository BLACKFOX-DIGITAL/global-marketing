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
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Filter size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2px' }}>Filter:</span>
                </div>
                <select
                    value={actionFilter}
                    onChange={e => { setActionFilter(e.target.value); setAuditPage(1) }}
                    style={{ 
                        width: '210px',
                        padding: '6px 10px', 
                        borderRadius: 8, 
                        border: '1px solid var(--border)', 
                        background: 'var(--bg-main)', 
                        color: 'var(--text-primary)', 
                        fontSize: 12, 
                        fontWeight: 600, 
                        outline: 'none', 
                        cursor: 'pointer' 
                    }}
                >
                    <option value="">All Global Events</option>
                    {actionTypes.map(at => (
                        <option key={at.action} value={at.action}>{at.action} ({at._count})</option>
                    ))}
                </select>
                <div style={{ flex: 1 }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {auditTotal.toLocaleString()} Events Tracked
                </span>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                        <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Timestamp</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Operator</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Target Lead</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Action</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>No audit events found.</td></tr>
                        ) : logs.map((log, idx) => (
                            <tr key={log.id} style={{ borderBottom: idx === logs.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                <td style={{ padding: '10px 16px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{format(parseISO(log.createdAt), 'MMM dd, yyyy')}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(parseISO(log.createdAt), 'HH:mm:ss')}</div>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: '1px solid var(--border)' }}>
                                            {log.user?.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{log.user?.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.user?.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                    {log.lead ? (
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{log.lead.company || 'N/A'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.lead.website || '-'}</div>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>-</span>
                                    )}
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                        background: `${getActionColor(log.action)}12`, color: getActionColor(log.action), border: `1px solid ${getActionColor(log.action)}25`,
                                        display: 'inline-block', lineHeight: 1
                                    }}>{log.action}</span>
                                </td>
                                <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.4 }}>
                                    {log.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {auditTotal > 30 && (
                    <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>PAGE {auditPage} OF {Math.ceil(auditTotal / 30)}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} style={{ padding: '6px 12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 6, cursor: auditPage === 1 ? 'not-allowed' : 'pointer', opacity: auditPage === 1 ? 0.4 : 1 }}>Previous</button>
                            <button onClick={() => setAuditPage(p => Math.min(Math.ceil(auditTotal / 30), p + 1))} disabled={auditPage === Math.ceil(auditTotal / 30)} style={{ padding: '6px 12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 6, cursor: auditPage === Math.ceil(auditTotal / 30) ? 'not-allowed' : 'pointer', opacity: auditPage === Math.ceil(auditTotal / 30) ? 0.4 : 1 }}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
