import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHmac, timingSafeEqual } from 'crypto'

// Resend uses Svix for webhook signing.
// Set RESEND_WEBHOOK_SECRET in your environment (the signing secret from Resend dashboard).
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

function verifyResendSignature(req: NextRequest, rawBody: string): boolean {
    if (!WEBHOOK_SECRET) return false

    const msgId = req.headers.get('svix-id')
    const msgTimestamp = req.headers.get('svix-timestamp')
    const msgSignature = req.headers.get('svix-signature')

    if (!msgId || !msgTimestamp || !msgSignature) return false

    // Reject timestamps older than 5 minutes to prevent replay attacks
    const timestampMs = parseInt(msgTimestamp, 10) * 1000
    if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false

    // Svix signing secret is base64-encoded after the "whsec_" prefix
    const secretBytes = Buffer.from(
        WEBHOOK_SECRET.startsWith('whsec_') ? WEBHOOK_SECRET.slice(6) : WEBHOOK_SECRET,
        'base64'
    )

    const toSign = `${msgId}.${msgTimestamp}.${rawBody}`
    const expectedSig = createHmac('sha256', secretBytes).update(toSign).digest('base64')

    // svix-signature may contain multiple comma-separated "v1,<sig>" values
    const signatures = msgSignature.split(' ')
    for (const sig of signatures) {
        const [version, value] = sig.split(',')
        if (version !== 'v1' || !value) continue
        try {
            if (timingSafeEqual(Buffer.from(value, 'base64'), Buffer.from(expectedSig, 'base64'))) {
                return true
            }
        } catch {
            // buffer lengths differ — not a match
        }
    }
    return false
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text()

        if (!verifyResendSignature(req, rawBody)) {
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
        }

        const body = JSON.parse(rawBody)
        const { type, data } = body

        if (!data || !data.email_id) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        const resendId = data.email_id
        let status = 'Unknown'

        switch (type) {
            case 'email.sent':       status = 'Sent';      break
            case 'email.delivered':  status = 'Delivered'; break
            case 'email.delivery_delayed': status = 'Delayed'; break
            case 'email.complained': status = 'Complained'; break
            case 'email.bounced':    status = 'Bounced';   break
            case 'email.opened':     status = 'Opened';    break
            case 'email.clicked':    status = 'Clicked';   break
        }

        const attempt = await prisma.mailAttempt.update({
            where: { resendId },
            data: {
                deliveryStatus: status,
                lead: (type === 'email.delivered' || type === 'email.opened' || type === 'email.clicked') ? {
                    update: { lastMailOutcome: status.toLowerCase() }
                } : undefined
            }
        })

        await prisma.activityLog.updateMany({
            where: { referenceId: attempt.id, action: 'MAIL_ATTEMPT' },
            data: {
                description: `Email ${status.toLowerCase()}: ${attempt.note?.replace('Sent: ', '') || 'No Subject'}`
            }
        })

        return NextResponse.json({ success: true, updatedId: attempt.id })
    } catch (err: unknown) {
        console.error('Webhook error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
