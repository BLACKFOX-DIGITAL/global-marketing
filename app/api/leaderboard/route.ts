import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { startOfWeek, startOfMonth } from 'date-fns'
import { getTitleForLevel } from '@/lib/gamification'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'

    const now = new Date()
    let since: Date
    switch (period) {
        case 'week': since = startOfWeek(now, { weekStartsOn: 1 }); break
        case 'all': since = new Date(0); break
        default: since = startOfMonth(now); break
    }

    const [users, leadsData, closedWonData, allOppsData, tasksData, xpInPeriodData, attendanceData] = await Promise.all([
        // All users with gamification data
        prisma.user.findMany({
            where: { role: { not: 'Administrator' }, isSuspended: false },
            select: {
                id: true,
                name: true,
                role: true,
                xp: true,
                level: true,
                currentStreak: true,
                longestStreak: true,
                _count: { select: { achievements: true } },
            },
        }),
        // Leads per user in period
        prisma.lead.groupBy({
            by: ['ownerId'],
            where: { createdAt: { gte: since }, ownerId: { not: null } },
            _count: true,
        }),
        // Closed Won opportunities per user in period
        prisma.opportunity.groupBy({
            by: ['ownerId'],
            where: { stage: 'Closed Won', updatedAt: { gte: since }, ownerId: { not: null } },
            _count: true,
        }),
        // All opportunities per user in period (for win rate calc)
        prisma.opportunity.groupBy({
            by: ['ownerId'],
            where: { createdAt: { gte: since }, ownerId: { not: null } },
            _count: true,
        }),
        // Completed tasks per user in period
        prisma.task.groupBy({
            by: ['ownerId'],
            where: { completed: true, completedAt: { gte: since }, ownerId: { not: null } },
            _count: true,
        }),
        // XP earned per user in period
        prisma.xPHistory.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: since } },
            _sum: { xpAwarded: true },
        }),
        // Attendance hours per user in period
        prisma.attendanceRecord.groupBy({
            by: ['userId'],
            where: { punchIn: { gte: since }, duration: { not: null } },
            _sum: { duration: true },
        }),
    ])

    // Build leaderboard entries
    const leaderboard = users.map((u) => {
        const leads = leadsData.find((l: { ownerId: string | null }) => l.ownerId === u.id)?._count || 0
        const closedWon = closedWonData.find((c: { ownerId: string | null }) => c.ownerId === u.id)?._count || 0
        const totalOpps = allOppsData.find((o: { ownerId: string | null }) => o.ownerId === u.id)?._count || 0
        const winRate = totalOpps > 0 ? Math.round((closedWon / totalOpps) * 100) : 0
        const tasksCompleted = tasksData.find((t: { ownerId: string | null }) => t.ownerId === u.id)?._count || 0
        const hoursWorked = Math.round((attendanceData.find((a: { userId: string }) => a.userId === u.id)?._sum?.duration || 0) / 60)
        const periodXp = xpInPeriodData.find((x: { userId: string }) => x.userId === u.id)?._sum?.xpAwarded || 0

        return {
            id: u.id,
            name: u.name,
            role: u.role,
            xp: u.xp,
            periodXp,
            level: u.level,
            title: getTitleForLevel(u.level),
            currentStreak: u.currentStreak,
            longestStreak: u.longestStreak,
            badgeCount: u._count.achievements,
            leads,
            closedWon,
            winRate,
            tasksCompleted,
            hoursWorked,
            totalOpps,
        }
    })

    // Sort by XP earned in the selected period (period-aware ranking)
    leaderboard.sort((a, b) => b.periodXp - a.periodXp)

    // Add rank
    const ranked = leaderboard.map((entry, i: number) => ({ ...entry, rank: i + 1 }))

    // Find current user's rank
    const currentUserRank = ranked.find((r) => r.id === user.userId)

    return NextResponse.json({
        leaderboard: ranked,
        currentUser: currentUserRank,
        totalUsers: users.length,
    })
}
