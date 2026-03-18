import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
    const user = await getCurrentUser()
    if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                baseSalary: true,
                resendSenderEmail: true
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ users })
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const currentUser = await getCurrentUser()
    if (!isAdmin(currentUser)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { name, email, password, role, baseSalary } = await req.json()

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : 0,
            }
        })

        const { password: _, ...userWithoutPassword } = newUser
        return NextResponse.json(userWithoutPassword)
    } catch (err: any) {
        if (err.code === 'P2002') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const currentUser = await getCurrentUser()
    if (!isAdmin(currentUser)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id, name, email, role, baseSalary, resendSenderEmail, password } = await req.json()

        const data: any = {
            name,
            email,
            role,
            baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : undefined,
            resendSenderEmail
        }

        if (password) {
            data.password = await bcrypt.hash(password, 12)
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data
        })

        const { password: _, ...userWithoutPassword } = updatedUser
        return NextResponse.json(userWithoutPassword)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
