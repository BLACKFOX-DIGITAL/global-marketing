import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { setAuthCookie, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json()
        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 })
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
        }
        const hashed = await bcrypt.hash(password, 12)
        const user = await prisma.user.create({ data: { name, email, password: hashed } })
        const token = signToken({ userId: user.id, email: user.email, name: user.name, role: user.role })
        const response = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
        await setAuthCookie(token, response)
        return response
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
