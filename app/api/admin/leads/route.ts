import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { leads, assignTo } = body

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        }

        for (const lead of leads) {
            try {
                if (!lead.name || !lead.name.trim()) {
                    results.failed++
                    results.errors.push(`Lead missing name, skipped`)
                    continue
                }

                await prisma.lead.create({
                    data: {
                        name: lead.name.trim(),
                        company: lead.company?.trim() || null,
                        email: lead.email?.trim() || null,
                        phone: lead.phone?.trim() || null,
                        website: lead.website?.trim() || null,
                        country: lead.country?.trim() || null,
                        status: lead.status?.trim() || 'New',
                        notes: lead.notes?.trim() || null,
                        industry: lead.industry?.trim() || null,
                        ownerId: assignTo || null,
                        isClaimedFromPool: assignTo ? false : true,
                    }
                })
                results.success++
            } catch (err) {
                results.failed++
                results.errors.push(`Failed to import "${lead.name}": ${err}`)
            }
        }

        return NextResponse.json(results)
    } catch (err) {
        console.error('Lead Import Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const countryFilter = searchParams.get('country') || ''
    const statusFilter = searchParams.get('status') || ''
    const ownerFilter = searchParams.get('ownerId') || ''
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'))
    const skip = (page - 1) * limit
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = { isDeleted: false }
    
    // Search filter
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { email: { contains: search } },
            { company: { contains: search } },
            { phone: { contains: search } },
        ]
    }

    // Explicit filters
    if (countryFilter) where.country = countryFilter
    if (statusFilter) where.status = statusFilter
    if (ownerFilter) where.ownerId = ownerFilter === 'pool' ? null : ownerFilter

    // Map frontend field names to prisma model fields if necessary
    const validSortFields = ['name', 'company', 'status', 'updatedAt', 'owner', 'country']
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'updatedAt'
    const finalSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

    const orderBy: any = {}
    if (finalSortBy === 'owner') {
        orderBy.owner = { name: finalSortOrder }
    } else {
        orderBy[finalSortBy] = finalSortOrder
    }

    const [leads, total, salesReps, countries] = await Promise.all([
        prisma.lead.findMany({
            where,
            include: { 
                owner: { select: { id: true, name: true } }
            },
            orderBy,
            skip,
            take: limit,
        }),
        prisma.lead.count({ where }),
        prisma.user.findMany({
            where: { role: 'SalesRep' },
            select: { id: true, name: true }
        }),
        prisma.lead.findMany({
            where: { country: { not: null }, isDeleted: false },
            select: { country: true },
            distinct: ['country']
        })
    ])

    return NextResponse.json({
        leads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        salesReps,
        countries: countries.map(c => c.country)
    })
}
