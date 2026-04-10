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
            gamification = await awardXP(user.userId, 'TASK_COMPLETED', 'TASK_COMPLETED', id)
            // Bonus XP for on-time completion — isolated so a failure here doesn't
            // return a 500 to the client when the task itself was already saved successfully.
            const isOnTime = task.dueDate ? new Date() <= task.dueDate : false
            if (isOnTime) {
                try {
                    await awardXP(user.userId, 'TASK_ON_TIME_BONUS', 'TASK_ON_TIME_BONUS', id)
                } catch (bonusErr) {
                    console.error('[Gamification] TASK_ON_TIME_BONUS failed silently:', bonusErr)
                }
            }
        }

        return NextResponse.json({ ...updated, gamification })
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
