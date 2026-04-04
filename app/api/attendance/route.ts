export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'today'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const now = new Date()
    let since: Date

    if (period === 'custom' && from) {
        const parsed = new Date(from)
        since = isNaN(parsed.getTime()) ? startOfDay(now) : startOfDay(parsed)
    } else {
        switch (period) {
            case 'week': since = startOfWeek(now, { weekStartsOn: 1 }); break
            case 'month': since = startOfMonth(now); break
            default: since = startOfDay(now); break
        }
    }

    const where: Prisma.AttendanceRecordWhereInput = {
        userId: user.userId,
        punchIn: { gte: since },
    }

    if (period === 'custom' && to) {
        const toDate = new Date(to)
        if (!isNaN(toDate.getTime())) {
            toDate.setDate(toDate.getDate() + 1)
            where.punchIn = { gte: since, lt: toDate }
        }
    }

    const [records, total, durationAgg] = await Promise.all([
        prisma.attendanceRecord.findMany({
            where,
            orderBy: { punchIn: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.attendanceRecord.count({ where }),
        prisma.attendanceRecord.aggregate({
            where: { userId: user.userId, punchIn: { gte: since } },
            _sum: { duration: true },
        }),
    ])

    // Sum of completed sessions
    let totalMinutes = durationAgg._sum.duration || 0

    // Add minutes from currently active session if it started today
    const openActiveSession = await prisma.attendanceRecord.findFirst({
        where: { userId: user.userId, punchOut: null, punchIn: { gte: since } },
        orderBy: { punchIn: 'asc' }, // Pick the earliest today
    })

    if (openActiveSession) {
        const liveMinutes = Math.floor((Date.now() - new Date(openActiveSession.punchIn).getTime()) / 60000)
        totalMinutes += Math.max(0, liveMinutes)
    }


    return NextResponse.json({
        records,
        total,
        totalPages: Math.ceil(total / limit),
        page,
        totalMinutes,
    })
}
