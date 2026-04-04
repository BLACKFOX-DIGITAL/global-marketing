import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
}
const JWT_SECRET = process.env.JWT_SECRET as string
export const COOKIE_NAME = 'crm_token'

export interface JWTPayload {
    userId: string
    email: string
    name: string
    role: string
}

export function signToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        if (!decoded || typeof decoded !== 'object') return null
        const p = decoded as Record<string, unknown>
        if (
            typeof p.userId !== 'string' ||
            typeof p.email !== 'string' ||
            typeof p.name !== 'string' ||
            typeof p.role !== 'string'
        ) return null
        return { userId: p.userId, email: p.email, name: p.name, role: p.role }
    } catch {
        return null
    }
}

export async function setAuthCookie(token: string, response?: NextResponse) {
    const isProd = process.env.NODE_ENV === 'production'
    const disableSecure = process.env.SESSION_SECURE === 'false'
    
    // Debug log to catch silent cookie rejection over HTTP
    console.log(`[AUTH-LOGIN] Setting cookie. ENV: ${process.env.NODE_ENV}, Secure: ${isProd && !disableSecure}`)

    const options = {
        httpOnly: true,
        secure: isProd && !disableSecure,
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    }

    if (response) {
        response.cookies.set(COOKIE_NAME, token, options)
    } else {
        const cookieStore = await cookies()
        cookieStore.set(COOKIE_NAME, token, options)
    }
}


export async function clearAuthCookie(response?: NextResponse) {
    if (response) {
        response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
    } else {
        const cookieStore = await cookies()
        cookieStore.delete(COOKIE_NAME)
    }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    
    if (!token) {
        // Uncomment if you need extremely verbose logs for every page load
        // console.log(`[AUTH-VERIFY] No token found in cookie: ${COOKIE_NAME}`)
        return null
    }

    const payload = verifyToken(token)
    if (!payload) {
        console.log(`[AUTH-VERIFY] Token found but verification FAILED (invalid or expired)`)
        return null
    }
    
    // Fetch fresh status AND role directly from DB
    const dbUser = await prisma.user.findUnique({ 
        where: { id: payload.userId }, 
        select: { id: true, isSuspended: true, role: true } 
    })
    
    if (!dbUser) {
        console.log(`[AUTH-VERIFY] Session valid for ${payload.email}, but User ID ${payload.userId} NOT FOUND in database!`)
        return null
    }

    if (dbUser.isSuspended) {
        console.log(`[AUTH-VERIFY] User ${payload.email} found but is SUSPENDED.`)
        return null
    }
    
    return {
        ...payload,
        role: dbUser.role
    }
}



export function isAdmin(user: JWTPayload | null): boolean {
    return user?.role === 'Administrator'
}

// No separate Manager role exists — Administrators are the only elevated role.
// isManager is an alias for isAdmin. If a Manager role is added later, only change this function.
export function isManager(user: JWTPayload | null): boolean {
    return isAdmin(user)
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
}
