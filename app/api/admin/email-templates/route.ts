import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function GET() {
    // Any authenticated user can read templates (needed by Sales Reps to use the email modal)
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const templates = await prisma.emailTemplate.findMany({
            orderBy: { name: 'asc' }
        })
        return NextResponse.json({ templates })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { name, subject, body } = await req.json()

        if (!name || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const template = await prisma.emailTemplate.create({
            data: { name, subject, body }
        })

        return NextResponse.json(template)
    } catch (err: unknown) {
        if ((err as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'Template name already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
