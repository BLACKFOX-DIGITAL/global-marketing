import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

        const setting = await prisma.systemSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) }
        })

        return NextResponse.json(setting)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
