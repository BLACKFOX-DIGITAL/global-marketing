import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateMonthlySalary } from '@/lib/payroll'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date') || new Date().toISOString()
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    try {
        const users = await prisma.user.findMany({
            where: { role: { not: 'Administrator' }, isSuspended: false },
            select: { id: true }
        })

        const reports = await Promise.all(
            users.map(u => calculateMonthlySalary(u.id, date))
        )

        return NextResponse.json({ reports })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
