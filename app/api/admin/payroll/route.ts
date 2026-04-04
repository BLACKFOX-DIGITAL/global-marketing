import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateMonthlySalary } from '@/lib/payroll'
import { startOfMonth, endOfMonth } from 'date-fns'

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
        const [users, holidays] = await Promise.all([
            prisma.user.findMany({
                where: { role: { not: 'Administrator' }, isSuspended: false },
                select: { id: true }
            }),
            prisma.holiday.findMany({
                where: { date: { gte: startOfMonth(date), lte: endOfMonth(date) } }
            }),
        ])

        const reports = await Promise.all(
            users.map(u => calculateMonthlySalary(u.id, date, holidays))
        )

        return NextResponse.json({ reports })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
