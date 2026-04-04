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
                resendSenderEmail: true,
                isSuspended: true
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

        if (!['Administrator', 'Sales Rep'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
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
    } catch (err: unknown) {
        if ((err as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const currentUser = await getCurrentUser()
    if (!isAdmin(currentUser)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id, name, email, role, baseSalary, resendSenderEmail, password, isSuspended } = await req.json()

        if (!id) {
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
        }

        if (role !== undefined && !['Administrator', 'Sales Rep'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        const data: Record<string, unknown> = {}
        if (name !== undefined) data.name = name
        if (email !== undefined) data.email = email
        if (role !== undefined) data.role = role
        if (baseSalary !== undefined) data.baseSalary = parseFloat(baseSalary)
        if (resendSenderEmail !== undefined) data.resendSenderEmail = resendSenderEmail
        if (isSuspended !== undefined) data.isSuspended = isSuspended
        if (password) data.password = await bcrypt.hash(password, 12)

        const updatedUser = await prisma.user.update({
            where: { id },
            data
        })

        const { password: _, ...userWithoutPassword } = updatedUser
        return NextResponse.json(userWithoutPassword)
    } catch (err: unknown) {
        if ((err as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const currentUser = await getCurrentUser()
    if (!isAdmin(currentUser)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
        }

        if (id === currentUser?.userId) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
        }

        // Check if user has any active leads or opportunities
        const leadCount = await prisma.lead.count({ where: { ownerId: id } })
        const oppCount = await prisma.opportunity.count({ where: { ownerId: id } })

        if (leadCount > 0 || oppCount > 0) {
            return NextResponse.json({ 
                error: `Cannot delete user. They own ${leadCount} leads and ${oppCount} opportunities. Reassign them first.` 
            }, { status: 400 })
        }

        // Delete related personal data that doesn't have cascade in schema
        await prisma.$transaction([
            prisma.activityLog.deleteMany({ where: { userId: id } }),
            prisma.notification.deleteMany({ where: { userId: id } }),
            prisma.attendanceRecord.deleteMany({ where: { userId: id } }),
            prisma.leaveRequest.deleteMany({ where: { userId: id } }),
            prisma.userGoal.deleteMany({ where: { userId: id } }),
            prisma.attachment.deleteMany({ where: { userId: id } }),
            prisma.user.delete({ where: { id } })
        ])

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
