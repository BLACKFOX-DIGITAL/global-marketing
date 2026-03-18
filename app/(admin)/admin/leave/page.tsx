'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectToWorkforce() {
    const router = useRouter()
    useEffect(() => {
        router.replace('/admin/workforce')
    }, [router])
    return null
}
