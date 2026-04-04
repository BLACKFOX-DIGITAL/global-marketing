import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params

    try {
        // Try to restore as Lead
        const lead = await prisma.lead.findUnique({ where: { id } })
        if (lead) {
            await prisma.lead.update({
                where: { id },
                data: { isDeleted: false, deletedAt: null, deletedBy: null }
            })
            return NextResponse.json({ message: 'Lead restored' })
        }

        // Try to restore as Opportunity
        const opp = await prisma.opportunity.findUnique({ where: { id } })
        if (opp) {
            await prisma.opportunity.update({
                where: { id },
                data: { isDeleted: false, deletedAt: null, deletedBy: null }
            })
            return NextResponse.json({ message: 'Opportunity restored' })
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params

    try {
        // Only purge records that are in the soft-delete review queue
        const lead = await prisma.lead.findUnique({ where: { id } })
        if (lead) {
            if (!lead.isDeleted) {
                return NextResponse.json({ error: 'Lead is not in the deletion queue' }, { status: 400 })
            }
            // TODO: Delete associated files from storage provider before purging the DB record.
            // The app stores fileUrl strings in Attachment records — once integrated with a
            // storage provider (e.g. S3, Supabase Storage), fetch all attachments here and
            // call the provider's delete API before prisma.lead.delete().
            await prisma.lead.delete({ where: { id } })
            return NextResponse.json({ message: 'Lead purged permanently' })
        }

        const opp = await prisma.opportunity.findUnique({ where: { id } })
        if (opp) {
            if (!opp.isDeleted) {
                return NextResponse.json({ error: 'Opportunity is not in the deletion queue' }, { status: 400 })
            }
            // TODO: Delete associated files from storage provider before purging the DB record.
            await prisma.opportunity.delete({ where: { id } })
            return NextResponse.json({ message: 'Opportunity purged permanently' })
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
