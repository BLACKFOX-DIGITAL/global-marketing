import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    try {
        const { name, subject, body } = await req.json()

        const updated = await prisma.emailTemplate.update({
            where: { id },
            data: { name, subject, body }
        })

        return NextResponse.json(updated)
    } catch (err: any) {
        if (err.code === 'P2002') {
            return NextResponse.json({ error: 'Template name already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    try {
        await prisma.emailTemplate.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
