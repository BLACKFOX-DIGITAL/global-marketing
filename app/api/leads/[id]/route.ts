import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { awardXP } from '@/lib/gamification'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            opportunities: { orderBy: { createdAt: 'desc' } },
            contacts: true,
            attachments: { orderBy: { createdAt: 'desc' } },
            tasks: { include: { owner: { select: { name: true } } }, orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }] },
        },
    })

    
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (user.role !== 'Administrator' && lead.ownerId && lead.ownerId !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(lead)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await req.json()
    try {
        const oldLead = await prisma.lead.findUnique({ where: { id } })
        if (!oldLead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (user.role !== 'Administrator' && oldLead.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                name: body.name,
                company: body.company,
                email: body.email,
                phone: body.phone,
                website: body.website,
                country: body.country,
                status: body.status,
                priority: body.priority,
                industry: body.industry,
                socials: body.socials,
                callOutcome: body.status === 'Called' ? (body.callOutcome || null) : null,
                notes: body.notes,
                ownerId: body.ownerId || user.userId,
                lastActivityAt: new Date()
            },
            include: { owner: { select: { id: true, name: true, email: true } } },
        })

        // Log status change
        if (oldLead.status !== body.status) {
            await logActivity({
                userId: user.userId,
                type: 'LEAD',
                action: 'STATUS_CHANGE',
                description: `Changed status from '${oldLead.status}' to '${body.status}'`,
                leadId: id
            })
        } else {
            await logActivity({
                userId: user.userId,
                type: 'LEAD',
                action: 'UPDATED',
                description: `Updated lead details for ${lead.name}`,
                leadId: id
            })
        }

        // Simple nested update: delete existing contacts and create new ones
        if (body.contacts && Array.isArray(body.contacts)) {
            await prisma.contact.deleteMany({ where: { leadId: id } })
            if (body.contacts.length > 0) {
                await prisma.contact.createMany({
                    data: body.contacts.map((c: { name: string, email: string | null, phone: string | null, position: string | null, socials: string | null }, i: number) => ({
                        leadId: id,
                        name: c.name,
                        email: c.email,
                        phone: c.phone,
                        position: c.position,
                        socials: c.socials,
                        isPrimary: i === 0,
                    }))
                })
            }
        }

        const gamificationResult = await awardXP(user.userId, 'LEAD_UPDATED', 'LEAD_UPDATED', id)

        return NextResponse.json({ ...lead, gamificationResult })
    } catch {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    try {
        const lead = await prisma.lead.findUnique({ where: { id } })
        
        if (lead) {
            if (user.role !== 'Administrator' && lead.ownerId !== user.userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
            await logActivity({
                userId: user.userId,
                type: 'LEAD',
                action: 'DELETION_REQUESTED',
                description: `Requested deletion for lead: ${lead.name} (${lead.company || 'N/A'})`,
                leadId: id
            })
            // Perform soft delete
            await prisma.lead.update({
                where: { id },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: user.userId,
                    lastActivityAt: new Date()
                }
            })
        }
        return NextResponse.json({ message: 'Soft Deleted (Pending Review)' })
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
}
