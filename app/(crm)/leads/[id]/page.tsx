'use client'
import React, { use } from 'react'
import LeadDetailContent from '@/components/LeadDetailContent'

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    return <LeadDetailContent id={id} />
}
