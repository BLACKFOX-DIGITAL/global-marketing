import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { type, data } = body

        if (!data || !data.email_id) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        const resendId = data.email_id
        let status = 'Unknown'

        // Map Resend events to our statuses
        switch (type) {
            case 'email.sent':
                status = 'Sent'
                break
            case 'email.delivered':
                status = 'Delivered'
                break
            case 'email.delivery_delayed':
                status = 'Delayed'
                break
            case 'email.complained':
                status = 'Complained'
                break
            case 'email.bounced':
                status = 'Bounced'
                break
            case 'email.opened':
                status = 'Opened'
                break
            case 'email.clicked':
                status = 'Clicked'
                break
        }

        // Update the MailAttempt record
        const attempt = await prisma.mailAttempt.update({
            where: { resendId },
            data: { 
                deliveryStatus: status,
                lead: (type === 'email.delivered' || type === 'email.opened' || type === 'email.clicked') ? {
                    update: {
                        lastMailOutcome: status.toLowerCase()
                    }
                } : undefined
            }
        })

        // Also update the corresponding ActivityLog to show status in timeline
        await prisma.activityLog.updateMany({
            where: { referenceId: attempt.id, action: 'MAIL_ATTEMPT' },
            data: {
                description: `Email ${status.toLowerCase()}: ${attempt.note?.replace('Sent: ', '') || 'No Subject'}`
            }
        })

        return NextResponse.json({ success: true, updatedId: attempt.id })
    } catch (err: any) {
        console.error('Webhook error:', err.message)
        // Always return 200 to Resend even if we fail to process, to avoid retries if it's a code issue
        // But for development, we can return 500
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
