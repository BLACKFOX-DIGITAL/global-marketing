import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import dns from 'dns/promises'

// Common disposable/throwaway email domains
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
    'guerrillamail.org', 'spam4.me', 'trashmail.com', 'trashmail.me',
    'trashmail.net', 'dispostable.com', 'maildrop.cc', 'getairmail.com',
    'fakeinbox.com', 'mailnull.com', 'spamgourmet.com', 'temp-mail.org',
    'discard.email', 'tempr.email', 'garbagemail.org', 'filzmail.com',
    'spamherelots.com', 'throwam.com', '10minutemail.com', 'mailexpire.com',
    'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
])

export async function POST(req: Request) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { email } = await req.json()
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ valid: false, reason: 'No email provided' }, { status: 400 })
        }

        const trimmed = email.trim().toLowerCase()

        // 1. Basic format check (instant)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmed)) {
            return NextResponse.json({ valid: false, reason: 'Invalid email format' })
        }

        const domain = trimmed.split('@')[1]

        // 2. Disposable domain check (instant, no network call)
        if (DISPOSABLE_DOMAINS.has(domain)) {
            return NextResponse.json({ valid: false, reason: 'Disposable/temporary email' })
        }

        // 3. MX record check via built-in Node.js DNS (no external library)
        try {
            const mxRecords = await dns.resolveMx(domain)
            if (!mxRecords || mxRecords.length === 0) {
                return NextResponse.json({ valid: false, reason: 'Domain does not accept emails' })
            }
        } catch {
            // DNS failure — could be a real domain that DNS timed out on; mark as unknown
            return NextResponse.json({ valid: true, unknown: true })
        }

        return NextResponse.json({ valid: true })

    } catch (error) {
        console.error('Email validation error:', error)
        // On error, don't block — assume valid but unknown
        return NextResponse.json({ valid: true, unknown: true })
    }
}
