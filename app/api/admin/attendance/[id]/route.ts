import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { differenceInMinutes } from 'date-fns'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { punchIn, punchOut, notes } = await req.json()

    if (!punchIn) {
        return NextResponse.json({ error: 'Clock-in time is required' }, { status: 400 })
    }

    const pIn = new Date(punchIn)
    if (isNaN(pIn.getTime())) {
        return NextResponse.json({ error: 'Invalid clock-in time' }, { status: 400 })
    }

    let pOut: Date | null = null
    let duration: number | null = null

    if (punchOut) {
        pOut = new Date(punchOut)
        if (isNaN(pOut.getTime())) {
            return NextResponse.json({ error: 'Invalid clock-out time' }, { status: 400 })
        }
        if (pOut <= pIn) {
            return NextResponse.json({ error: 'Clock-out must be after clock-in' }, { status: 400 })
        }
        duration = differenceInMinutes(pOut, pIn)
    }

    try {
        const existing = await prisma.attendanceRecord.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 })
        }

        const updated = await prisma.attendanceRecord.update({
            where: { id },
            data: {
                punchIn: pIn,
                punchOut: pOut,
                duration,
                notes: notes ? String(notes) : null
            }
        })

        return NextResponse.json({ success: true, record: updated })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
