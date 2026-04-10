import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isManager } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = req.nextUrl
        const stage = searchParams.get('stage') || ''
        const search = searchParams.get('search') || ''

        const where: Prisma.OpportunityWhereInput = { isDeleted: false }
        if (!isManager(user)) {
            where.ownerId = user.userId
        }
        if (stage) where.stage = stage
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { company: { contains: search } },
            ]
        }

        const opportunities = await prisma.opportunity.findMany({
            where,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                lead: { select: { id: true, name: true, company: true } },
                stageHistory: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { updatedAt: 'desc' },
        })

        return NextResponse.json(opportunities)
    } catch (err) {
        console.error('API Opportunities GET Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()

        if (!body.title?.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        // Resolve stage: use provided value, else first configured stage, else error
        let stage = body.stage
        if (!stage) {
            const firstStage = await prisma.systemOption.findFirst({
                where: { category: 'OPPORTUNITY_STAGE' },
                orderBy: { order: 'asc' }
            })
            if (!firstStage) {
                return NextResponse.json(
                    { error: 'No opportunity stages configured. Ask an administrator to add stages in Settings.' },
                    { status: 400 }
                )
            }
            stage = firstStage.value
        }

        const opportunity = await prisma.opportunity.create({
            data: {
                title: body.title,
                company: body.company,
                stage,
                probability: body.probability || 20,
                closeDate: body.closeDate ? new Date(body.closeDate) : null,
                notes: body.notes,
                region: body.region,
                // Only admins can assign to a different owner
                ownerId: user.role === 'Administrator' ? (body.ownerId || user.userId) : user.userId,
                leadId: body.leadId || null,
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                lead: { select: { id: true, name: true, company: true } },
                stageHistory: true,
            },
        })

        // Create initial stage history
        await prisma.stageHistory.create({
            data: { stage: opportunity.stage, opportunityId: opportunity.id },
        })

        await logActivity({
            userId: user.userId,
            type: 'OPPORTUNITY',
            action: 'CREATED',
            description: `Created opportunity: ${opportunity.title}`,
            opportunityId: opportunity.id,
            leadId: opportunity.leadId ?? undefined
        })

        return NextResponse.json({ ...opportunity }, { status: 201 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 })
    }
}
