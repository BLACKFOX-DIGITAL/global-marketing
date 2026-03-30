import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { setAuthCookie, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }
        if (user.isSuspended) {
            return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
        }
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }
        const token = signToken({ userId: user.id, email: user.email, name: user.name, role: user.role })
        const response = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
        await setAuthCookie(token, response)
        return response
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
