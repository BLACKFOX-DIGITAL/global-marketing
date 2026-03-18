import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { value, color, order } = await req.json()
        const { id } = await params

        const updated = await prisma.systemOption.update({
            where: { id },
            data: { value, color, order }
        })

        return NextResponse.json(updated)
    } catch (err: unknown) {
        const error = err as { code?: string; message: string }
        if (error.code === 'P2002') return NextResponse.json({ error: 'Option already exists' }, { status: 400 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { id } = await params
        await prisma.systemOption.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
