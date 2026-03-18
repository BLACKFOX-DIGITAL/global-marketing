import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalUsers, totalLeads, totalOpportunities, opportunities] = await Promise.all([
        prisma.user.count({ where: { role: { not: 'Administrator' } } }),
        prisma.lead.count(),
        prisma.opportunity.count(),
        prisma.opportunity.findMany({ select: { stage: true } })
    ])

    // Group opportunities by stage
    const stageBreakdown = opportunities.reduce((acc: Record<string, number>, opp: { stage: string | null }) => {
        acc[opp.stage!] = (acc[opp.stage!] || 0) + 1
        return acc
    }, {})

    // Get recently added leads
    const [recentLeads, goals] = await Promise.all([
        prisma.lead.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { owner: { select: { name: true } } }
        }),
        prisma.userGoal.findMany({
            where: { period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` }
        })
    ])

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const [actualWon, actualLeads, actualTasks, repsData] = await Promise.all([
        prisma.opportunity.count({ where: { stage: 'Closed Won', updatedAt: { gte: startOfMonth } } }),
        prisma.lead.count({ where: { createdAt: { gte: startOfMonth }, isDeleted: false } }),
        prisma.task.count({ where: { completed: true, completedAt: { gte: startOfMonth } } }),
        prisma.user.findMany({
            where: { role: { not: 'Administrator' } },
            select: {
                id: true,
                name: true,
                opportunities: { select: { stage: true } },
                _count: {
                    select: {
                        leads: { where: { createdAt: { gte: startOfMonth } } },
                        tasks: { where: { completed: true, completedAt: { gte: startOfMonth } } }
                    }
                }
            }
        })
    ])

    const [lastMonthDeals, lastMonthPipeline, lastMonthLeads] = await Promise.all([
        prisma.opportunity.count({ where: { stage: 'Closed Won', updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
        prisma.opportunity.count({ where: { createdAt: { lte: endOfLastMonth } } }),
        prisma.lead.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, isDeleted: false } })
    ])

    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(1));
    }

    const trends = {
        deals: calculateTrend(actualWon, lastMonthDeals),
        pipeline: calculateTrend(totalOpportunities, lastMonthPipeline),
        leads: calculateTrend(actualLeads, lastMonthLeads)
    }

    const globalGoals = {
        DEALS: { target: goals.filter((g: { category: string }) => g.category === 'DEALS').reduce((s: number, g: { targetValue: number }) => s + g.targetValue, 0), actual: actualWon },
        LEADS: { target: goals.filter((g: { category: string }) => g.category === 'LEADS').reduce((s: number, g: { targetValue: number }) => s + g.targetValue, 0), actual: actualLeads },
        TASKS: { target: goals.filter((g: { category: string }) => g.category === 'TASKS').reduce((s: number, g: { targetValue: number }) => s + g.targetValue, 0), actual: actualTasks }
    }

    const leaderboard = repsData.map((rep: any) => {
        const wonDeals = rep.opportunities.filter((a: any) => a.stage === 'Closed Won').length
        return {
            id: rep.id,
            name: rep.name,
            closedWon: wonDeals,
            leadsAssigned: rep._count.leads,
            tasksCompleted: rep._count.tasks
        }
    }).sort((a: any, b: any) => b.closedWon - a.closedWon).slice(0, 5)

    return NextResponse.json({
        totalUsers,
        totalLeads,
        totalOpportunities,
        stageBreakdown,
        recentLeads,
        globalGoals,
        leaderboard,
        trends
    })
}
