import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { normalizeWebsite } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const raw = searchParams.get('website')

    if (!raw) {
        return NextResponse.json({ exists: false })
    }

    const normalized = normalizeWebsite(raw)

    // Check both normalized form and common variants to catch leads stored in different formats
    const existingLead = await prisma.lead.findFirst({
        where: {
            isDeleted: false,
            OR: [
                { website: normalized },
                { website: `http://${normalized}` },
                { website: `https://${normalized}` },
                { website: `http://www.${normalized}` },
                { website: `https://www.${normalized}` },
            ]
        },
        select: { id: true }
    })

    return NextResponse.json({ exists: !!existingLead })
}
