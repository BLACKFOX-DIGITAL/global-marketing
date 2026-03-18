import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { id } = await params
    
    // Basic permission check
    const lead = await prisma.lead.findUnique({
        where: { id },
        select: { ownerId: true }
    })
    
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user.role !== 'Administrator' && lead.ownerId && lead.ownerId !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch only historical data concurrently
    const [activityLogs, callAttempts, mailAttempts] = await Promise.all([
        prisma.activityLog.findMany({ 
            where: { leadId: id }, 
            include: { user: { select: { name: true } } }, 
            orderBy: { createdAt: 'desc' },
            take: 50 // sensible limit
        }),
        prisma.callAttempt.findMany({ 
            where: { leadId: id }, 
            orderBy: { createdAt: 'desc' },
            take: 50
        }),
        prisma.mailAttempt.findMany({ 
            where: { leadId: id }, 
            orderBy: { createdAt: 'desc' },
            take: 50
        })
    ])

    return NextResponse.json({ activityLogs, callAttempts, mailAttempts })
}
