import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { awardXP } from '@/lib/gamification'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    // Fetch claim limit setting (read-only, safe outside transaction)
    const claimLimitSetting = await prisma.systemSetting.findUnique({ where: { key: 'CLAIM_LIMIT' } })
    const CLAIM_LIMIT = parseInt(claimLimitSetting?.value || '50')

    try {

        // Use a transaction to atomically check the claim limit AND claim the lead,
        // preventing race conditions where the same user claims multiple leads simultaneously.
        const updatedLead = await prisma.$transaction(async (tx) => {
            // Re-check claim count inside the transaction to prevent TOCTOU race condition
            const currentPoolLeadsCount = await tx.lead.count({
                where: {
                    ownerId: user.userId,
                    isClaimedFromPool: true,
                    status: { notIn: ['Lost', 'Won', 'Converted', 'Active Client'] }
                }
            })

            if (currentPoolLeadsCount >= CLAIM_LIMIT) {
                throw new Error('LIMIT_REACHED')
            }

            const lead = await tx.lead.findUnique({ where: { id } })

            if (!lead || lead.ownerId !== null) {
                throw new Error('LEAD_NOT_AVAILABLE')
            }

            if (lead.previousOwnerId === user.userId) {
                throw new Error('FRESH_EYES')
            }

            return tx.lead.update({
                where: { id },
                data: {
                    ownerId: user.userId,
                    status: 'New',
                    isClaimedFromPool: true,
                    lastActivityAt: new Date(),
                }
            })
        })

        await logActivity({
            userId: user.userId,
            type: 'LEAD',
            action: 'CLAIMED_FROM_POOL',
            description: `Claimed lead from the Open Pool`,
            leadId: id
        })

        const gamification = await awardXP(user.userId, 'POOL_CLAIM', 'POOL_CLAIM', id)

        return NextResponse.json({ ...updatedLead, gamification })
    } catch (err: unknown) {
        const msg = (err as Error).message
        if (msg === 'LIMIT_REACHED') {
            return NextResponse.json({
                error: `You have reached the limit of ${CLAIM_LIMIT} active leads claimed from the pool. Close some leads before claiming more.`
            }, { status: 403 })
        }
        if (msg === 'LEAD_NOT_AVAILABLE') {
            return NextResponse.json({ error: 'Lead not available' }, { status: 400 })
        }
        if (msg === 'FRESH_EYES') {
            return NextResponse.json({ error: 'You cannot reclaim a lead you previously owned. This is reserved for fresh eyes.' }, { status: 403 })
        }
        return NextResponse.json({ error: 'Failed to claim lead' }, { status: 500 })
    }
}
