import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { awardXP } from '@/lib/gamification'
import { logActivity } from '@/lib/activity'

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

        const stageSettings = await prisma.systemOption.findMany({
            where: { category: 'OPPORTUNITY_STAGE' },
            orderBy: { order: 'asc' },
            take: 1
        })

        if (stageSettings.length === 0) {
            return NextResponse.json(
                { error: 'No opportunity stages are configured. Ask an administrator to add at least one stage in Settings.' },
                { status: 400 }
            )
        }

        const initialStage = stageSettings[0].value

        // Wrap creation in a transaction to prevent duplicate conversions under concurrent requests
        const opportunity = await prisma.$transaction(async (tx) => {
            const existingOpportunity = await tx.opportunity.findFirst({
                where: { leadId: id, isDeleted: false }
            })
            if (existingOpportunity) {
                throw new Error('ALREADY_CONVERTED')
            }

            const opp = await tx.opportunity.create({
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

            await tx.stageHistory.create({
                data: { stage: initialStage, opportunityId: opp.id }
            })

            await tx.lead.update({
                where: { id },
                data: { status: 'Converted' }
            })

            return opp
        })

        await logActivity({
            userId: user.userId,
            type: 'LEAD',
            action: 'CONVERTED',
            description: `Converted lead to opportunity: ${opportunity.title}`,
            leadId: id,
            opportunityId: opportunity.id
        })

        const gamification = await awardXP(user.userId, 'LEAD_CONVERTED', 'LEAD_CONVERTED', id)

        return NextResponse.json({ ...opportunity, gamification })
    } catch (err: unknown) {
        if ((err as Error).message === 'ALREADY_CONVERTED') {
            return NextResponse.json({ error: 'This lead has already been converted to an opportunity.' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 })
    }
}
