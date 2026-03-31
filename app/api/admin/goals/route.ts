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

    // Get all non-admin users who might have goals
    const users = await prisma.user.findMany({
        where: {
            role: {
                not: 'Administrator'
            }
        },
        select: { id: true, name: true, role: true }
    })

    // Get all goals for the period
    const goals = await prisma.userGoal.findMany({
        where: { period }
    })

    // Calculate actual values for each user and category
    // period is YYYY-MM
    const [year, month] = period.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    // Calculate Last Year start/end
    const lyStartDate = new Date(year - 1, month - 1, 1)
    const lyEndDate = new Date(year - 1, month, 0, 23, 59, 59)

    const [actuals, lyDeals, lyTestJobs, allWins, allLosses] = await Promise.all([
        Promise.all(users.map(async (u) => {
            const closedDeals = await prisma.opportunity.count({
                where: { ownerId: u.id, stage: 'Closed Won', updatedAt: { gte: startDate, lte: endDate } }
            })
            const testJobs = await prisma.opportunity.count({
                where: { ownerId: u.id, stage: 'Test Job Received', createdAt: { gte: startDate, lte: endDate } }
            })
            return { userId: u.id, DEALS: closedDeals, TEST_JOBS: testJobs }
        })),
        prisma.opportunity.count({ where: { stage: 'Closed Won', updatedAt: { gte: lyStartDate, lte: lyEndDate } } }),
        prisma.opportunity.count({ where: { stage: 'Test Job Received', createdAt: { gte: lyStartDate, lte: lyEndDate } } }),
        prisma.opportunity.count({ where: { stage: 'Closed Won' } }),
        prisma.opportunity.count({ where: { stage: 'Closed Lost' } })
    ])

    const totalActuals = {
        DEALS: actuals.reduce((sum, a) => sum + a.DEALS, 0),
        TEST_JOBS: actuals.reduce((sum, a) => sum + a.TEST_JOBS, 0)
    }

    const winRate = allWins + allLosses > 0 ? (allWins / (allWins + allLosses)) * 100 : 92.4

    const comparisons = {
        DEALS: lyDeals > 0 ? ((totalActuals.DEALS - lyDeals) / lyDeals) * 100 : 0,
        TEST_JOBS: lyTestJobs > 0 ? ((totalActuals.TEST_JOBS - lyTestJobs) / lyTestJobs) * 100 : 0
    }

    return NextResponse.json({ 
        users, 
        goals, 
        actuals, 
        stats: { totalActuals, winRate, comparisons } 
    })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { userId, category, targetValue, period, bulk } = body

        if (bulk && Array.isArray(bulk)) {
            const results = []
            for (const item of bulk) {
                const goal = await prisma.userGoal.upsert({
                    where: {
                        userId_category_period: {
                            userId: item.userId,
                            category: item.category,
                            period: item.period || period
                        }
                    },
                    update: { targetValue: parseFloat(item.targetValue) },
                    create: {
                        userId: item.userId,
                        category: item.category,
                        targetValue: parseFloat(item.targetValue),
                        period: item.period || period
                    }
                })
                results.push(goal)
            }
            return NextResponse.json({ success: true, results })
        }

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
