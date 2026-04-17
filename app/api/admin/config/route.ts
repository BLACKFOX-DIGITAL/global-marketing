import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const ALLOWED_CONFIG_KEYS = new Set([
    'RECYCLE_DAYS',
    'CLAIM_LIMIT',
    'RECLAIM_HIGH', 'WARN_HIGH',
    'RECLAIM_MEDIUM', 'WARN_MEDIUM',
    'RECLAIM_LOW', 'WARN_LOW',
    'XP_CALL_ATTEMPT',
    'XP_MAIL_ATTEMPT',
    'XP_TASK_COMPLETED',
    'XP_LEAD_CONVERTED',
    'XP_OPPORTUNITY_WON',
    'XP_POOL_CLAIM',
    'XP_LEAD_CREATED',
    'XP_TASK_CREATED',
])

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await prisma.systemSetting.findMany()
    const settingsMap = settings.reduce((acc: Record<string, string>, s: { key: string, value: string }) => ({ ...acc, [s.key]: s.value }), {})

    return NextResponse.json({ settings: settingsMap })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { key, value } = await req.json()

        if (!key || !ALLOWED_CONFIG_KEYS.has(key)) {
            return NextResponse.json({ error: 'Invalid configuration key' }, { status: 400 })
        }

        const setting = await prisma.systemSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) }
        })

        return NextResponse.json(setting)
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
