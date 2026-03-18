'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GovernanceRedirect() {
    const router = useRouter()
    useEffect(() => {
        router.push('/admin/leads?tab=audit')
    }, [router])
    return null
}
