import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isManager } from '@/lib/auth'
import { awardXP } from '@/lib/gamification'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sanitizeObject, normalizeWebsite } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = req.nextUrl
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || ''
        const exclude = searchParams.get('exclude') || ''
        const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
        const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10') || 10))
        const skip = (page - 1) * limit

        const where: Prisma.LeadWhereInput = { isDeleted: false }

        if (!isManager(user)) {
            where.ownerId = user.userId
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { company: { contains: search } },
            ]
        }

        if (status) {
            if (status.includes(',')) {
                where.status = { in: status.split(',').filter(Boolean) }
            } else {
                where.status = status
            }
        } else if (exclude) {
            where.status = { notIn: exclude.split(',').filter(Boolean) }
        }

        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    company: true,
                    email: true,
                    phone: true,
                    website: true,
                    status: true,
                    industry: true,
                    priority: true,
                    createdAt: true,
                    owner: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.lead.count({ where }),
        ])

        return NextResponse.json({
            leads,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        })
    } catch (err) {
        logger.error('Leads GET failed', { error: String(err) })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: max 30 lead creations per minute per user
    const rl = rateLimit(`leads-create:${user.userId}`, { limit: 30, windowMs: 60_000 })
    if (!rl.allowed) {
        logger.warn('Rate limit hit on lead creation', { userId: user.userId, ip: getClientIp(req) })
        return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
    }

    try {
        const rawBody = await req.json()

        // Sanitize all free-text string fields before saving
        const body = sanitizeObject(rawBody, ['name', 'company', 'email', 'phone', 'website', 'country', 'notes', 'socials', 'industry'])

        if (!body.website) {
            return NextResponse.json({ error: 'Website is required' }, { status: 400 })
        }

        // Normalize the website to a consistent format (strip protocol, www, trailing slash)
        const normalizedWebsite = normalizeWebsite(body.website)

        // Build duplicate check conditions — match against all stored variants
        const websiteVariants = [
            normalizedWebsite,
            `http://${normalizedWebsite}`,
            `https://${normalizedWebsite}`,
            `http://www.${normalizedWebsite}`,
            `https://www.${normalizedWebsite}`,
        ]
        const orConditions: { website?: { in: string[] }, email?: string }[] = [
            { website: { in: websiteVariants } }
        ]
        if (body.email) orConditions.push({ email: body.email })

        const existingLead = await prisma.lead.findFirst({
            where: { isDeleted: false, OR: orConditions },
            include: { owner: { select: { name: true } } }
        })
        if (existingLead) {
            return NextResponse.json({ error: 'This lead already exists in the platform.' }, { status: 400 })
        }

        const lead = await prisma.lead.create({
            data: {
                name: body.company || body.name || 'Unknown',
                company: body.company,
                email: body.email,
                phone: body.phone,
                website: normalizedWebsite,
                country: body.country,
                socials: body.socials,
                status: 'New', // Always default to New for creating lead
                priority: body.priority,
                industry: body.industry,
                notes: body.notes,
                ownerId: body.ownerId || user.userId,
                contacts: body.contacts?.length > 0 ? {
                    create: body.contacts.map((c: { name: string, email: string, phone: string, position: string, socials: string }, index: number) => ({
                        name: c.name || 'Unknown Contact',
                        email: c.email,
                        phone: c.phone,
                        position: c.position,
                        socials: c.socials,
                        isPrimary: index === 0
                    }))
                } : undefined
            },
            include: { owner: { select: { id: true, name: true, email: true } }, contacts: true },
        })
        // Award XP for Manual Lead Creation
        const gamificationResult = await awardXP(user.userId, 'LEAD_CREATED', 'LEAD_CREATED', lead.id)

        return NextResponse.json({ ...lead, gamificationResult }, { status: 201 })
    } catch (err) {
        logger.error('Lead creation failed', { error: String(err), userId: user?.userId })
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }
}
