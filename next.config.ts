import type { NextConfig } from "next";

const securityHeaders = [
    // Prevents browsers from MIME-sniffing a response away from the declared content-type
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Blocks the page from being put in an <iframe> (prevents clickjacking)
    { key: 'X-Frame-Options', value: 'DENY' },
    // Forces HTTPS for 1 year (includeSubDomains + preload)
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
    // Stops the browser from sending the referrer when navigating to a different origin
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // Enables XSS protection for older browsers that don't support CSP
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    // Restricts access to browser features (e.g., camera, microphone, geolocation)
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    // Content Security Policy (allows same-origin, inline scripts via nonce omitted for Next.js simplicity)
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // unsafe-eval needed for Next.js dev
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
        ].join('; ')
    },
]

const nextConfig: NextConfig = {
    // Turbopack: significantly faster dev compilation
    turbopack: {},

    // Apply security headers to all routes
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: securityHeaders,
            },
        ]
    },
};

export default nextConfig;
