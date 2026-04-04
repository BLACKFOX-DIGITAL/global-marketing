import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    const [year, month] = period.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    // Last Year comparison
    const lyStartDate = new Date(year - 1, month - 1, 1)
    const lyEndDate = new Date(year - 1, month, 0, 23, 59, 59)

    const userIds = users.map(u => u.id)

    // Build last 6 months trend data
    const trendMonths: { period: string; label: string; startDate: Date; endDate: Date }[] = []
    for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1)
        const y = d.getFullYear()
        const m = d.getMonth() + 1
        trendMonths.push({
            period: `${y}-${String(m).padStart(2, '0')}`,
            label: d.toLocaleString('default', { month: 'short' }),
            startDate: new Date(y, m - 1, 1),
            endDate: new Date(y, m, 0, 23, 59, 59),
        })
    }

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

    const winRate = allWins + allLosses > 0 ? (allWins / (allWins + allLosses)) * 100 : 0

    const comparisons = {
        DEALS: lyDeals > 0 ? ((totalActuals.DEALS - lyDeals) / lyDeals) * 100 : 0,
        TEST_JOBS: lyTestJobs > 0 ? ((totalActuals.TEST_JOBS - lyTestJobs) / lyTestJobs) * 100 : 0
    }

    // Fetch trend data for last 6 months
    const trendData = await Promise.all(trendMonths.map(async (tm) => {
        const [tDeals, tTestJobs, tGoals] = await Promise.all([
            prisma.opportunity.count({
                where: { ownerId: { in: userIds }, stage: 'Closed Won', isDeleted: false, updatedAt: { gte: tm.startDate, lte: tm.endDate } }
            }),
            prisma.opportunity.count({
                where: { ownerId: { in: userIds }, stage: 'Test Job Received', isDeleted: false, createdAt: { gte: tm.startDate, lte: tm.endDate } }
            }),
            prisma.userGoal.findMany({ where: { period: tm.period } })
        ])
        const dealsTarget = tGoals.filter(g => g.category === 'DEALS').reduce((s, g) => s + g.targetValue, 0)
        const testJobsTarget = tGoals.filter(g => g.category === 'TEST_JOBS').reduce((s, g) => s + g.targetValue, 0)
        return {
            label: tm.label,
            period: tm.period,
            dealsActual: tDeals,
            dealsTarget,
            testJobsActual: tTestJobs,
            testJobsTarget,
        }
    }))

    return NextResponse.json({
        users,
        goals,
        actuals,
        trendData,
        stats: { totalActuals, winRate, comparisons }
    })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const body = await req.json()
        const { userId, category, targetValue, period, bulk } = body

        if (bulk && Array.isArray(bulk)) {
            if (bulk.length > 500) {
                return NextResponse.json({ error: 'Too many items in bulk request' }, { status: 400 })
            }
            const validItems = bulk.filter(item => {
                if (!item.userId || !item.category || (!item.period && !period)) return false
                const val = parseFloat(item.targetValue)
                return !isNaN(val) && val >= 0
            })
            const results = await Promise.all(validItems.map(item => {
                const val = parseFloat(item.targetValue)
                return prisma.userGoal.upsert({
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
            }))
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
