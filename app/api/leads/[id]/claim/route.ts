import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { awardXP } from '@/lib/gamification'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    try {
        const lead = await prisma.lead.findUnique({ where: { id } })
        if (!lead || lead.ownerId) {
            return NextResponse.json({ error: 'Lead not available' }, { status: 400 })
        }

        // Check if user is the previous owner (fresh eyes rule)
        if (lead.previousOwnerId === user.userId) {
            return NextResponse.json({ error: 'You cannot reclaim a lead you previously owned. This is reserved for fresh eyes.' }, { status: 403 })
        }

        // Check 50 lead limit from pool
        const currentPoolLeadsCount = await prisma.lead.count({
            where: {
                ownerId: user.userId,
                isClaimedFromPool: true,
                status: { notIn: ['Lost', 'Won', 'Converted', 'Active Client'] }
            }
        })

        // Check dynamic claim limit from settings
        const claimLimitSetting = await prisma.systemSetting.findUnique({
            where: { key: 'CLAIM_LIMIT' }
        })
        const CLAIM_LIMIT = parseInt(claimLimitSetting?.value || '50')

        if (currentPoolLeadsCount >= CLAIM_LIMIT) {
            return NextResponse.json({ error: `You have reached the limit of ${CLAIM_LIMIT} active leads claimed from the pool. Close some leads before claiming more.` }, { status: 403 })
        }

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                ownerId: user.userId,
                status: 'New',
                isClaimedFromPool: true,
                lastActivityAt: new Date()
            }
        })

        await logActivity({
            userId: user.userId,
            type: 'LEAD',
            action: 'CLAIMED_FROM_POOL',
            description: `Claimed lead from the Open Pool`,
            leadId: id
        })

        // Award XP for claiming from pool
        const gamification = await awardXP(user.userId, 'POOL_CLAIM')

        return NextResponse.json({ ...updatedLead, gamification })
    } catch (err) {
        console.error('Claim error', err)
        return NextResponse.json({ error: 'Failed to claim lead' }, { status: 500 })
    }
}
