import React from 'react'
import LeadDetailContent from '@/components/LeadDetailContent'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const user = await getCurrentUser()
    
    if (!user) {
        redirect('/login')
    }

    return <LeadDetailContent id={id} linkPrefix="/admin" currentUserId={user.userId} isAdmin={user.role === 'Administrator'} />
}
