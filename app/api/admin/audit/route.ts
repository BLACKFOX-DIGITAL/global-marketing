import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
    const action = searchParams.get('action') || ''
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (action) {
        where.action = action
    }

    const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
            where,
            include: { 
                user: { select: { name: true, email: true } },
                lead: { select: { company: true, website: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.activityLog.count({ where }),
    ])

    const actionTypes = await prisma.activityLog.groupBy({
        by: ['action'],
        _count: true,
    })

    return NextResponse.json({
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        actionTypes
    })
}
