import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit
    const where: any = { ownerId: null, isDeleted: false }

    if (search) {
        where.OR = [
            { name: { contains: search } },
            { company: { contains: search } },
            { email: { contains: search } },
        ]
    }

    if (status) {
        where.status = status
    }

    const [leads, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            include: {
                // Include whatever is useful
                owner: { select: { name: true } }
            },
            orderBy: { lastActivityAt: 'asc' }, // The ones waiting the longest
            skip,
            take: limit,
        }),
        prisma.lead.count({ where }),
    ])

    return NextResponse.json({
        leads,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    })
}
