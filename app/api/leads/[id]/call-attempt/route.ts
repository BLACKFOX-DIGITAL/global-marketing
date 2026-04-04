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

    // Verify the caller owns the lead (or is admin)
    const lead = await prisma.lead.findUnique({ where: { id }, select: { ownerId: true } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (user.role !== 'Administrator' && lead.ownerId !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { outcome, note } = body
    if (!outcome) return NextResponse.json({ error: 'Outcome required' }, { status: 400 })

    try {
        // Create the call attempt record
        const attempt = await prisma.callAttempt.create({
            data: {
                leadId: id,
                outcome,
                note: note || null,
                createdBy: user.userId,
            }
        })

        // Find the matching statuses from SystemOption avoiding hardcoded strict matches
        const statusOptions = await prisma.systemOption.findMany({ where: { category: 'LEAD_STATUS' } })
        
        const callStatusOpt = statusOptions.find(o => o.value.toLowerCase().includes('call'))
        const callStatus = callStatusOpt ? callStatusOpt.value : 'Called'
        
        const lostStatusOpt = statusOptions.find(o => o.value.toLowerCase() === 'lost' || o.value.toLowerCase().includes('lost'))
        const lostStatus = lostStatusOpt ? lostStatusOpt.value : 'Lost'
        
        
        // Increment call count and update last outcome
        const lead = await prisma.lead.update({
            where: { id },
            data: {
                callCount: { increment: 1 },
                lastCallOutcome: outcome,
                ...(outcome === 'connected_interested' ? { status: callStatus, callOutcome: 'Talked' } : {}),
                ...(outcome === 'connected_not_interested' ? { status: lostStatus, callOutcome: 'Talked' } : {}),
                lastActivityAt: new Date(),
                lastMeaningfulActivityAt: new Date(), // Real sales action — resets reclaim clock
            }
        })

        // Build activity description
        const outcomeLabels: Record<string, string> = {
            'no_answer': 'No Answer',
            'voicemail': 'Voicemail Left',
            'connected_interested': 'Connected - Interested',
            'connected_not_interested': 'Connected - Not Interested',
            'call_back_later': 'Call Back Later',
        }

        const label = outcomeLabels[outcome] || outcome
        let description = `📞 Call #${lead.callCount} — ${label}`
        if (note) description += ` — "${note}"`

        await logActivity({
            userId: user.userId,
            type: 'LEAD',
            action: 'CALL_ATTEMPT',
            description,
            leadId: id,
        })

        // If "call_back_later" and a valid dueDate is provided, auto-create a follow-up task
        const parsedDueDate = body.dueDate ? new Date(body.dueDate) : null
        if (outcome === 'call_back_later' && parsedDueDate && !isNaN(parsedDueDate.getTime())) {
            await prisma.task.create({
                data: {
                    title: `Follow-up call — ${lead.company || lead.name}`,
                    taskType: 'Follow-up',
                    priority: 'High',
                    dueDate: parsedDueDate,
                    leadId: id,
                    ownerId: user.userId,
                }
            })

            await logActivity({
                userId: user.userId,
                type: 'LEAD',
                action: 'TASK_CREATED',
                description: `🔄 Follow-up call scheduled for ${parsedDueDate.toLocaleDateString()}`,
                leadId: id,
            })
        }

        // Award XP for logging a call
        const gamification = await awardXP(user.userId, 'CALL_ATTEMPT', 'CALL_ATTEMPT', id)

        return NextResponse.json({ attempt, lead, gamification })
    } catch (err) {
        console.error('Call attempt error:', err)
        return NextResponse.json({ error: 'Failed to log call attempt' }, { status: 500 })
    }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const lead = await prisma.lead.findUnique({ where: { id }, select: { ownerId: true } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (user.role !== 'Administrator' && lead.ownerId !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const attempts = await prisma.callAttempt.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(attempts)
}
