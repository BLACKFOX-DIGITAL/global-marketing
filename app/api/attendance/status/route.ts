export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find an open attendance record (punched in but not out)
    const openRecord = await prisma.attendanceRecord.findFirst({
        where: { userId: user.userId, punchOut: null },
        orderBy: { punchIn: 'desc' },
    })

    const elapsedSeconds = openRecord
        ? Math.max(0, Math.floor((Date.now() - new Date(openRecord.punchIn).getTime()) / 1000))
        : 0

    return NextResponse.json({ punchedIn: !!openRecord, record: openRecord, elapsedSeconds })
}
