import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { differenceInMinutes } from 'date-fns'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { punchIn, punchOut, notes } = await req.json()

    try {
        const pIn = new Date(punchIn)
        let pOut = null
        let duration = null

        if (punchOut) {
            pOut = new Date(punchOut)
            duration = differenceInMinutes(pOut, pIn)
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
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
