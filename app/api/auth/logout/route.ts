import { NextResponse } from 'next/server'

import { clearAuthCookie } from '@/lib/auth'

export async function POST() {
    try {
        const response = NextResponse.json({ message: 'Logged out' })
        await clearAuthCookie(response)
        return response
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
