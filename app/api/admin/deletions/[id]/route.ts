import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { action } = await req.json()

    try {
        const lead = await prisma.lead.findUnique({ where: { id } })
        if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (action === 'restore') {
            await prisma.lead.update({
                where: { id },
                data: {
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null,
                    lastActivityAt: new Date()
                }
            })
            await logActivity({
                userId: user.userId,
                type: 'LEAD',
                action: 'RESTORED',
                description: `Admin restored lead: ${lead.name}`,
                leadId: id
            })
        } else if (action === 'send_to_pool') {
            await prisma.lead.update({
                where: { id },
                data: {
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null,
                    ownerId: null,
                    isClaimedFromPool: false,
                    lastActivityAt: new Date()
                }
            })
            await logActivity({
                userId: user.userId,
                type: 'LEAD',
                action: 'SENT_TO_POOL',
                description: `Admin sent deleted lead to Pool: ${lead.name}`,
                leadId: id
            })
        } else if (action === 'permanent_delete') {
            await logActivity({
                userId: user.userId,
                type: 'LEAD',
                action: 'DELETED',
                description: `Admin PERMANENTLY deleted lead: ${lead.name}`,
                referenceId: id
            })
            await prisma.lead.delete({ where: { id } })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Action failed' }, { status: 500 })
    }
}
