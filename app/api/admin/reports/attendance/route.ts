import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
    startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfDay, endOfDay, subDays, subWeeks, subMonths,
    startOfQuarter, startOfYear, format, isWeekend, addDays, eachDayOfInterval
} from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'
    const repId = searchParams.get('repId') || undefined

    const now = new Date()
    let since: Date
    let until: Date = now

    switch (period) {
        case 'week':
            since = startOfWeek(now, { weekStartsOn: 1 }); break
        case 'last_week':
            since = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
            until = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }); break
        case 'month':
            since = startOfMonth(now); break
        case 'last_month':
            since = startOfMonth(subMonths(now, 1))
            until = endOfMonth(subMonths(now, 1)); break
        case 'quarter':
            since = startOfQuarter(now); break
        case 'year':
            since = startOfYear(now); break
        default:
            since = startOfMonth(now)
    }

    const [allReps, records, leaveRequests] = await Promise.all([
        prisma.user.findMany({
            where: { isSuspended: false, ...(repId ? { id: repId } : {}) },
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: 'asc' }
        }),
        prisma.attendanceRecord.findMany({
            where: {
                punchIn: { gte: startOfDay(since), lte: endOfDay(until) },
                ...(repId ? { userId: repId } : {})
            },
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { punchIn: 'asc' }
        }),
        prisma.leaveRequest.findMany({
            where: {
                status: 'Approved',
                startDate: { lte: endOfDay(until) },
                endDate: { gte: startOfDay(since) },
                ...(repId ? { userId: repId } : {})
            },
            select: { userId: true, startDate: true, endDate: true, type: true }
        })
    ])

    // Build work days in range (Mon-Fri, excluding weekends)
    const allDays = eachDayOfInterval({ start: startOfDay(since), end: endOfDay(until) })
    const workDays = allDays.filter(d => !isWeekend(d))
    const totalWorkDays = workDays.length

    // Daily summary chart
    const dailyStats = workDays.map(day => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        const dayRecords = records.filter(r => r.punchIn >= dayStart && r.punchIn <= dayEnd)
        const totalMins = dayRecords.reduce((s, r) => s + (r.duration || 0), 0)
        return {
            date: format(day, 'MMM dd'),
            present: dayRecords.length,
            absent: allReps.length - dayRecords.length,
            avgHours: dayRecords.length > 0 ? parseFloat((totalMins / 60 / dayRecords.length).toFixed(1)) : 0,
            totalHours: parseFloat((totalMins / 60).toFixed(1))
        }
    })

    // Per-rep stats
    const repStats = allReps.map(rep => {
        const repRecords = records.filter(r => r.userId === rep.id)
        const totalMins = repRecords.reduce((s, r) => s + (r.duration || 0), 0)
        const totalHours = parseFloat((totalMins / 60).toFixed(1))
        const daysPresent = new Set(repRecords.map(r => format(r.punchIn, 'yyyy-MM-dd'))).size
        const daysAbsent = totalWorkDays - daysPresent
        const attendanceRate = totalWorkDays > 0 ? Math.round((daysPresent / totalWorkDays) * 100) : 0

        const lateArrivals = repRecords.filter(r => {
            const hour = r.punchIn.getHours()
            const min = r.punchIn.getMinutes()
            return hour > 9 || (hour === 9 && min > 15)
        }).length

        const avgHoursPerDay = daysPresent > 0 ? parseFloat((totalHours / daysPresent).toFixed(1)) : 0

        const repLeave = leaveRequests.filter(l => l.userId === rep.id)
        const leaveDays = repLeave.reduce((sum, l) => {
            const days = eachDayOfInterval({ start: new Date(l.startDate), end: new Date(l.endDate) })
                .filter(d => !isWeekend(d)).length
            return sum + days
        }, 0)

        // Find early/late checkouts (punchOut before 17:00)
        const earlyCheckouts = repRecords.filter(r => {
            if (!r.punchOut) return false
            const hour = r.punchOut.getHours()
            return hour < 17
        }).length

        return {
            id: rep.id,
            name: rep.name,
            email: rep.email,
            role: rep.role,
            daysPresent,
            daysAbsent,
            leaveDays,
            attendanceRate,
            totalHours,
            avgHoursPerDay,
            lateArrivals,
            earlyCheckouts,
            sessions: repRecords.length
        }
    })

    // Global summary
    const totalMins = records.reduce((s, r) => s + (r.duration || 0), 0)
    const globalStats = {
        totalSessions: records.length,
        totalHours: parseFloat((totalMins / 60).toFixed(1)),
        avgAttendanceRate: repStats.length > 0
            ? Math.round(repStats.reduce((s, r) => s + r.attendanceRate, 0) / repStats.length)
            : 0,
        perfectAttendance: repStats.filter(r => r.attendanceRate === 100).length,
        workDays: totalWorkDays,
        repCount: allReps.length
    }

    return NextResponse.json({
        period,
        since: since.toISOString(),
        until: until.toISOString(),
        globalStats,
        repStats,
        dailyStats,
        allReps: allReps.map(r => ({ id: r.id, name: r.name }))
    })
}
