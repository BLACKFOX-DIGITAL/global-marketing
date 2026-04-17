import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST — process reminders that are due and create notifications
export async function POST(req: NextRequest) {
    // Verify it's an admin or cron request
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    let isAuthorized = false
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        isAuthorized = true
    } else {
        const user = await getCurrentUser()
        if (user?.role === 'Administrator') isAuthorized = true
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Find all untriggered reminders that are past due
        const dueReminders = await prisma.reminder.findMany({
            where: {
                isTriggered: false,
                remindAt: { lte: new Date() }
            },
            include: {
                lead: { select: { id: true, name: true, company: true } }
            }
        })

        if (dueReminders.length === 0) {
            return NextResponse.json({ processed: 0, message: 'No due reminders' })
        }

        // Create notifications for each due reminder
        const notifications = dueReminders.map(r => ({
            userId: r.userId,
            title: '⏰ Follow-up Reminder',
            message: r.message 
                ? `${r.message} — ${r.lead.name}${r.lead.company ? ` (${r.lead.company})` : ''}`
                : `Time to follow up with ${r.lead.name}${r.lead.company ? ` at ${r.lead.company}` : ''}`,
            type: 'reminder',
            link: `/leads/${r.leadId}`
        }))

        await prisma.$transaction([
            // Create all notifications
            prisma.notification.createMany({ data: notifications }),
            // Mark reminders as triggered
            prisma.reminder.updateMany({
                where: { id: { in: dueReminders.map(r => r.id) } },
                data: { isTriggered: true }
            })
        ])

        return NextResponse.json({ processed: dueReminders.length, message: `Triggered ${dueReminders.length} reminders` })
    } catch (error) {
        console.error('Reminder processing failed:', error)
        return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 })
    }
}
