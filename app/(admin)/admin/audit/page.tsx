'use client'
import AuditLedger from '@/components/AuditLedger'
import { History } from 'lucide-react'

export default function AuditPage() {
    return (
        <div style={{ padding: '24px 32px' }}>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <History size={20} color="var(--text-primary)" />
                </div>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Leads Activity</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Comprehensive audit log of all lead operations and system events</p>
                </div>
            </div>
            
            <AuditLedger />
        </div>
    )
}
