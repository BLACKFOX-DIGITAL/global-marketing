import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const goals = await prisma.userGoal.findMany({
        where: { userId: user.userId, period: monthStr }
    })

    // Calculate current progress
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [wonOpportunities, testJobsEntered, completedTasks] = await Promise.all([
        prisma.opportunity.count({
            where: {
                ownerId: user.userId,
                stage: 'Closed Won',
                updatedAt: { gte: startOfMonth }
            }
        }),
        prisma.stageHistory.count({
            where: {
                stage: 'Test Job Received',
                createdAt: { gte: startOfMonth },
                opportunity: {
                    ownerId: user.userId
                }
            }
        }),
        prisma.task.count({
            where: {
                ownerId: user.userId,
                completed: true,
                completedAt: { gte: startOfMonth }
            }
        })
    ])

    const progress = {
        DEALS: wonOpportunities,
        TEST_JOBS: testJobsEntered,
        LEADS: testJobsEntered // Legacy support
    }

    const res = NextResponse.json({ goals, progress })
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
    return res
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { category, targetValue, period } = await req.json()

    if (!category || !period) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedTarget = parseFloat(targetValue)
    if (isNaN(parsedTarget) || parsedTarget < 0) {
        return NextResponse.json({ error: 'Invalid target value' }, { status: 400 })
    }

    try {
        const goal = await prisma.userGoal.upsert({
            where: {
                userId_category_period: { userId: user.userId, category, period }
            },
            update: { targetValue: parsedTarget },
            create: { userId: user.userId, category, targetValue: parsedTarget, period }
        })
        return NextResponse.json(goal)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
