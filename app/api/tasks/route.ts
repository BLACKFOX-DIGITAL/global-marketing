import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { awardXP } from '@/lib/gamification'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const leadId = searchParams.get('leadId') || ''

    const where: any = {}
    
    if (user.role !== 'Administrator' && user.role !== 'Manager') {
        where.ownerId = user.userId
    }

    if (status === 'Pending') {
        where.completed = false
    } else if (status === 'Completed') {
        where.completed = true
        // Show completed tasks from the last 7 days on the Completed tab
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        where.OR = [{ completedAt: { gte: sevenDaysAgo } }, { completedAt: null }]
    } else if (status === 'Overdue') {
        where.completed = false
        where.dueDate = { lt: new Date() }
    } else {
        // "All" tab: hide completed tasks older than 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        where.OR = [
            { completed: false },
            { completedAt: { gte: sevenDaysAgo } },
            { completedAt: null },
        ]
    }
    if (priority && priority !== 'All Priority') {
        where.priority = priority
    }
    if (leadId) where.leadId = leadId

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const [tasks, total, countsData] = await Promise.all([
        prisma.task.findMany({
            where,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                lead: { select: { id: true, name: true, company: true } },
            },
            orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
            skip,
            take: limit
        }),
        prisma.task.count({ where }),
        // Get counts for all tabs in one go
        prisma.task.groupBy({
            by: ['completed'],
            where: user.role !== 'Administrator' && user.role !== 'Manager' ? { ownerId: user.userId } : {},
            _count: true
        })
    ])

    // Get overdue count specifically
    const overdueCount = await prisma.task.count({
        where: {
            ...(user.role !== 'Administrator' && user.role !== 'Manager' ? { ownerId: user.userId } : {}),
            completed: false,
            dueDate: { lt: new Date() }
        }
    })

    const counts = {
        All: countsData.reduce((acc, c) => acc + c._count, 0),
        Pending: countsData.find(c => !c.completed)?._count || 0,
        Completed: countsData.find(c => c.completed)?._count || 0,
        Overdue: overdueCount
    }

    return NextResponse.json({
        tasks,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        },
        counts
    })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()

        if (!body.leadId) {
            return NextResponse.json({ error: 'leadId is required. Every task must be linked to a lead.' }, { status: 400 })
        }

        const task = await prisma.task.create({
            data: {
                title: body.title,
                description: body.description,
                taskType: body.taskType || 'Follow-up',
                priority: body.priority || 'Medium',
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                recurrence: body.recurrence || 'None',
                ownerId: body.ownerId || user.userId,
                leadId: body.leadId,
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                lead: { select: { id: true, name: true, company: true } },
            },
        })

        await prisma.lead.update({
            where: { id: body.leadId },
            data: { lastActivityAt: new Date() }
        })

        const gamificationResult = await awardXP(user.userId, 'TASK_CREATED', 'TASK_CREATED', task.id)

        return NextResponse.json({ ...task, gamificationResult }, { status: 201 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }
}
