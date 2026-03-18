import { NextResponse } from 'next/server'
import { validate } from 'deep-email-validator'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: Request) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { email } = await req.json()
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ valid: false, reason: 'No email provided' }, { status: 400 })
        }

        const trimmed = email.trim().toLowerCase()

        // Basic format check first (instant)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmed)) {
            return NextResponse.json({ valid: false, reason: 'Invalid email format' })
        }

        // Deep validation: checks regex, typo, MX records, disposable, and SMTP
        const result = await validate({
            email: trimmed,
            validateRegex: true,
            validateMx: true,
            validateTypo: false,       // Skip typo suggestions
            validateDisposable: true,  // Block throwaway emails
            validateSMTP: true,        // Try SMTP handshake to verify inbox
        })

        // If all validators pass → valid (green tick)
        if (result.valid) {
            return NextResponse.json({ valid: true })
        }

        // Check which validator failed and build a user-friendly reason
        const validators = result.validators

        if (!validators.regex?.valid) {
            return NextResponse.json({ valid: false, reason: 'Invalid email format' })
        }

        if (!validators.mx?.valid) {
            return NextResponse.json({ valid: false, reason: 'Domain does not accept emails' })
        }

        if (!validators.disposable?.valid) {
            return NextResponse.json({ valid: false, reason: 'Disposable/temporary email' })
        }

        // SMTP failed — could be inbox doesn't exist, or server blocks verification
        if (!validators.smtp?.valid) {
            // SMTP failures are often inconclusive (many mail servers block SMTP checks)
            // Return as "unknown" → yellow tick instead of blocking
            return NextResponse.json({
                valid: true,
                unknown: true,
            })
        }

        // Fallback
        return NextResponse.json({ valid: false, reason: 'Email could not be verified' })

    } catch (error) {
        console.error('Email validation error:', error)
        // On error, don't block — assume valid but unknown
        return NextResponse.json({ valid: true, unknown: true })
    }
}
