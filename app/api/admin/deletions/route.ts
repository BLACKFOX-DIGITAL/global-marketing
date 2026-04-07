import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch soft-deleted leads
    const leads = await prisma.lead.findMany({
        where: { isDeleted: true },
        include: { owner: { select: { name: true } } },
        orderBy: { deletedAt: 'desc' }
    })

    // Fetch soft-deleted opportunities
    const opportunities = await prisma.opportunity.findMany({
        where: { isDeleted: true },
        include: { owner: { select: { name: true } } },
        orderBy: { deletedAt: 'desc' }
    })

    // Map them to a unified format for the Review component
    const normalizedLeads = leads.map(l => ({
        id: l.id,
        type: 'Lead',
        name: l.name,
        company: l.company,
        deletedAt: l.deletedAt,
        deletedBy: l.deletedBy,
        ownerName: l.owner?.name || null,
        status: l.status
    }))

    const normalizedOpps = opportunities.map(o => ({
        id: o.id,
        type: 'Opportunity',
        name: o.title,
        company: o.company,
        deletedAt: o.deletedAt,
        deletedBy: o.deletedBy,
        ownerName: o.owner?.name || null,
        status: o.stage
    }))

    return NextResponse.json({ 
        leads: [...normalizedLeads, ...normalizedOpps].sort((a, b) => 
            new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
        ) 
    })
}
