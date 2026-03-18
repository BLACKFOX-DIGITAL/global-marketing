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

        // Fetch the first available stage from settings
        const stageSettings = await prisma.systemOption.findMany({
            where: { category: 'OPPORTUNITY_STAGE' },
            orderBy: { order: 'asc' },
            take: 1
        })
        const initialStage = stageSettings.length > 0 ? stageSettings[0].value : 'Test Job Received'

        // Create the opportunity
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

        // Also create initial stage history for the opportunity
        await prisma.stageHistory.create({
            data: {
                stage: initialStage,
                opportunityId: opportunity.id
            }
        })

        // We mark the lead as "Converted"
        await prisma.lead.update({
            where: { id },
            data: { status: 'Converted' }
        })

        // Award XP for converting a lead
        const gamification = await awardXP(user.userId, 'LEAD_CONVERTED')

        return NextResponse.json({ ...opportunity, gamification })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 })
    }
}
