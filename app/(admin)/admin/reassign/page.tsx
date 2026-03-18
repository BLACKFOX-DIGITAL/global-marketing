'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectToLeads() {
    const router = useRouter()
    useEffect(() => {
        router.replace('/admin/leads')
    }, [router])
    return null
}
