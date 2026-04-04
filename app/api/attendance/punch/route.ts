import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use a transaction to prevent race conditions from double-clicks or multiple tabs
    const result = await prisma.$transaction(async (tx) => {
        const openRecord = await tx.attendanceRecord.findFirst({
            where: { userId: user.userId, punchOut: null },
            orderBy: { punchIn: 'desc' },
        })

        if (openRecord) {
            const now = new Date()
            const durationMinutes = Math.round(
                (now.getTime() - new Date(openRecord.punchIn).getTime()) / 60000
            )
            const updated = await tx.attendanceRecord.update({
                where: { id: openRecord.id },
                data: { punchOut: now, duration: durationMinutes },
            })
            return { action: 'punch_out', record: updated }
        } else {
            const record = await tx.attendanceRecord.create({
                data: { userId: user.userId },
            })
            return { action: 'punch_in', record }
        }
    })

    return NextResponse.json(result)
}
