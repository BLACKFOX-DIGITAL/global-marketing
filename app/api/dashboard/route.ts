import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const isTeamView = user.role === 'Administrator' || user.role === 'Manager'
    const filter = isTeamView ? {} : { ownerId: user.userId }

    const [
        totalLeads,
        tasksDueToday,
        closedWon,
        recentLeads,
        todaysTasks,
        pipelineByStage,
        overdueTasks,
        upcomingTasks,
    ] = await Promise.all([
        prisma.lead.count({ where: { ...filter, isDeleted: false } }),
        prisma.task.count({ where: { ...filter, dueDate: { gte: startOfDay, lt: endOfDay }, completed: false } }),
        prisma.opportunity.count({ where: { ...filter, stage: 'Closed Won', updatedAt: { gte: startOfMonth } } }),
        prisma.lead.findMany({
            where: { ...filter, isDeleted: false },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { owner: { select: { id: true, name: true } } },
        }),
        prisma.task.findMany({
            where: { ...filter, dueDate: { gte: startOfDay, lt: endOfDay } },
            orderBy: [{ completed: 'asc' }, { priority: 'desc' }],
            take: 5,
        }),
        prisma.opportunity.groupBy({
            by: ['stage'],
            where: filter,
            _count: true,
        }),
        prisma.task.count({ where: { ...filter, completed: false, dueDate: { lt: now } } }),
        prisma.task.findMany({
            where: { ...filter, dueDate: { gte: now }, completed: false },
            orderBy: { dueDate: 'asc' },
            take: 7,
        }),
    ])

    return NextResponse.json({
        stats: {
            totalLeads,
            tasksDueToday,
            closedWon,
            overdueTasks,
        },
        recentLeads,
        todaysTasks,
        pipelineByStage,
        upcomingTasks,
    })
}
