import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const holidays = await prisma.holiday.findMany({
        orderBy: { date: 'asc' },
        where: {
            date: { gte: new Date() }
        }
    })

    return NextResponse.json({ holidays })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { name, description, date } = await req.json()

        if (!name || !date) {
            return NextResponse.json({ error: 'Name and date are required' }, { status: 400 })
        }

        const holiday = await prisma.holiday.create({
            data: {
                name,
                description,
                date: new Date(date),
                createdBy: user.userId
            }
        })

        return NextResponse.json(holiday, { status: 201 })
    } catch (err: any) {
        if (err.code === 'P2002') {
            return NextResponse.json({ error: 'A holiday already exists on this date' }, { status: 400 })
        }
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
