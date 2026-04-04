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
            where: { isDeleted: false },
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

        if (!Array.isArray(leadIds) || leadIds.length === 0 || !newOwnerId) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        }

        if (leadIds.length > 500) {
            return NextResponse.json({ error: 'Too many leads in a single request' }, { status: 400 })
        }

        // Validate the new owner exists, is a Sales Rep, and is not suspended
        const ownerExists = await prisma.user.findUnique({ where: { id: newOwnerId }, select: { id: true, role: true, isSuspended: true } })
        if (!ownerExists) {
            return NextResponse.json({ error: 'New owner not found' }, { status: 404 })
        }
        if (ownerExists.role === 'Administrator') {
            return NextResponse.json({ error: 'Cannot assign leads to an Administrator' }, { status: 400 })
        }
        if (ownerExists.isSuspended) {
            return NextResponse.json({ error: 'Cannot assign leads to a suspended user' }, { status: 400 })
        }

        // Perform the bulk update for Leads
        const updatedLeads = await prisma.lead.updateMany({
            where: { id: { in: leadIds }, isDeleted: false },
            data: { ownerId: newOwnerId }
        })

        // NOTE: In a robust CRM, you might also want to ask if the associated Opportunities and Tasks should be reassigned.
        // For simplicity and safety in this MVP, we only reassign the Lead itself.

        return NextResponse.json({ success: true, count: updatedLeads.count })
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
