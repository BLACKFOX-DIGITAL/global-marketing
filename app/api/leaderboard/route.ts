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

    // Get all users with gamification data
    const users = await prisma.user.findMany({
        where: {
            role: { not: 'Administrator' }
        },
        select: {
            id: true,
            name: true,
            role: true,
            xp: true,
            level: true,
            currentStreak: true,
            longestStreak: true,
            achievements: {
                include: { achievement: true }
            }
        },
    })

    // Get leads per user in period
    const leadsData = await prisma.lead.groupBy({
        by: ['ownerId'],
        where: { createdAt: { gte: since }, ownerId: { not: null } },
        _count: true,
    })

    // Get opportunities (Closed Won) per user in period
    const closedWonData = await prisma.opportunity.groupBy({
        by: ['ownerId'],
        where: {
            stage: 'Closed Won',
            updatedAt: { gte: since },
            ownerId: { not: null },
        },
        _count: true,
    })

    // Get all opportunities per user (for win rate calc)
    const allOppsData = await prisma.opportunity.groupBy({
        by: ['ownerId'],
        where: {
            createdAt: { gte: since },
            ownerId: { not: null },
        },
        _count: true,
    })

    // Get completed tasks per user in period
    const tasksData = await prisma.task.groupBy({
        by: ['ownerId'],
        where: {
            completed: true,
            completedAt: { gte: since },
            ownerId: { not: null },
        },
        _count: true,
    })

    // Get attendance hours per user in period
    const attendanceData = await prisma.attendanceRecord.groupBy({
        by: ['userId'],
        where: {
            punchIn: { gte: since },
            duration: { not: null },
        },
        _sum: { duration: true },
    })

    // Build leaderboard entries
    const leaderboard = users.map((u) => {
        const leads = leadsData.find((l: { ownerId: string | null }) => l.ownerId === u.id)?._count || 0
        const closedWon = closedWonData.find((c: { ownerId: string | null }) => c.ownerId === u.id)?._count || 0
        const totalOpps = allOppsData.find((o: { ownerId: string | null }) => o.ownerId === u.id)?._count || 0
        const winRate = totalOpps > 0 ? Math.round((closedWon / totalOpps) * 100) : 0
        const tasksCompleted = tasksData.find((t: { ownerId: string | null }) => t.ownerId === u.id)?._count || 0
        const hoursWorked = Math.round((attendanceData.find((a: { userId: string }) => a.userId === u.id)?._sum?.duration || 0) / 60)

        return {
            id: u.id,
            name: u.name,
            role: u.role,
            xp: u.xp,
            level: u.level,
            title: getTitleForLevel(u.level),
            currentStreak: u.currentStreak,
            longestStreak: u.longestStreak,
            badgeCount: u.achievements.length,
            leads,
            closedWon,
            winRate,
            tasksCompleted,
            hoursWorked,
            totalOpps,
        }
    })

    // Sort by XP descending (primary ranking metric)
    leaderboard.sort((a, b) => b.xp - a.xp)

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
