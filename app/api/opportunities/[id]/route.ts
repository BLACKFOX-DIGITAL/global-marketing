import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { awardXP } from '@/lib/gamification'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const opp = await prisma.opportunity.findFirst({
        where: { id, isDeleted: false },
        include: {
            owner: { select: { id: true, name: true, email: true, role: true } },
            lead: { select: { id: true, name: true, company: true } },
            stageHistory: { orderBy: { createdAt: 'desc' } },
            activityLogs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }
        },
    })
    if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (user.role !== 'Administrator' && opp.ownerId !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(opp)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await req.json()

    try {
        // Get current opportunity to check if stage changed
        const current = await prisma.opportunity.findUnique({ where: { id } })
        if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (user.role !== 'Administrator' && current.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const opp = await prisma.opportunity.update({
            where: { id },
            data: {
                title: body.title,
                company: body.company,
                stage: body.stage,
                probability: body.probability,
                closeDate: body.closeDate ? new Date(body.closeDate) : undefined,
                notes: body.notes,
                region: body.region,
                // Only admins can reassign to a different owner
                ownerId: user.role === 'Administrator' ? body.ownerId : undefined,
                // Only update leadId if explicitly provided — avoids nulling the link on partial updates
                leadId: body.leadId !== undefined ? (body.leadId || null) : undefined,
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                lead: { select: { id: true, name: true, company: true } },
                stageHistory: { orderBy: { createdAt: 'desc' } },
            },
        })

        // Add stage history if stage changed
        if (body.stage && current.stage !== body.stage) {
            await prisma.stageHistory.create({
                data: { stage: body.stage, opportunityId: id },
            })
            await logActivity({
                userId: user.userId,
                type: 'OPPORTUNITY',
                action: 'STATUS_CHANGE',
                description: `Moved stage from '${current.stage}' to '${body.stage}'`,
                opportunityId: id
            })

            // If the Opportunity is won, transition the Lead to "Active Client"
            if (body.stage === 'Closed Won' && opp.leadId) {
                await prisma.lead.update({
                    where: { id: opp.leadId },
                    data: { status: 'Active Client' }
                })

                await logActivity({
                    userId: user.userId,
                    type: 'LEAD',
                    action: 'STATUS_CHANGE',
                    description: `Automatically marked as 'Active Client' after Opportunity ${opp.title} was Won.`,
                    leadId: opp.leadId
                })
            }

            if (body.stage === 'Closed Won') {
                const gamificationResult = await awardXP(user.userId, 'OPPORTUNITY_WON', 'OPPORTUNITY_WON', id)
                return NextResponse.json({ ...opp, gamificationResult })
            }
        } else {
            await logActivity({
                userId: user.userId,
                type: 'OPPORTUNITY',
                action: 'UPDATED',
                description: `Updated opportunity: ${opp.title}`,
                opportunityId: id
            })
        }

        // Action wasn't won but was updated — give the smaller update XP
        const gamificationResult = await awardXP(user.userId, 'OPPORTUNITY_UPDATED', 'OPPORTUNITY_UPDATED', id)
        return NextResponse.json({ ...opp, gamificationResult })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    try {
        const opp = await prisma.opportunity.findUnique({ where: { id } })
        if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (user.role !== 'Administrator' && opp.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (opp.leadId) {
            await prisma.lead.update({
                where: { id: opp.leadId },
                data: { status: 'Lost' }
            })
        }

        await logActivity({
            userId: user.userId,
            type: 'OPPORTUNITY',
            action: 'DELETION_REQUESTED',
            description: `Moved opportunity to review queue: ${opp.title}`,
            referenceId: id
        })

        await prisma.opportunity.update({ 
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: user.userId
            }
        })
        return NextResponse.json({ message: 'Soft Deleted (Pending Review)' })
    } catch {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
