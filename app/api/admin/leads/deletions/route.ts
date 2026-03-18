import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const leads = await prisma.lead.findMany({
        where: { isDeleted: true },
        include: { owner: { select: { name: true } } },
        orderBy: { deletedAt: 'desc' }
    })

    return NextResponse.json({ leads })
}
