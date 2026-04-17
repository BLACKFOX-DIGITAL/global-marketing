import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth'

// GET activity heatmap data for the past 6 months
export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        sixMonthsAgo.setHours(0, 0, 0, 0)

        // Get all XP history (which tracks all meaningful actions) grouped by day
        const xpHistory = await prisma.xPHistory.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true, actionType: true },
            orderBy: { createdAt: 'asc' }
        })

        // Aggregate by date
        const heatmap: Record<string, { count: number; types: Record<string, number> }> = {}

        for (const entry of xpHistory) {
            const dateKey = entry.createdAt.toISOString().split('T')[0]
            if (!heatmap[dateKey]) {
                heatmap[dateKey] = { count: 0, types: {} }
            }
            heatmap[dateKey].count++
            heatmap[dateKey].types[entry.actionType] = (heatmap[dateKey].types[entry.actionType] || 0) + 1
        }

        // Convert to array format
        const data = Object.entries(heatmap).map(([date, info]) => ({
            date,
            count: info.count,
            types: info.types
        }))

        return NextResponse.json({ heatmap: data })
    } catch (error) {
        console.error('Heatmap data fetch failed:', error)
        return NextResponse.json({ error: 'Failed to fetch heatmap data' }, { status: 500 })
    }
}
