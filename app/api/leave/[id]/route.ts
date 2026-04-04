import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isManager } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const request = await prisma.leaveRequest.findFirst({
        where: { id, userId: user.userId, status: 'Pending' },
    })

    if (!request) {
        return NextResponse.json({ error: 'Request not found or cannot be cancelled' }, { status: 404 })
    }

    await prisma.leaveRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isManager(user)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    if (!['Approved', 'Rejected'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const request = await prisma.leaveRequest.update({
        where: { id },
        data: { status: body.status }
    })

    return NextResponse.json(request)
}
