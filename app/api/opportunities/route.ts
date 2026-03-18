import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { awardXP } from '@/lib/gamification'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = req.nextUrl
        const stage = searchParams.get('stage') || ''
        const search = searchParams.get('search') || ''

        const where: any = {}
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
    } catch (err: any) {
        console.error('API Opportunities GET Error:', err)
        return NextResponse.json({
            error: 'Internal Server Error',
            details: err.message || String(err),
            stack: err.stack,
            hint: "Check if all relations (owner, lead, stageHistory) exist and are properly mapped."
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const opportunity = await prisma.opportunity.create({
            data: {
                title: body.title,
                company: body.company,
                stage: body.stage || 'Test Job Received',
                probability: body.probability || 20,
                closeDate: body.closeDate ? new Date(body.closeDate) : null,
                notes: body.notes,
                region: body.region,
                ownerId: body.ownerId || user.userId,
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

        const gamificationResult = await awardXP(user.userId, 'OPPORTUNITY_CREATED', 'OPPORTUNITY_CREATED', opportunity.id)

        return NextResponse.json({ ...opportunity, gamificationResult }, { status: 201 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 })
    }
}
