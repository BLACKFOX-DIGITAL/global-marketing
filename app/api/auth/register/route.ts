import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hashPassword } from '@/lib/auth'

// Registration is restricted to administrators.
// Admins create accounts for new users; self-registration is not supported.
export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'Administrator') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { name, email, password, role } = await req.json()
        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 })
        }

        // Minimum 8 chars, at least one uppercase, one lowercase, one digit
        if (
            password.length < 8 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password)
        ) {
            return NextResponse.json({
                error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number'
            }, { status: 400 })
        }

        if (role && !['Administrator', 'Sales Rep'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
        }

        const hashed = await hashPassword(password)
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashed,
                role: role || 'Sales Rep',
            }
        })

        return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
