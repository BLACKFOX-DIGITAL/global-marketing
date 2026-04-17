import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST — Calculate and store monthly awards (run at end/start of month)
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    let isAuthorized = false
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        isAuthorized = true
    } else {
        const user = await getCurrentUser()
        if (user?.role === 'Administrator') isAuthorized = true
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Calculate for the previous month
        const now = new Date()
        const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth() // Previous month (1-12)
        const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
        
        const monthStart = new Date(targetYear, targetMonth - 1, 1)
        const monthEnd = new Date(targetYear, targetMonth, 1)

        // Check if already calculated
        const existing = await prisma.monthlyAward.findFirst({
            where: { month: targetMonth, year: targetYear }
        })
        if (existing) {
            return NextResponse.json({ message: 'Awards already calculated for this period' })
        }

        // Get all active (non-suspended) sales reps
        const users = await prisma.user.findMany({
            where: { role: 'Sales Rep', isSuspended: false },
            select: { id: true, name: true, currentStreak: true }
        })

        if (users.length === 0) {
            return NextResponse.json({ message: 'No active sales reps found' })
        }

        const userIds = users.map(u => u.id)

        // 1. Top Closer — Most deals won (Closed Won) this month
        const wonCounts = await prisma.opportunity.groupBy({
            by: ['ownerId'],
            where: {
                ownerId: { in: userIds },
                stage: 'Closed Won',
                updatedAt: { gte: monthStart, lt: monthEnd }
            },
            _count: true,
            orderBy: { _count: { ownerId: 'desc' } }
        })

        // 2. Call King — Most calls logged this month
        const callCounts = await prisma.callAttempt.groupBy({
            by: ['createdBy'],
            where: {
                createdBy: { in: userIds },
                createdAt: { gte: monthStart, lt: monthEnd }
            },
            _count: true,
            orderBy: { _count: { createdBy: 'desc' } }
        })

        // 3. Longest Streak — Highest current streak at month end
        const streakLeader = users.reduce((best, u) => 
            u.currentStreak > (best?.currentStreak || 0) ? u : best
        , users[0])

        // 4. Rising Star — Most XP earned this month
        const xpCounts = await prisma.xPHistory.groupBy({
            by: ['userId'],
            where: {
                userId: { in: userIds },
                createdAt: { gte: monthStart, lt: monthEnd }
            },
            _sum: { xpAwarded: true },
            orderBy: { _sum: { xpAwarded: 'desc' } }
        })

        const awards: Array<{ userId: string; month: number; year: number; category: string; value: number }> = []

        // Award top closer
        if (wonCounts.length > 0 && wonCounts[0].ownerId) {
            awards.push({
                userId: wonCounts[0].ownerId,
                month: targetMonth,
                year: targetYear,
                category: 'top_closer',
                value: wonCounts[0]._count
            })
        }

        // Award call king
        if (callCounts.length > 0 && callCounts[0].createdBy) {
            awards.push({
                userId: callCounts[0].createdBy,
                month: targetMonth,
                year: targetYear,
                category: 'call_king',
                value: callCounts[0]._count
            })
        }

        // Award longest streak
        if (streakLeader && streakLeader.currentStreak >= 3) {
            awards.push({
                userId: streakLeader.id,
                month: targetMonth,
                year: targetYear,
                category: 'longest_streak',
                value: streakLeader.currentStreak
            })
        }

        // Award rising star (most XP)
        if (xpCounts.length > 0) {
            awards.push({
                userId: xpCounts[0].userId,
                month: targetMonth,
                year: targetYear,
                category: 'rising_star',
                value: xpCounts[0]._sum.xpAwarded || 0
            })
        }

        const notifications = []
        // Store awards
        for (const award of awards) {
            await prisma.monthlyAward.upsert({
                where: {
                    userId_month_year_category: {
                        userId: award.userId,
                        month: award.month,
                        year: award.year,
                        category: award.category
                    }
                },
                update: { value: award.value },
                create: award
            })
            const titleMap: any = { top_closer: 'Top Closer', call_king: 'Call King', longest_streak: 'Longest Streak', rising_star: 'Rising Star' }
            notifications.push({
                userId: award.userId,
                type: 'SUCCESS',
                title: '🏆 You Won an Award!',
                message: `Congratulations! You won the ${titleMap[award.category] || award.category} award for last month!`,
                link: '/leaderboard'
            })
        }
        
        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications })
        }

        return NextResponse.json({ 
            month: targetMonth, 
            year: targetYear, 
            awardsGiven: awards.length,
            awards: awards.map(a => ({ ...a, userName: users.find(u => u.id === a.userId)?.name }))
        })
    } catch (error) {
        console.error('Monthly awards calculation failed:', error)
        return NextResponse.json({ error: 'Failed to calculate awards' }, { status: 500 })
    }
}

// GET — Fetch awards for display on leaderboard
export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() || 12))
        const year = parseInt(searchParams.get('year') || String(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()))

        const awards = await prisma.monthlyAward.findMany({
            where: { month, year },
            include: {
                user: { select: { id: true, name: true } }
            },
            orderBy: { category: 'asc' }
        })

        return NextResponse.json({ awards, month, year })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch awards' }, { status: 500 })
    }
}
