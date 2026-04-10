import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sanitize, normalizeWebsite } from '@/lib/sanitize'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^(https?:\/\/)?.+\..+/

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const body = await req.json()
        const { leads, assignTo } = body

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
        }

        if (leads.length > 1000) {
            return NextResponse.json({ error: 'Maximum 1000 leads per import' }, { status: 400 })
        }

        if (assignTo) {
            const ownerExists = await prisma.user.findUnique({ where: { id: assignTo }, select: { id: true, role: true, isSuspended: true } })
            if (!ownerExists) return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 })
            if (ownerExists.role === 'Administrator') return NextResponse.json({ error: 'Cannot assign leads to an Administrator' }, { status: 400 })
            if (ownerExists.isSuspended) return NextResponse.json({ error: 'Cannot assign leads to a suspended user' }, { status: 400 })
        }

        const results = { success: 0, failed: 0, errors: [] as string[] }

        for (const lead of leads) {
            try {
                if (!lead.name || !lead.name.trim()) { results.failed++; results.errors.push(`Lead missing name, skipped`); continue }
                if (lead.email && !EMAIL_RE.test(lead.email)) { results.failed++; results.errors.push(`Invalid email for "${lead.name}", skipped`); continue }
                if (lead.website && !URL_RE.test(lead.website)) { results.failed++; results.errors.push(`Invalid website URL for "${lead.name}", skipped`); continue }

                await prisma.lead.create({
                    data: {
                        name: sanitize(lead.name.trim()),
                        company: lead.company ? sanitize(lead.company.trim()) : null,
                        email: lead.email ? sanitize(lead.email.trim()) : null,
                        phone: lead.phone ? sanitize(lead.phone.trim()) : null,
                        website: lead.website ? normalizeWebsite(sanitize(lead.website.trim())) : null,
                        country: lead.country ? sanitize(lead.country.trim()) : null,
                        status: lead.status?.trim() || 'New',
                        notes: lead.notes ? sanitize(lead.notes.trim()) : null,
                        industry: lead.industry ? sanitize(lead.industry.trim()) : null,
                        ownerId: assignTo || null,
                        isClaimedFromPool: false,
                    }
                })
                results.success++
            } catch {
                results.failed++
                results.errors.push(`Failed to import "${lead.name}": Internal error`)
            }
        }

        return NextResponse.json(results)
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const countryFilter = searchParams.get('country') || ''
    const statusFilter = searchParams.get('status') || ''
    const ownerFilter = searchParams.get('ownerId') || ''
    const isExport = searchParams.get('export') === 'true'

    const EXPORT_MAX = 5000
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = isExport ? EXPORT_MAX : Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const skip = isExport ? 0 : (page - 1) * limit
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: Prisma.LeadWhereInput = { isDeleted: false }
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
    const finalSortOrder: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc'
    const orderBy: Prisma.LeadOrderByWithRelationInput = finalSortBy === 'owner'
        ? { owner: { name: finalSortOrder } }
        : { [finalSortBy]: finalSortOrder }

    // For exports: only fetch leads — skip all the stats/filter queries
    if (isExport) {
        const leads = await prisma.lead.findMany({
            where,
            include: { owner: { select: { id: true, name: true } } },
            orderBy,
            take: EXPORT_MAX,
        })
        return NextResponse.json({ leads, total: leads.length })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [leads, total, salesReps, countries, totalAll, unassigned, newThisMonth, statusBreakdown] = await Promise.all([
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
        }),
        prisma.lead.count({ where: { isDeleted: false } }),
        prisma.lead.count({ where: { isDeleted: false, ownerId: null } }),
        prisma.lead.count({ where: { isDeleted: false, createdAt: { gte: startOfMonth } } }),
        prisma.lead.groupBy({
            by: ['status'],
            where: { isDeleted: false },
            _count: true,
            orderBy: { _count: { status: 'desc' } }
        }),
    ])

    return NextResponse.json({
        leads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        salesReps,
        countries: countries.map(c => c.country),
        stats: { totalAll, unassigned, newThisMonth, statusBreakdown },
    })
}
