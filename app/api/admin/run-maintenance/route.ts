import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({
            error: 'CRON_SECRET is not set in environment variables. The cron cannot run.'
        }, { status: 500 })
    }

    const baseUrl = new URL(req.url).origin
    const res = await fetch(`${baseUrl}/api/cron/lead-maintenance`, {
        headers: { Authorization: `Bearer ${cronSecret}` }
    })

    const data = await res.json()
    return NextResponse.json({ ...data, ranAt: new Date().toISOString() }, { status: res.status })
}
