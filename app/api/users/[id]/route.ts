import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isSystemAdmin = currentUser.role === 'Administrator'
    if (!isSystemAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { role } = await req.json()

    if (!['Administrator', 'Sales Rep'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (id === currentUser.userId && role !== 'Administrator') {
        return NextResponse.json({ error: 'Cannot downgrade your own super admin role' }, { status: 400 })
    }

    const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, name: true, email: true, role: true }
    })

    return NextResponse.json({ user })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isSystemAdmin = currentUser.role === 'Administrator'
    if (!isSystemAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    if (id === currentUser.userId) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
