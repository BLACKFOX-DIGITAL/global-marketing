import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Cron: Auto punch-out any sessions still open from a previous day.
 * Should run once daily at or just after midnight (UTC).
 * Sets punchOut to end of the day the session started, and calculates duration accordingly.
 */
export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return new NextResponse('Internal Server Error: CRON_SECRET not configured', { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const now = new Date()

        // Find all sessions that are still open and started before today (UTC midnight)
        const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

        const openSessions = await prisma.attendanceRecord.findMany({
            where: {
                punchOut: null,
                punchIn: { lt: startOfToday },
            },
        })

        let closedCount = 0

        for (const session of openSessions) {
            // Cap punchOut at end of the day the session started (23:59:59 UTC)
            const punchInDate = new Date(session.punchIn)
            const endOfPunchInDay = new Date(Date.UTC(
                punchInDate.getUTCFullYear(),
                punchInDate.getUTCMonth(),
                punchInDate.getUTCDate(),
                23, 59, 59
            ))

            const durationMinutes = Math.round(
                (endOfPunchInDay.getTime() - punchInDate.getTime()) / 60000
            )

            await prisma.attendanceRecord.update({
                where: { id: session.id },
                data: {
                    punchOut: endOfPunchInDay,
                    duration: durationMinutes,
                    notes: 'Auto punch-out: session was not closed by end of day.',
                },
            })

            closedCount++
        }

        logger.info('Attendance auto punch-out complete', { closedCount })

        return NextResponse.json({ success: true, closedCount })

    } catch (error) {
        logger.error('Attendance auto punch-out failed', { error: String(error) })
        return NextResponse.json({ error: 'Auto punch-out failed' }, { status: 500 })
    }
}
