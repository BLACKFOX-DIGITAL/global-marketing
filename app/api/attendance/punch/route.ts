import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await prisma.$transaction(async (tx) => {
        // Find ALL open attendance records for this user across all time
        const openRecords = await tx.attendanceRecord.findMany({
            where: { userId: user.userId, punchOut: null },
            orderBy: { punchIn: 'desc' },
        })

        if (openRecords.length > 0) {
            // Close all of them
            const now = new Date()
            const updatedRecords = await Promise.all(openRecords.map(async (record) => {
                const start = new Date(record.punchIn).getTime()
                const durationMinutes = Math.max(0, Math.round((now.getTime() - start) / 60000))
                
                return tx.attendanceRecord.update({
                    where: { id: record.id },
                    data: { punchOut: now, duration: durationMinutes },
                })
            }))
            
            // Return information about the main session we closed
            return { action: 'punch_out', recordsClosed: openRecords.length, record: updatedRecords[0] }
        } else {
            // Start a new session
            const record = await tx.attendanceRecord.create({
                data: { userId: user.userId },
            })
            return { action: 'punch_in', record }
        }
    })


    return NextResponse.json(result)
}
