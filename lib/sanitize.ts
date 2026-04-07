/**
 * Input sanitization utilities — strips dangerous HTML/script content
 * before saving user input to the database.
 *
 * Usage: import { sanitize, sanitizeObject } from '@/lib/sanitize'
 */

/**
 * Strip HTML tags and dangerous characters from a string.
 */
export function sanitize(input: unknown): string {
    if (typeof input !== 'string') return ''
    return input
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')  // Remove <script> blocks
        .replace(/<[^>]+>/g, '')                               // Strip all HTML tags
        .replace(/javascript:/gi, '')                          // Block javascript: URIs
        .replace(/on\w+\s*=/gi, '')                           // Remove event handlers (onclick=, etc.)
        .trim()
}

/**
 * Normalize a website URL to just the bare domain for deduplication.
 * Strips protocol, www., paths, query strings, and hash fragments.
 * Example: "https://www.Acme.com/about?ref=1" → "acme.com"
 */
export function normalizeWebsite(url: unknown): string {
    if (typeof url !== 'string') return ''
    const s = url.trim().toLowerCase()
    if (!s) return ''
    const withProto = s.startsWith('http://') || s.startsWith('https://') ? s : 'https://' + s
    try {
        const parsed = new URL(withProto)
        return parsed.hostname.replace(/^www\./, '')
    } catch {
        // Fallback: strip manually
        return s
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0]
            .split('?')[0]
            .split('#')[0]
    }
}

/**
 * Sanitize a specific set of string fields in an object.
 * Non-string fields (numbers, booleans, arrays) are left untouched.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
): T {
    const result = { ...obj }
    for (const field of fields) {
        if (typeof result[field] === 'string') {
            (result as Record<string, unknown>)[field as string] = sanitize(result[field] as string)
        }
    }
    return result
}
