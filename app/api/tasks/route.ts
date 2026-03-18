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

    const where: Record<string, unknown> = {}
    if (status === 'Pending') where.completed = false
    else if (status === 'Completed') where.completed = true
    else if (status === 'Overdue') {
        where.completed = false
        where.dueDate = { lt: new Date() }
    }
    if (priority) where.priority = priority
    if (leadId) where.leadId = leadId

    const tasks = await prisma.task.findMany({
        where,
        include: {
            owner: { select: { id: true, name: true, email: true } },
            lead: { select: { id: true, name: true, company: true } },
        },
        orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(tasks)
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
