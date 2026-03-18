'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DeletionsRedirect() {
    const router = useRouter()
    useEffect(() => {
        router.push('/admin/leads?tab=deletions')
    }, [router])
    return null
}
