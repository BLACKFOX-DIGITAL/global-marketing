import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET as string

if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production')
    }
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
        return jwt.verify(token, JWT_SECRET) as unknown as JWTPayload
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
    // Check suspension status against DB — JWT alone cannot reflect admin actions taken after token issuance
    const dbUser = await prisma.user.findUnique({ where: { id: payload.userId }, select: { isSuspended: true } })
    if (!dbUser || dbUser.isSuspended) return null
    return payload
}

export async function getAuthToken(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value || null
}

export function isAdmin(user: JWTPayload | null): boolean {
    return user?.role === 'Administrator'
}

export function isManager(user: JWTPayload | null): boolean {
    return user?.role === 'Administrator'
}

export function isSalesRep(user: JWTPayload | null): boolean {
    return user?.role === 'Sales Rep'
}
