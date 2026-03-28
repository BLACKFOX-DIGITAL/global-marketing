/**
 * In-memory rate limiter — no Redis needed.
 * Tracks requests per IP per window (default: 60 requests / 60 seconds).
 * Usage: import { rateLimit } from '@/lib/rateLimit'
 */

interface RateLimitEntry {
    count: number
    resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) store.delete(key)
    }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
    /** Max requests allowed in the window */
    limit?: number
    /** Window size in milliseconds */
    windowMs?: number
}

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: number
}

export function rateLimit(
    identifier: string,
    options: RateLimitOptions = {}
): RateLimitResult {
    const { limit = 60, windowMs = 60_000 } = options
    const now = Date.now()
    const key = identifier

    let entry = store.get(key)

    if (!entry || entry.resetAt < now) {
        entry = { count: 1, resetAt: now + windowMs }
        store.set(key, entry)
        return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt }
    }

    entry.count++
    const remaining = Math.max(0, limit - entry.count)
    return {
        allowed: entry.count <= limit,
        remaining,
        resetAt: entry.resetAt,
    }
}

/**
 * Helper to get the real client IP from Next.js request headers.
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    return 'unknown'
}
