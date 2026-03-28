import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getGamificationProfile } from '@/lib/gamification'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const filter = { ownerId: user.userId }

    const [
        totalLeads,
        tasksDueToday,
        closedWon,
        recentLeads,
        todaysTasks,
        pipelineByStage,
        overdueTasks,
        upcomingTasks,
        goalList,
        wonOpportunities,
        testJobsEntered,
        gamification,
        holidays,
        poolCount,
    ] = await Promise.all([
        prisma.lead.count({ where: { ...filter, isDeleted: false } }),
        prisma.task.count({ where: { ...filter, dueDate: { gte: startOfDay, lt: endOfDay }, completed: false } }),
        prisma.opportunity.count({ where: { ...filter, stage: 'Closed Won', updatedAt: { gte: startOfMonth } } }),
        prisma.lead.findMany({
            where: { ...filter, isDeleted: false },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                company: true,
                status: true,
                createdAt: true,
                phone: true,
                email: true,
                mailCount: true,
                callCount: true
            }
        }),
        prisma.task.findMany({
            where: { ...filter, dueDate: { gte: startOfDay, lt: endOfDay } },
            orderBy: [{ completed: 'asc' }, { priority: 'desc' }],
            take: 5,
        }),
        prisma.opportunity.groupBy({ by: ['stage'], where: filter, _count: true }),
        prisma.task.count({ where: { ...filter, completed: false, dueDate: { lt: now } } }),
        prisma.task.findMany({
            where: { ...filter, dueDate: { gte: now }, completed: false },
            orderBy: { dueDate: 'asc' },
            take: 7,
        }),
        prisma.userGoal.findMany({ where: { userId: user.userId, period: monthStr } }),
        prisma.opportunity.count({ where: { ownerId: user.userId, stage: 'Closed Won', updatedAt: { gte: startOfMonth } } }),
        prisma.stageHistory.count({ where: { stage: 'Test Job Received', createdAt: { gte: startOfMonth }, opportunity: { ownerId: user.userId } } }),
        getGamificationProfile(user.userId).catch(() => null),
        prisma.holiday.findMany({ where: { date: { gte: startOfDay } }, orderBy: { date: 'asc' }, take: 5 }),
        prisma.lead.count({ where: { ownerId: null, isDeleted: false } }),
    ])

    const response = NextResponse.json({
        stats: { totalLeads, tasksDueToday, closedWon, overdueTasks, poolCount },
        recentLeads,
        todaysTasks,
        pipelineByStage,
        upcomingTasks,
        goals: {
            goals: goalList,
            progress: { DEALS: wonOpportunities, TEST_JOBS: testJobsEntered, LEADS: testJobsEntered },
        },
        gamification,
        holidays,
    })

    response.headers.set('Cache-Control', 'private, max-age=0, stale-while-revalidate=30')
    return response
}
