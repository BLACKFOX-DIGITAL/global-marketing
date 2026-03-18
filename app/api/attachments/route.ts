import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, fileUrl, fileType, fileSize, leadId, opportunityId } = await req.json()

    try {
        const attachment = await prisma.attachment.create({
            data: {
                name,
                fileUrl,
                fileType,
                fileSize,
                userId: user.userId,
                leadId: leadId || null,
                opportunityId: opportunityId || null
            }
        })
        return NextResponse.json(attachment)
    } catch {
        return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await prisma.attachment.delete({ where: { id, userId: user.userId } })
    return NextResponse.json({ success: true })
}
