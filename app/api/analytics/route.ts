import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isManager } from '@/lib/auth'
import { startOfDay, subDays, format } from 'date-fns'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const elevated = isManager(user)

    // Non-managers only see their own data
    const ownerFilter = elevated ? {} : { ownerId: user.userId }

    const [totalLeads, opportunities, wonOpportunities] = await Promise.all([
        prisma.lead.count({ where: { isDeleted: false, ...ownerFilter } }),
        prisma.opportunity.count({ where: { isDeleted: false, ...ownerFilter } }),
        prisma.opportunity.count({ where: { stage: 'Closed Won', isDeleted: false, ...ownerFilter } }),
    ])

    const funnelData = [
        { name: 'Leads generated', value: totalLeads || 1 },
        { name: 'Opportunities created', value: opportunities },
        { name: 'Deals Won', value: wonOpportunities }
    ]
    if (totalLeads === 0) funnelData[0].value = 0

    const thirtyDaysAgo = subDays(startOfDay(new Date()), 30)

    const recentWins = await prisma.opportunity.findMany({
        where: {
            stage: 'Closed Won',
            isDeleted: false,
            updatedAt: { gte: thirtyDaysAgo },
            ...ownerFilter,
        },
        select: { updatedAt: true }
    })

    const performanceMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
        const d = subDays(new Date(), i)
        performanceMap.set(format(d, 'MMM dd'), 0)
    }

    recentWins.forEach(win => {
        const dateStr = format(win.updatedAt, 'MMM dd')
        if (performanceMap.has(dateStr)) {
            performanceMap.set(dateStr, performanceMap.get(dateStr)! + 1)
        }
    })

    const performanceData = Array.from(performanceMap.entries()).map(([date, count]) => ({
        date,
        deals: count
    }))

    // Activity heatmap is always scoped to the current user
    const ninetyDaysAgo = subDays(startOfDay(new Date()), 90)
    const activities = await prisma.activityLog.findMany({
        where: {
            userId: user.userId,
            createdAt: { gte: ninetyDaysAgo }
        },
        select: { createdAt: true }
    })

    const heatmapMap = new Map<string, number>()
    activities.forEach(act => {
        const dateStr = format(act.createdAt, 'yyyy-MM-dd')
        heatmapMap.set(dateStr, (heatmapMap.get(dateStr) || 0) + 1)
    })

    const heatmapData = Array.from(heatmapMap.entries()).map(([date, count]) => ({ date, count }))

    const res = NextResponse.json({
        funnel: funnelData,
        performance: performanceData,
        heatmap: heatmapData
    })
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
    return res
}
