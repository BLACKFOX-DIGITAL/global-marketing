import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all reminders for a lead
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: leadId } = await params

    try {
        const reminders = await prisma.reminder.findMany({
            where: { leadId, userId: user.userId },
            orderBy: { remindAt: 'asc' }
        })

        return NextResponse.json({ reminders })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
    }
}

// POST a new reminder
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: leadId } = await params

    try {
        const { message, remindAt } = await req.json()

        if (!remindAt) {
            return NextResponse.json({ error: 'Reminder date is required' }, { status: 400 })
        }

        const remindDate = new Date(remindAt)
        if (isNaN(remindDate.getTime()) || remindDate <= new Date()) {
            return NextResponse.json({ error: 'Reminder date must be in the future' }, { status: 400 })
        }

        // Verify lead exists
        const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, name: true } })
        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

        const reminder = await prisma.reminder.create({
            data: {
                leadId,
                userId: user.userId,
                message: message?.trim() || null,
                remindAt: remindDate
            }
        })

        return NextResponse.json(reminder)
    } catch {
        return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
    }
}

// DELETE a reminder
export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { reminderId } = await req.json()
        if (!reminderId) return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 })

        const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } })
        if (!reminder) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })

        if (reminder.userId !== user.userId && user.role !== 'Administrator') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.reminder.delete({ where: { id: reminderId } })

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 })
    }
}
