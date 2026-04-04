import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { awardXP } from '@/lib/gamification'

async function checkOwnership(leadId: string, userId: string, role: string): Promise<boolean> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { ownerId: true } })
    if (!lead) return false
    if (role === 'Administrator') return true
    return lead.ownerId === userId
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    if (!await checkOwnership(id, user.userId, user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { outcome, note } = body
    if (!outcome) return NextResponse.json({ error: 'Outcome required' }, { status: 400 })

    try {
        const attempt = await prisma.mailAttempt.create({
            data: {
                leadId: id,
                outcome,
                note: note || null,
                createdBy: user.userId,
            }
        })

        const statusOptions = await prisma.systemOption.findMany({ where: { category: 'LEAD_STATUS' } })

        const mailStatusOpt = statusOptions.find(o => o.value.toLowerCase().includes('mail') || o.value.toLowerCase().includes('email'))
        const mailStatus = mailStatusOpt ? mailStatusOpt.value : 'Mail Sent'

        const lostStatusOpt = statusOptions.find(o => o.value.toLowerCase() === 'lost' || o.value.toLowerCase().includes('lost'))
        const lostStatus = lostStatusOpt ? lostStatusOpt.value : 'Lost'

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                mailCount: { increment: 1 },
                lastMailOutcome: outcome,
                ...(outcome === 'sent' || outcome === 'follow_up' ? { status: mailStatus } : {}),
                ...(outcome === 'response_interested' ? { status: mailStatus } : {}),
                ...(outcome === 'response_not_interested' ? { status: lostStatus } : {}),
                lastActivityAt: new Date(),
                lastMeaningfulActivityAt: new Date(),
            }
        })

        const outcomeLabels: Record<string, string> = {
            'sent': 'Mail Sent',
            'follow_up': 'Follow-up Mail Sent',
            'response_interested': 'Got Response - Interested',
            'response_not_interested': 'Got Response - Not Interested',
        }

        const label = outcomeLabels[outcome] || outcome
        let description = `📧 Mail #${lead.mailCount} — ${label}`
        if (note) description += ` — "${note}"`

        await logActivity({
            userId: user.userId,
            type: 'LEAD',
            action: 'MAIL_ATTEMPT',
            description,
            leadId: id,
        })

        const gamification = await awardXP(user.userId, 'MAIL_ATTEMPT', 'MAIL_ATTEMPT', id)

        return NextResponse.json({ attempt, lead, gamification })
    } catch {
        return NextResponse.json({ error: 'Failed to log mail attempt' }, { status: 500 })
    }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    if (!await checkOwnership(id, user.userId, user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const attempts = await prisma.mailAttempt.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(attempts)
}
