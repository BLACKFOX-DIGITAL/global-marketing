import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
        deletedBy: l.deletedBy, // Note: You might want to fetch user names if needed
        status: l.status
    }))

    const normalizedOpps = opportunities.map(o => ({
        id: o.id,
        type: 'Opportunity',
        name: o.title,
        company: o.company,
        deletedAt: o.deletedAt,
        deletedBy: o.deletedBy,
        status: o.stage
    }))

    return NextResponse.json({ 
        leads: [...normalizedLeads, ...normalizedOpps].sort((a, b) => 
            new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
        ) 
    })
}
