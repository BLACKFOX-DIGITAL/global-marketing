import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { leadId, subject, body } = await req.json()

        if (!leadId || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Get Lead details
        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        })

        if (!lead || !lead.email) {
            return NextResponse.json({ error: 'Lead or lead email not found' }, { status: 404 })
        }

        // 2. Get Resend API Key from system settings
        const resendKeySetting = await prisma.systemSetting.findUnique({
            where: { key: 'RESEND_API_KEY' }
        })

        if (!resendKeySetting || !resendKeySetting.value) {
            return NextResponse.json({ error: 'Resend API Key not configured' }, { status: 500 })
        }

        // 3. Get User's sender email
        const fullUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { resendSenderEmail: true }
        })

        if (!fullUser?.resendSenderEmail) {
            return NextResponse.json({ error: 'Your sender email is not configured. Please contact an administrator.' }, { status: 400 })
        }

        // 4. Send via Resend
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
            return NextResponse.json({ error: resendData.message || 'Failed to send email' }, { status: response.status })
        }

        // 5. Create MailAttempt record with resendId
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

        // 6. Create ActivityLog entry
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

        // 7. Update lead's mail count and last mail outcome
        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                mailCount: { increment: 1 },
                lastMailOutcome: 'sent'
            }
        })

        return NextResponse.json({ success: true, resendId: resendData.id })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
