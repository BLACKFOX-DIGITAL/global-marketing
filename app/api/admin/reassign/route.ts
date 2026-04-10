import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    const where: { isDeleted: boolean; OR?: object[] } = { isDeleted: false }
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { company: { contains: search } },
        ]
    }

    const [leads, total, users] = await Promise.all([
        prisma.lead.findMany({
            where,
            select: { id: true, name: true, company: true, status: true, owner: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.lead.count({ where }),
        prisma.user.findMany({
            select: { id: true, name: true, role: true },
            orderBy: { name: 'asc' }
        })
    ])

    return NextResponse.json({ leads, total, page, totalPages: Math.ceil(total / limit), users })
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

        // Fetch leads before updating so we know which owners are losing leads
        const leadsBeforeUpdate = await prisma.lead.findMany({
            where: { id: { in: leadIds }, isDeleted: false },
            select: { id: true, name: true, company: true, ownerId: true }
        })

        // Perform the bulk update — reset both activity timestamps so the new rep
        // isn't immediately penalized for the previous rep's inactivity
        const updatedLeads = await prisma.lead.updateMany({
            where: { id: { in: leadIds }, isDeleted: false },
            data: {
                ownerId: newOwnerId,
                previousOwnerId: null,
                lastActivityAt: new Date(),
                lastMeaningfulActivityAt: new Date(),
            }
        })

        // Notify the new owner once with a summary
        const assignedToNew = leadsBeforeUpdate.filter(l => l.ownerId !== newOwnerId)
        if (assignedToNew.length > 0) {
            await prisma.notification.create({
                data: {
                    userId: newOwnerId,
                    title: '📋 Leads Assigned to You',
                    message: `${assignedToNew.length} lead(s) have been assigned to you by an administrator.`,
                    type: 'SYSTEM_WARNING',
                }
            })
        }

        // Notify each previous owner that lost leads, grouped by owner
        const previousOwnerMap = new Map<string, number>()
        for (const lead of leadsBeforeUpdate) {
            if (lead.ownerId && lead.ownerId !== newOwnerId) {
                previousOwnerMap.set(lead.ownerId, (previousOwnerMap.get(lead.ownerId) ?? 0) + 1)
            }
        }
        for (const [oldOwnerId, count] of previousOwnerMap) {
            await prisma.notification.create({
                data: {
                    userId: oldOwnerId,
                    title: '📤 Leads Reassigned',
                    message: `${count} of your lead(s) have been reassigned to another rep by an administrator.`,
                    type: 'SYSTEM_WARNING',
                }
            })
        }

        // Log activity on each lead so the history is traceable
        for (const lead of leadsBeforeUpdate) {
            if (lead.ownerId !== newOwnerId) {
                await logActivity({
                    userId: newOwnerId,
                    type: 'LEAD',
                    action: 'UPDATED',
                    description: `Lead manually reassigned by administrator.`,
                    leadId: lead.id
                })
            }
        }

        return NextResponse.json({ success: true, count: updatedLeads.count })
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
