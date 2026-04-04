import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setAuthCookie, signToken, verifyPassword, COOKIE_NAME } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { cookies } from 'next/headers'


export async function POST(req: NextRequest) {
    // Rate limit: max 10 login attempts per IP per minute
    const ip = getClientIp(req)
    const rl = rateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 })
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 })
    }

    try {
        const { email, password } = await req.json()
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }
        const user = await prisma.user.findUnique({ where: { email } })
        
        if (!user) {
            console.log(`[AUTH-API] Login failed for ${email}: User not found`)
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }
        
        if (user.isSuspended) {
            console.log(`[AUTH-API] Login failed for ${email}: Account suspended`)
            return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
        }
        
        const valid = await verifyPassword(password, user.password)
        console.log(`[AUTH-API] Attempting login for ${email}. User found? YES. Password valid? ${valid}`)
        
        if (!valid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }
        
        const token = signToken({ userId: user.id, email: user.email, name: user.name, role: user.role })
        console.log(`[AUTH-API] Login successful for ${email} (${user.role}). ID: ${user.id}`)
        
        const isProd = process.env.NODE_ENV === 'production'
        const disableSecure = process.env.SESSION_SECURE === 'false'
        
        console.log(`[AUTH-API] Writing cookie '${COOKIE_NAME}'. Secure: ${isProd && !disableSecure}`)
        
        // Create response with cookie set directly
        const response = NextResponse.json({ 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role 
        })
        
        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: isProd && !disableSecure,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        })
        
        return response


    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
