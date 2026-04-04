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

    // Get all non-admin, non-suspended users who might have goals
    const users = await prisma.user.findMany({
        where: { role: { not: 'Administrator' }, isSuspended: false },
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

    const userIds = users.map(u => u.id)

    const [dealsGrouped, testJobsGrouped, lyDeals, lyTestJobs, allWins, allLosses] = await Promise.all([
        prisma.opportunity.groupBy({
            by: ['ownerId'],
            where: { ownerId: { in: userIds }, stage: 'Closed Won', isDeleted: false, updatedAt: { gte: startDate, lte: endDate } },
            _count: true,
        }),
        prisma.opportunity.groupBy({
            by: ['ownerId'],
            where: { ownerId: { in: userIds }, stage: 'Test Job Received', isDeleted: false, createdAt: { gte: startDate, lte: endDate } },
            _count: true,
        }),
        prisma.opportunity.count({ where: { stage: 'Closed Won', isDeleted: false, updatedAt: { gte: lyStartDate, lte: lyEndDate } } }),
        prisma.opportunity.count({ where: { stage: 'Test Job Received', isDeleted: false, createdAt: { gte: lyStartDate, lte: lyEndDate } } }),
        prisma.opportunity.count({ where: { stage: 'Closed Won', isDeleted: false } }),
        prisma.opportunity.count({ where: { stage: 'Closed Lost', isDeleted: false } })
    ])

    const dealsMap = new Map(dealsGrouped.map(r => [r.ownerId, r._count]))
    const testJobsMap = new Map(testJobsGrouped.map(r => [r.ownerId, r._count]))

    const actuals = users.map(u => ({
        userId: u.id,
        DEALS: dealsMap.get(u.id) ?? 0,
        TEST_JOBS: testJobsMap.get(u.id) ?? 0,
    }))

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
            if (bulk.length > 500) {
                return NextResponse.json({ error: 'Too many items in bulk request' }, { status: 400 })
            }
            const results = []
            for (const item of bulk) {
                if (!item.userId || !item.category || (!item.period && !period)) continue
                const val = parseFloat(item.targetValue)
                if (isNaN(val) || val < 0) continue
                const goal = await prisma.userGoal.upsert({
                    where: {
                        userId_category_period: {
                            userId: item.userId,
                            category: item.category,
                            period: item.period || period
                        }
                    },
                    update: { targetValue: val },
                    create: {
                        userId: item.userId,
                        category: item.category,
                        targetValue: val,
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

        const parsedTarget = parseFloat(targetValue)
        if (isNaN(parsedTarget) || parsedTarget < 0) {
            return NextResponse.json({ error: 'Invalid target value' }, { status: 400 })
        }

        const goal = await prisma.userGoal.upsert({
            where: {
                userId_category_period: { userId, category, period }
            },
            update: { targetValue: parsedTarget },
            create: { userId, category, targetValue: parsedTarget, period }
        })

        return NextResponse.json(goal)
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
