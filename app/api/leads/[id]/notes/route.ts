import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all notes for a lead
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: leadId } = await params

    try {
        const notes = await prisma.leadNote.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json({ notes })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }
}

// POST a new note
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: leadId } = await params

    try {
        const { content } = await req.json()

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }

        if (content.length > 5000) {
            return NextResponse.json({ error: 'Note is too long (max 5000 chars)' }, { status: 400 })
        }

        // Verify lead exists
        const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

        const note = await prisma.leadNote.create({
            data: {
                leadId,
                userId: user.userId,
                content: content.trim()
            },
            include: {
                user: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json(note)
    } catch {
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }
}

// DELETE a note (only the author or admin can delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { noteId } = await req.json()
        if (!noteId) return NextResponse.json({ error: 'Note ID required' }, { status: 400 })

        const note = await prisma.leadNote.findUnique({ where: { id: noteId } })
        if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

        // Only note author or admin can delete
        if (note.userId !== user.userId && user.role !== 'Administrator') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.leadNote.delete({ where: { id: noteId } })

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }
}
