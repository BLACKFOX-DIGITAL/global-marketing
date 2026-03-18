import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { awardXP } from '@/lib/gamification'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    try {
        const task = await prisma.task.findUnique({ where: { id } })
        if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (user.role !== 'Administrator' && task.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const updated = await prisma.task.update({
            where: { id },
            data: {
                completed: !task.completed,
                completedAt: !task.completed ? new Date() : null,
                status: !task.completed ? 'Completed' : 'Pending',
            },
        })

        if (updated.leadId) {
            await prisma.lead.update({
                where: { id: updated.leadId },
                data: { lastActivityAt: new Date() }
            })
        }

        // Award XP when completing (not when un-completing)
        let gamification = null
        if (updated.completed) {
            const isOnTime = task.dueDate ? new Date() <= task.dueDate : false
            const xpAction: keyof Awaited<ReturnType<typeof import('@/lib/gamification').getXPValues>> = isOnTime ? 'TASK_ON_TIME_BONUS' : 'TASK_COMPLETED'
            gamification = await awardXP(user.userId, xpAction)
        }

        return NextResponse.json({ ...updated, gamification })
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
}
