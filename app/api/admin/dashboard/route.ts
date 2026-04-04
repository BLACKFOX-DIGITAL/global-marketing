import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { format, startOfDay, endOfDay, subDays, startOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date()
    const startOfThisMonth = startOfMonth(now)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const fourteenDaysAgo = subDays(now, 13)
    const thirtyDaysAgo = subDays(now, 30)
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [
        totalUsers,
        totalLeads,
        totalOpportunities,
        stageGroups,
        recentLeads,
        goals,
        actualWon,
        actualLeads,
        actualTestJobs,
        repsData,
        lastMonthDeals,
        lastMonthPipeline,
        lastMonthLeads,
        poolCount,
        overdueTasks,
        pendingLeave,
        staleLeads,
        trendLeads,
        trendOpps,
    ] = await Promise.all([
        prisma.user.count({ where: { role: { not: 'Administrator' }, isSuspended: false } }),
        prisma.lead.count({ where: { isDeleted: false } }),
        prisma.opportunity.count({ where: { isDeleted: false } }),
        prisma.opportunity.groupBy({ by: ['stage'], where: { isDeleted: false }, _count: true }),
        prisma.lead.findMany({
            where: { isDeleted: false },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, company: true, status: true, createdAt: true, owner: { select: { name: true } } }
        }),
        prisma.userGoal.findMany({ where: { period: monthStr } }),
        prisma.opportunity.count({ where: { stage: 'Closed Won', updatedAt: { gte: startOfThisMonth } } }),
        prisma.lead.count({ where: { createdAt: { gte: startOfThisMonth }, isDeleted: false } }),
        prisma.opportunity.count({ where: { stage: 'Test Job Received', isDeleted: false, createdAt: { gte: startOfThisMonth } } }),
        prisma.user.findMany({
            where: { role: { not: 'Administrator' }, isSuspended: false },
            select: {
                id: true,
                name: true,
                xp: true,
                level: true,
                currentStreak: true,
                _count: {
                    select: {
                        leads: { where: { isDeleted: false } },
                        tasks: { where: { completed: true, completedAt: { gte: startOfThisMonth } } },
                    }
                },
                opportunities: {
                    where: { stage: 'Closed Won', updatedAt: { gte: startOfThisMonth } },
                    select: { id: true }
                }
            }
        }),
        prisma.opportunity.count({ where: { stage: 'Closed Won', updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
        prisma.opportunity.count({ where: { createdAt: { lte: endOfLastMonth }, isDeleted: false } }),
        prisma.lead.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, isDeleted: false } }),
        prisma.lead.count({ where: { ownerId: null, isDeleted: false } }),
        prisma.task.count({ where: { completed: false, dueDate: { lt: now } } }),
        prisma.leaveRequest.count({ where: { status: 'Pending' } }),
        // Stale leads: assigned, not deleted, no activity in 30 days
        prisma.lead.count({ where: { ownerId: { not: null }, isDeleted: false, lastActivityAt: { lt: thirtyDaysAgo } } }),
        prisma.lead.findMany({
            where: { createdAt: { gte: fourteenDaysAgo }, isDeleted: false },
            select: { createdAt: true }
        }),
        prisma.opportunity.findMany({
            where: { updatedAt: { gte: fourteenDaysAgo }, stage: 'Closed Won' },
            select: { updatedAt: true }
        }),
    ])

    // Build daily trends array (14 days)
    const dailyTrends = []
    for (let i = 0; i < 14; i++) {
        const day = subDays(now, 13 - i)
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        dailyTrends.push({
            date: format(day, 'MMM dd'),
            leads: trendLeads.filter(l => l.createdAt >= dayStart && l.createdAt <= dayEnd).length,
            closed: trendOpps.filter(o => o.updatedAt >= dayStart && o.updatedAt <= dayEnd).length,
        })
    }

    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    const stageBreakdown = stageGroups.reduce((acc: Record<string, number>, g) => {
        acc[g.stage] = g._count
        return acc
    }, {})

    const trends = {
        deals: calculateTrend(actualWon, lastMonthDeals),
        pipeline: calculateTrend(totalOpportunities, lastMonthPipeline),
        leads: calculateTrend(actualLeads, lastMonthLeads),
    }

    const globalGoals = {
        DEALS: { target: goals.filter(g => g.category === 'DEALS').reduce((s, g) => s + g.targetValue, 0), actual: actualWon },
        LEADS: { target: goals.filter(g => g.category === 'LEADS').reduce((s, g) => s + g.targetValue, 0), actual: actualLeads },
        TEST_JOBS: { target: goals.filter(g => g.category === 'TEST_JOBS').reduce((s, g) => s + g.targetValue, 0), actual: actualTestJobs },
    }

    const leaderboard = repsData.map(rep => ({
        id: rep.id,
        name: rep.name,
        xp: rep.xp,
        level: rep.level,
        currentStreak: rep.currentStreak,
        closedWon: rep.opportunities.length,
        leadsAssigned: rep._count.leads,
        tasksCompleted: rep._count.tasks,
    })).sort((a, b) => b.closedWon - a.closedWon)

    return NextResponse.json({
        totalUsers,
        totalLeads,
        totalOpportunities,
        stageBreakdown,
        recentLeads,
        globalGoals,
        leaderboard,
        trends,
        dailyTrends,
        alerts: { poolCount, overdueTasks, pendingLeave, staleLeads },
    })
}
