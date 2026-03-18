import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const website = searchParams.get('website')

    if (!website) {
        return NextResponse.json({ exists: false })
    }

    const existingLead = await prisma.lead.findFirst({
        where: { website },
        select: { id: true }
    })

    return NextResponse.json({ exists: !!existingLead })
}
