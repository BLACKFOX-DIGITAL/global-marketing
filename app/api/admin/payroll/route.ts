import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateMonthlySalary } from '@/lib/payroll'
import { parseISO } from 'date-fns'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date') || new Date().toISOString()
    const date = parseISO(dateStr)

    try {
        const users = await prisma.user.findMany({
            where: { role: { not: 'Administrator' } }, // Usually admin salary is handled differently or not at all in this logic
            select: { id: true }
        })

        const reports = await Promise.all(
            users.map(u => calculateMonthlySalary(u.id, date))
        )

        return NextResponse.json({ reports })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
