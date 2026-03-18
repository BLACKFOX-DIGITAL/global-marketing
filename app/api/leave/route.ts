import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isManager = user.role === 'Administrator'

    const [requests, holidays] = await Promise.all([
        prisma.leaveRequest.findMany({
            where: isManager ? undefined : { userId: user.userId },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.holiday.findMany({
            where: { date: { gte: new Date() } },
            orderBy: { date: 'asc' },
            take: 5
        })
    ])

    return NextResponse.json({ requests, user: { ...user, isManager }, holidays })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const request = await prisma.leaveRequest.create({
            data: {
                userId: user.userId,
                type: body.type, // 'Sick Leave' or 'Casual Leave'
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                reason: body.reason || null,
            },
        })
        return NextResponse.json(request, { status: 201 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
    }
}
