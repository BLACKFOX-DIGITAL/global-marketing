import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { awardXP } from '@/lib/gamification'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
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

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                mailCount: { increment: 1 },
                lastMailOutcome: outcome,
                // Advance status to "Mail Sent"
                ...(outcome === 'sent' || outcome === 'follow_up' ? { status: 'Mail Sent' } : {}),
                // If got response, interested — stay at Mail Sent
                ...(outcome === 'response_interested' ? { status: 'Mail Sent' } : {}),
                // If not interested, mark as lost
                ...(outcome === 'response_not_interested' ? { status: 'Lost' } : {}),
                lastActivityAt: new Date(),
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

        // Award XP for logging a mail
        const gamification = await awardXP(user.userId, 'MAIL_ATTEMPT')

        return NextResponse.json({ attempt, lead, gamification })
    } catch (err) {
        console.error('Mail attempt error:', err)
        return NextResponse.json({ error: 'Failed to log mail attempt' }, { status: 500 })
    }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const attempts = await prisma.mailAttempt.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(attempts)
}
