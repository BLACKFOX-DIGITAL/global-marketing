import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isManager } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = rateLimit(`email-send:${user.userId}`, { limit: 20, windowMs: 60_000 })
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many emails. Try again in a minute.' }, { status: 429 })
    }

    try {
        const { leadId, subject, body } = await req.json()

        if (!leadId || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const lead = await prisma.lead.findUnique({ where: { id: leadId } })

        if (!lead || !lead.email) {
            return NextResponse.json({ error: 'Lead or lead email not found' }, { status: 404 })
        }

        // Verify the user owns this lead (admins/managers can send for any lead)
        if (!isManager(user) && lead.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const resendKeySetting = await prisma.systemSetting.findUnique({
            where: { key: 'RESEND_API_KEY' }
        })

        if (!resendKeySetting || !resendKeySetting.value) {
            return NextResponse.json({ error: 'Resend API Key not configured' }, { status: 500 })
        }

        const fullUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { resendSenderEmail: true }
        })

        if (!fullUser?.resendSenderEmail) {
            return NextResponse.json({ error: 'Your sender email is not configured. Please contact an administrator.' }, { status: 400 })
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKeySetting.value}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fullUser.resendSenderEmail,
                to: lead.email,
                subject: subject,
                html: body
            })
        })

        const resendData = await response.json()

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
        }

        const mailAttempt = await prisma.mailAttempt.create({
            data: {
                leadId: lead.id,
                outcome: 'sent',
                note: `Sent: ${subject}`,
                createdBy: user.userId,
                resendId: resendData.id,
                deliveryStatus: 'Sent'
            }
        })

        await prisma.activityLog.create({
            data: {
                leadId: lead.id,
                userId: user.userId,
                type: 'EMAIL',
                action: 'MAIL_ATTEMPT',
                description: `Email sent: ${subject}`,
                referenceId: mailAttempt.id
            }
        })

        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                mailCount: { increment: 1 },
                lastMailOutcome: 'sent'
            }
        })

        return NextResponse.json({ success: true, resendId: resendData.id })
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
