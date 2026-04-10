import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit
    // Default to 'Open Pool' — only show leads that are actively pooled.
    // Without this, edge-case leads with ownerId: null but wrong statuses could leak in.
    const where: Prisma.LeadWhereInput = {
        ownerId: null,
        isDeleted: false,
        status: status || 'Open Pool',
    }

    if (search) {
        where.OR = [
            { name: { contains: search } },
            { company: { contains: search } },
            { email: { contains: search } },
        ]
    }

    const [leads, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            select: {
                id: true,
                name: true,
                company: true,
                email: true,
                website: true,
                industry: true,
                status: true,
                lastActivityAt: true,
            },
            orderBy: { lastActivityAt: 'asc' },
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
