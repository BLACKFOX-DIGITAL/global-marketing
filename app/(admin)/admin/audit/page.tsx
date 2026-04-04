'use client'
import AuditLedger from '@/components/AuditLedger'
import { History } from 'lucide-react'

export default function AuditPage() {
    return (
        <div style={{ padding: '14px 20px', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: 7, borderRadius: 10, color: '#fff', boxShadow: '0 0 18px rgba(99,102,241,0.25)' }}>
                    <History size={17} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.4px', margin: 0, color: '#f8fafc' }}>Activity Audit Log</h1>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Comprehensive log of all lead operations and system events</div>
                </div>
            </div>
            <AuditLedger />
        </div>
    )
}
