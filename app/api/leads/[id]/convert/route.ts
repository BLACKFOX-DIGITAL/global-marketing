import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { awardXP } from '@/lib/gamification'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    try {
        const lead = await prisma.lead.findUnique({
            where: { id },
            include: { contacts: true }
        })

        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

        // Only the lead owner or an admin can convert
        if (user.role !== 'Administrator' && lead.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Prevent duplicate conversion — check if an active opportunity already exists for this lead
        const existingOpportunity = await prisma.opportunity.findFirst({
            where: { leadId: id, isDeleted: false }
        })
        if (existingOpportunity) {
            return NextResponse.json({ error: 'This lead has already been converted to an opportunity.' }, { status: 409 })
        }

        const stageSettings = await prisma.systemOption.findMany({
            where: { category: 'OPPORTUNITY_STAGE' },
            orderBy: { order: 'asc' },
            take: 1
        })
        const initialStage = stageSettings.length > 0 ? stageSettings[0].value : 'Test Job Received'

        const opportunity = await prisma.opportunity.create({
            data: {
                title: `${lead.company || lead.name} - Opportunity`,
                company: lead.company,
                stage: initialStage,
                probability: 20,
                notes: lead.notes,
                ownerId: lead.ownerId || user.userId,
                leadId: lead.id,
            }
        })

        await prisma.stageHistory.create({
            data: {
                stage: initialStage,
                opportunityId: opportunity.id
            }
        })

        await prisma.lead.update({
            where: { id },
            data: { status: 'Converted' }
        })

        const gamification = await awardXP(user.userId, 'LEAD_CONVERTED', 'LEAD_CONVERTED', id)

        return NextResponse.json({ ...opportunity, gamification })
    } catch {
        return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 })
    }
}
