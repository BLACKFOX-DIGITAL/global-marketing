'use client'
import React from 'react'

export default function StatusBadge({ status }: { status: string }) {
    const cls = status.toLowerCase().replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '-')
    return <span className={`badge badge-${cls}`}>{status}</span>
}
