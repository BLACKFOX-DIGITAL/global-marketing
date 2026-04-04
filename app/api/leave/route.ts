import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isManager } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const canViewAll = isManager(user)

    const [requests, holidays] = await Promise.all([
        prisma.leaveRequest.findMany({
            where: canViewAll ? undefined : { userId: user.userId },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.holiday.findMany({
            where: { date: { gte: new Date() } },
            orderBy: { date: 'asc' },
            take: 5
        })
    ])

    return NextResponse.json({ requests, user: { ...user, isManager: canViewAll }, holidays })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()

        // Validate leave type against DB-configured options
        const leaveTypeSetting = await prisma.systemSetting.findMany({
            where: { key: 'LEAVE_TYPE' },
            select: { value: true }
        })
        const validTypes = leaveTypeSetting.map(s => s.value)
        if (validTypes.length > 0 && !validTypes.includes(body.type)) {
            return NextResponse.json({
                error: `Invalid leave type. Must be one of: ${validTypes.join(', ')}`
            }, { status: 400 })
        }

        const startDate = new Date(body.startDate)
        const endDate = new Date(body.endDate)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
        }
        if (endDate < startDate) {
            return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 })
        }

        const request = await prisma.leaveRequest.create({
            data: {
                userId: user.userId,
                type: body.type,
                startDate,
                endDate,
                reason: body.reason || null,
            },
        })
        return NextResponse.json(request, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
    }
}
