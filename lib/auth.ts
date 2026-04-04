import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
}
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
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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
    if (!token) return null
    const payload = verifyToken(token)
    if (!payload) return null
    
    // Fetch fresh status AND role directly from DB to prevent stale JWT redirects
    const dbUser = await prisma.user.findUnique({ 
        where: { id: payload.userId }, 
        select: { isSuspended: true, role: true } 
    })
    
    if (!dbUser || dbUser.isSuspended) return null
    
    return {
        ...payload,
        role: dbUser.role
    }
}


export async function getAuthToken(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value || null
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
