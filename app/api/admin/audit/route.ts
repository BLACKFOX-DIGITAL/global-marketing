import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30') || 30))
    const action = searchParams.get('action') || ''
    const userId = searchParams.get('userId') || ''
    const search = searchParams.get('search') || ''
    const period = searchParams.get('period') || ''
    const skip = (page - 1) * limit

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let dateFilter: Prisma.DateTimeFilter | undefined = undefined
    if (period === 'today') dateFilter = { gte: todayStart }
    else if (period === 'week') { const d = new Date(todayStart); d.setDate(d.getDate() - 6); dateFilter = { gte: d } }
    else if (period === 'month') { const d = new Date(now.getFullYear(), now.getMonth(), 1); dateFilter = { gte: d } }

    const where: Prisma.ActivityLogWhereInput = {}
    if (action) where.action = action
    if (userId) where.userId = userId
    if (dateFilter) where.createdAt = dateFilter
    if (search) {
        where.OR = [
            { description: { contains: search } },
            { lead: { company: { contains: search } } },
            { user: { name: { contains: search } } },
        ]
    }

    const sevenDaysAgo = new Date(todayStart)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const [logs, total, actionTypes, allUsers, totalToday, recentLogs, userGroups] = await Promise.all([
        prisma.activityLog.findMany({
            where,
            include: {
                user: { select: { name: true, email: true } },
                lead: { select: { company: true, website: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.activityLog.count({ where }),
        prisma.activityLog.groupBy({
            by: ['action'],
            _count: true,
            orderBy: { _count: { action: 'desc' } },
        }),
        prisma.user.findMany({
            where: { isSuspended: false },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.activityLog.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.activityLog.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: { createdAt: true },
        }),
        prisma.activityLog.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: sevenDaysAgo } },
            _count: true,
        }),
    ])

    // Build 7-day trend
    const trendMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart)
        d.setDate(d.getDate() - i)
        trendMap[format(d, 'MMM dd')] = 0
    }
    recentLogs.forEach(log => {
        const key = format(log.createdAt, 'MMM dd')
        if (key in trendMap) trendMap[key]++
    })
    const trendData = Object.entries(trendMap).map(([date, count]) => ({ date, count }))

    const topAction = actionTypes[0]?.action || '—'
    const uniqueActiveUsers = userGroups.length

    return NextResponse.json({
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        actionTypes,
        allUsers,
        stats: { totalToday, uniqueActiveUsers, topAction },
        trendData,
    })
}
