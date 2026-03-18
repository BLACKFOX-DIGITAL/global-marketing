import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return active leads (to reassign) and users (to assign to)
    const [leads, users] = await Promise.all([
        prisma.lead.findMany({
            select: { id: true, name: true, company: true, status: true, owner: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.findMany({
            select: { id: true, name: true, role: true },
            orderBy: { name: 'asc' }
        })
    ])

    return NextResponse.json({ leads, users })
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { leadIds, newOwnerId } = await req.json()

        if (!Array.isArray(leadIds) || !newOwnerId) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        }

        // Validate the new owner exists
        const ownerExists = await prisma.user.findUnique({ where: { id: newOwnerId } })
        if (!ownerExists) {
            return NextResponse.json({ error: 'New owner not found' }, { status: 404 })
        }

        // Perform the bulk update for Leads
        const updatedLeads = await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { ownerId: newOwnerId }
        })

        // NOTE: In a robust CRM, you might also want to ask if the associated Opportunities and Tasks should be reassigned.
        // For simplicity and safety in this MVP, we only reassign the Lead itself.

        return NextResponse.json({ success: true, count: updatedLeads.count })
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
