import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const notifications = await prisma.notification.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        take: 50
    })

    const unreadCount = await prisma.notification.count({
        where: { userId: user.userId, isRead: false }
    })

    return NextResponse.json({ notifications, unreadCount })
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, readAll } = await req.json()

    if (readAll) {
        await prisma.notification.updateMany({
            where: { userId: user.userId, isRead: false },
            data: { isRead: true }
        })
    } else if (id) {
        await prisma.notification.update({
            where: { id, userId: user.userId },
            data: { isRead: true }
        })
    }

    return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
        await prisma.notification.delete({ where: { id, userId: user.userId } })
    } else {
        await prisma.notification.deleteMany({ where: { userId: user.userId, isRead: true } })
    }

    return NextResponse.json({ success: true })
}
