import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if there's an open record
    const openRecord = await prisma.attendanceRecord.findFirst({
        where: { userId: user.userId, punchOut: null },
        orderBy: { punchIn: 'desc' },
    })

    if (openRecord) {
        // Punch out
        const now = new Date()
        const durationMinutes = Math.round((now.getTime() - new Date(openRecord.punchIn).getTime()) / 60000)
        const updated = await prisma.attendanceRecord.update({
            where: { id: openRecord.id },
            data: { punchOut: now, duration: durationMinutes },
        })
        return NextResponse.json({ action: 'punch_out', record: updated })
    } else {
        // Punch in
        const record = await prisma.attendanceRecord.create({
            data: { userId: user.userId },
        })
        return NextResponse.json({ action: 'punch_in', record })
    }
}
