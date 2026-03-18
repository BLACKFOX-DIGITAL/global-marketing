'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuditRedirect() {
    const router = useRouter()
    useEffect(() => {
        router.push('/admin/leads?tab=audit')
    }, [router])
    return null
}
