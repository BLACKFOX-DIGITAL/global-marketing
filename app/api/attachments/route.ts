import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, fileUrl, fileType, fileSize, leadId, opportunityId } = await req.json()

    try {
        // Verify the user owns the parent record before attaching
        if (leadId) {
            const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { ownerId: true } })
            if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
            if (user.role !== 'Administrator' && lead.ownerId !== user.userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        if (opportunityId) {
            const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { ownerId: true } })
            if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
            if (user.role !== 'Administrator' && opp.ownerId !== user.userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        const attachment = await prisma.attachment.create({
            data: {
                name,
                fileUrl,
                fileType,
                fileSize,
                userId: user.userId,
                leadId: leadId || null,
                opportunityId: opportunityId || null
            }
        })
        return NextResponse.json(attachment)
    } catch {
        return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await prisma.attachment.delete({ where: { id, userId: user.userId } })
    return NextResponse.json({ success: true })
}
