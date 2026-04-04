import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sanitize } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/.+/

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { leads, assignTo } = body

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
        }

        if (leads.length > 1000) {
            return NextResponse.json({ error: 'Maximum 1000 leads per import' }, { status: 400 })
        }

        // Validate assignTo user if provided
        if (assignTo) {
            const ownerExists = await prisma.user.findUnique({ where: { id: assignTo }, select: { id: true, role: true, isSuspended: true } })
            if (!ownerExists) {
                return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 })
            }
            if (ownerExists.role === 'Administrator') {
                return NextResponse.json({ error: 'Cannot assign leads to an Administrator' }, { status: 400 })
            }
            if (ownerExists.isSuspended) {
                return NextResponse.json({ error: 'Cannot assign leads to a suspended user' }, { status: 400 })
            }
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

                if (lead.email && !EMAIL_RE.test(lead.email)) {
                    results.failed++
                    results.errors.push(`Invalid email for "${lead.name}", skipped`)
                    continue
                }

                if (lead.website && !URL_RE.test(lead.website)) {
                    results.failed++
                    results.errors.push(`Invalid website URL for "${lead.name}", skipped`)
                    continue
                }

                await prisma.lead.create({
                    data: {
                        name: sanitize(lead.name.trim()),
                        company: lead.company ? sanitize(lead.company.trim()) : null,
                        email: lead.email ? sanitize(lead.email.trim()) : null,
                        phone: lead.phone ? sanitize(lead.phone.trim()) : null,
                        website: lead.website ? sanitize(lead.website.trim()) : null,
                        country: lead.country ? sanitize(lead.country.trim()) : null,
                        status: lead.status?.trim() || 'New',
                        notes: lead.notes ? sanitize(lead.notes.trim()) : null,
                        industry: lead.industry ? sanitize(lead.industry.trim()) : null,
                        ownerId: assignTo || null,
                        isClaimedFromPool: assignTo ? false : true,
                    }
                })
                results.success++
            } catch (err) {
                results.failed++
                results.errors.push(`Failed to import "${lead.name}": Internal error`)
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
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const countryFilter = searchParams.get('country') || ''
    const statusFilter = searchParams.get('status') || ''
    const ownerFilter = searchParams.get('ownerId') || ''

    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const skip = (page - 1) * limit
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = { isDeleted: false }

    if (search) {
        where.OR = [
            { name: { contains: search } },
            { email: { contains: search } },
            { company: { contains: search } },
            { phone: { contains: search } },
        ]
    }

    if (countryFilter) where.country = countryFilter
    if (statusFilter) where.status = statusFilter
    if (ownerFilter) where.ownerId = ownerFilter === 'pool' ? null : ownerFilter

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
            include: { owner: { select: { id: true, name: true } } },
            orderBy,
            skip,
            take: limit,
        }),
        prisma.lead.count({ where }),
        prisma.user.findMany({
            where: { isSuspended: false, role: { not: 'Administrator' } },
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
