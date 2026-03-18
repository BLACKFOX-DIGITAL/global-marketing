import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    // Get all sales users
    const users = await prisma.user.findMany({
        where: {
            role: 'SalesRep'
        },
        select: { id: true, name: true, role: true }
    })

    // Get all goals for the period
    const goals = await prisma.userGoal.findMany({
        where: { period }
    })

    return NextResponse.json({ users, goals })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { userId, category, targetValue, period } = await req.json()

        if (!userId || !category || !period) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const goal = await prisma.userGoal.upsert({
            where: {
                userId_category_period: {
                    userId,
                    category,
                    period
                }
            },
            update: { targetValue: parseFloat(targetValue) },
            create: {
                userId,
                category,
                targetValue: parseFloat(targetValue),
                period
            }
        })

        return NextResponse.json(goal)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
