import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST — Use a streak freeze
export async function POST() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                id: true,
                currentStreak: true,
                longestStreak: true,
                lastActiveDay: true,
                streakFreezeAvailable: true,
                streakFreezeUsedAt: true,
            }
        })

        if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        if (!dbUser.streakFreezeAvailable) {
            return NextResponse.json({ error: 'No streak freeze available. You get one per week.' }, { status: 400 })
        }

        if (dbUser.currentStreak === 0) {
            return NextResponse.json({ error: 'No active streak to freeze' }, { status: 400 })
        }

        // Check if streak is actually at risk (last active day is yesterday or earlier)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const lastActive = dbUser.lastActiveDay ? new Date(dbUser.lastActiveDay) : null
        if (lastActive) lastActive.setHours(0, 0, 0, 0)

        // Only allow freeze if user hasn't been active today (i.e., the streak would break tomorrow)
        // The freeze extends lastActiveDay to today so the streak doesn't break
        if (lastActive && lastActive.getTime() === today.getTime()) {
            return NextResponse.json({ error: 'You were already active today — your streak is safe!' }, { status: 400 })
        }

        // Apply the freeze: set lastActiveDay to yesterday so the streak is maintained
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        await prisma.user.update({
            where: { id: user.userId },
            data: {
                lastActiveDay: yesterday,
                streakFreezeAvailable: false,
                streakFreezeUsedAt: new Date(),
            }
        })

        return NextResponse.json({ 
            success: true, 
            message: 'Streak freeze used! Your streak is preserved.',
            currentStreak: dbUser.currentStreak
        })
    } catch (error) {
        console.error('Streak freeze failed:', error)
        return NextResponse.json({ error: 'Failed to use streak freeze' }, { status: 500 })
    }
}

// GET — Check streak freeze status
export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                streakFreezeAvailable: true,
                streakFreezeUsedAt: true,
                currentStreak: true,
                lastActiveDay: true,
            }
        })

        if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // Check if a week has passed since last use — auto-refill
        let available = dbUser.streakFreezeAvailable
        if (!available && dbUser.streakFreezeUsedAt) {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            if (dbUser.streakFreezeUsedAt < weekAgo) {
                // Auto-refill
                await prisma.user.update({
                    where: { id: user.userId },
                    data: { streakFreezeAvailable: true }
                })
                available = true
            }
        }

        // Check if streak is at risk
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const lastActive = dbUser.lastActiveDay ? new Date(dbUser.lastActiveDay) : null
        if (lastActive) lastActive.setHours(0, 0, 0, 0)

        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const streakAtRisk = lastActive 
            ? (lastActive.getTime() < yesterday.getTime() && dbUser.currentStreak > 0)
            : false

        return NextResponse.json({
            available,
            streakAtRisk,
            currentStreak: dbUser.currentStreak,
            lastUsed: dbUser.streakFreezeUsedAt
        })
    } catch {
        return NextResponse.json({ error: 'Failed to check streak freeze' }, { status: 500 })
    }
}
