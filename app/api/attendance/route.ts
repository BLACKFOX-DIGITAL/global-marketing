export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'today'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const now = new Date()
    let since: Date

    if (period === 'custom' && from) {
        since = startOfDay(new Date(from))
    } else {
        switch (period) {
            case 'week': since = startOfWeek(now, { weekStartsOn: 1 }); break
            case 'month': since = startOfMonth(now); break
            default: since = startOfDay(now); break
        }
    }

    const where: any = {
        userId: user.userId,
        punchIn: { gte: since },
    }

    if (period === 'custom' && to) {
        const toDate = new Date(to)
        toDate.setDate(toDate.getDate() + 1)
        where.punchIn = { ...where.punchIn, lt: toDate }
    }

    const [records, total] = await Promise.all([
        prisma.attendanceRecord.findMany({
            where,
            orderBy: { punchIn: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.attendanceRecord.count({ where }),
    ])

    // Calculate total hours for the period
    const allRecords = await prisma.attendanceRecord.findMany({
        where: { userId: user.userId, punchIn: { gte: since } },
        select: { duration: true },
    })
    const totalMinutes = allRecords.reduce((sum: number, r: { duration: number | null }) => sum + (r.duration || 0), 0)

    return NextResponse.json({
        records,
        total,
        totalPages: Math.ceil(total / limit),
        page,
        totalMinutes,
    })
}
