import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
    startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear,
    subMonths
} from 'date-fns'

function getStartDate(period: string): Date {
    const now = new Date()
    switch (period) {
        case 'today': return startOfDay(now)
        case 'week': return startOfWeek(now, { weekStartsOn: 1 })
        case 'month': return startOfMonth(now)
        case 'quarter': return startOfQuarter(now)
        case 'half': return subMonths(startOfMonth(now), (now.getMonth() < 6 ? now.getMonth() : now.getMonth() - 6))
        case 'year': return startOfYear(now)
        default: return startOfDay(now)
    }
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'today'

    const since = getStartDate(period)

    const [newLeads, calledLeads, mailSentLeads] = await Promise.all([
        // New leads created in period
        prisma.lead.count({
            where: {
                createdAt: { gte: since }
            }
        }),
        // Leads that have at least 1 call attempt in the period
        prisma.lead.count({
            where: {
                callAttempts: {
                    some: {
                        createdAt: { gte: since }
                    }
                }
            }
        }),
        // Leads that have at least 1 mail attempt in the period
        prisma.lead.count({
            where: {
                mailAttempts: {
                    some: {
                        createdAt: { gte: since }
                    }
                }
            }
        }),
    ])

    return NextResponse.json({
        newLeads,
        calledLeads,
        mailSentLeads,
        period
    })
}
