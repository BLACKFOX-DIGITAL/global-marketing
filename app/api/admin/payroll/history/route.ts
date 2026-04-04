import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateMonthlySalary } from '@/lib/payroll'
import { subMonths, startOfMonth, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const months = parseInt(searchParams.get('months') || '6')

    try {
        const users = await prisma.user.findMany({
            where: { role: { not: 'Administrator' }, isSuspended: false },
            select: { id: true }
        })

        const now = new Date()
        const history = []

        for (let i = months - 1; i >= 0; i--) {
            const date = startOfMonth(subMonths(now, i))
            const reports = await Promise.all(users.map(u => calculateMonthlySalary(u.id, date)))
            const totalNet = reports.reduce((s, r) => s + r.finalSalary, 0)
            const totalBase = reports.reduce((s, r) => s + r.baseSalary, 0)
            const totalDeducted = totalBase - totalNet
            history.push({
                month: format(date, 'MMM yy'),
                totalNet: Math.round(totalNet),
                totalBase: Math.round(totalBase),
                totalDeducted: Math.round(totalDeducted)
            })
        }

        return NextResponse.json({ history })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
