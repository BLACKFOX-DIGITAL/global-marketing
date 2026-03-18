import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    if (query.length < 2) {
        return NextResponse.json({ leads: [], opportunities: [], tasks: [] })
    }

    const [leads, opportunities, tasks] = await Promise.all([
        prisma.lead.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { company: { contains: query } }
                ],
                isDeleted: false
            },
            take: 5,
            select: { id: true, name: true, company: true }
        }),
        prisma.opportunity.findMany({
            where: {
                OR: [
                    { title: { contains: query } },
                    { company: { contains: query } }
                ]
            },
            take: 5,
            select: { id: true, title: true, company: true, stage: true }
        }),
        prisma.task.findMany({
            where: {
                title: { contains: query }
            },
            take: 5,
            select: { id: true, title: true, status: true }
        })
    ])

    return NextResponse.json({ leads, opportunities, tasks })
}
