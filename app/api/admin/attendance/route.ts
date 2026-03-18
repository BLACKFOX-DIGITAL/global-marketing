import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date') // Expected YYYY-MM-DD

    let where = {}
    if (dateStr) {
        const targetDate = parseISO(dateStr)
        where = {
            punchIn: {
                gte: startOfDay(targetDate),
                lte: endOfDay(targetDate)
            }
        }
    }

    const records = await prisma.attendanceRecord.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: [{ punchIn: 'desc' }]
    })

    return NextResponse.json({ records })
}
