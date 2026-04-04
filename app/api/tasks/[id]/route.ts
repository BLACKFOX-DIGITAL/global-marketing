import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const task = await prisma.task.findUnique({ where: { id }, include: { owner: { select: { id: true, name: true, email: true } } } })
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (user.role !== 'Administrator' && task.ownerId !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(task)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await req.json()
    if (body.title !== undefined && !body.title.trim()) {
        return NextResponse.json({ error: 'Task title cannot be empty' }, { status: 400 })
    }
    try {
        const currentTask = await prisma.task.findUnique({ where: { id } })
        if (!currentTask) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (user.role !== 'Administrator' && currentTask.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const task = await prisma.task.update({
            where: { id },
            data: {
                title: body.title,
                description: body.description,
                priority: body.priority,
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                recurrence: body.recurrence,
                // Only admins can reassign tasks to a different owner
                ownerId: user.role === 'Administrator' ? body.ownerId : undefined,
            },
            include: { owner: { select: { id: true, name: true, email: true } } },
        })
        return NextResponse.json(task)
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    try {
        const task = await prisma.task.findUnique({ where: { id } })
        if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (user.role !== 'Administrator' && task.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.task.delete({ where: { id } })

        await logActivity({
            userId: user.userId,
            type: 'TASK',
            action: 'DELETED',
            description: `Task deleted: ${task.title}`,
            leadId: task.leadId ?? undefined,
        })

        return NextResponse.json({ message: 'Deleted' })
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
