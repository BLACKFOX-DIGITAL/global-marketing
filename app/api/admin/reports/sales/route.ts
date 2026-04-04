import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, subWeeks, subMonths, startOfQuarter, startOfYear, format, differenceInDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'
    const repId = searchParams.get('repId')

    const now = new Date()
    let since: Date
    let until: Date = now

    switch (period) {
        case 'today':
            since = startOfDay(now)
            until = endOfDay(now)
            break
        case 'yesterday':
            since = startOfDay(subDays(now, 1))
            until = endOfDay(subDays(now, 1))
            break
        case 'week':
            since = startOfWeek(now, { weekStartsOn: 1 })
            until = now
            break
        case 'last_week':
            since = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
            until = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
            break
        case 'month':
            since = startOfMonth(now)
            until = now
            break
        case 'last_month':
            since = startOfMonth(subMonths(now, 1))
            until = endOfMonth(subMonths(now, 1))
            break
        case 'quarter':
            since = startOfQuarter(now)
            until = now
            break
        case 'year':
            since = startOfYear(now)
            until = now
            break
        default:
            since = startOfMonth(now)
            until = now
            break
    }

    const userFilter = repId ? { id: repId } : {}

    // We also need trend data (last 14 days) regardless of the selected period
    const trendSince = startOfDay(subDays(now, 13))

    const [salesReps, allLeads, periodLeads, opportunities, allTasks, periodTasks, callAttempts, mailAttempts, attendanceRecords, trendLeads, trendCalls, trendMails, trendTasks, trendOpps] = await Promise.all([
        prisma.user.findMany({
            where: {
                role: { not: 'Administrator' },
                isSuspended: false,
                ...userFilter
            },
            select: { id: true, name: true }
        }),
        prisma.lead.findMany({
            where: { isDeleted: false, ownerId: repId ? repId : undefined },
            select: { id: true, status: true, ownerId: true, createdAt: true, lastActivityAt: true, isClaimedFromPool: true }
        }),
        prisma.lead.findMany({
            where: { createdAt: { gte: since, lte: until }, ownerId: repId ? repId : undefined, isDeleted: false },
            select: { id: true, status: true, ownerId: true, createdAt: true, isClaimedFromPool: true }
        }),
        prisma.opportunity.findMany({
            where: { ownerId: repId ? repId : undefined },
            select: { id: true, stage: true, ownerId: true, createdAt: true, updatedAt: true }
        }),
        prisma.task.findMany({
            where: { ownerId: repId ? repId : undefined },
            select: { id: true, status: true, completed: true, completedAt: true, dueDate: true, ownerId: true, title: true }
        }),
        prisma.task.findMany({
            where: {
                completed: true,
                completedAt: { gte: since, lte: until },
                ownerId: repId ? repId : undefined
            },
            select: { id: true, completedAt: true, ownerId: true, title: true }
        }),
        prisma.callAttempt.findMany({
            where: { createdAt: { gte: since, lte: until }, createdBy: repId ? repId : undefined },
            select: { id: true, outcome: true, createdAt: true, createdBy: true }
        }),
        prisma.mailAttempt.findMany({
            where: { createdAt: { gte: since, lte: until }, createdBy: repId ? repId : undefined },
            select: { id: true, outcome: true, createdAt: true, createdBy: true }
        }),
        prisma.attendanceRecord.findMany({
            where: { punchIn: { gte: since, lte: until }, userId: repId ? repId : undefined },
            select: { id: true, punchIn: true, punchOut: true, duration: true, userId: true }
        }),
        // Trend data sub-queries
        prisma.lead.findMany({
            where: { createdAt: { gte: trendSince }, ownerId: repId ? repId : undefined, isDeleted: false },
            select: { createdAt: true }
        }),
        prisma.callAttempt.findMany({
            where: { createdAt: { gte: trendSince }, createdBy: repId ? repId : undefined },
            select: { createdAt: true }
        }),
        prisma.mailAttempt.findMany({
            where: { createdAt: { gte: trendSince }, createdBy: repId ? repId : undefined },
            select: { createdAt: true }
        }),
        prisma.task.findMany({
            where: { completed: true, completedAt: { gte: trendSince }, ownerId: repId ? repId : undefined },
            select: { completedAt: true }
        }),
        prisma.opportunity.findMany({
            where: { stage: 'Closed Won', updatedAt: { gte: trendSince }, ownerId: repId ? repId : undefined },
            select: { updatedAt: true }
        })
    ])

    try {
    const activityLogs = await prisma.activityLog.findMany({
        where: { createdAt: { gte: since, lte: until }, userId: repId ? repId : undefined },
        select: { id: true, action: true, type: true, createdAt: true, userId: true, description: true },
        orderBy: { createdAt: 'desc' },
        take: 100
    })

    const stageProgressions = await prisma.stageHistory.findMany({
        where: { createdAt: { gte: since, lte: until } },
        select: { id: true, stage: true, createdAt: true, opportunity: { select: { ownerId: true } } }
    })

    const repStats = salesReps.map((rep: { id: string; name: string }) => {
        const repPeriodLeads = periodLeads.filter(l => l.ownerId === rep.id)
        const repAllLeads = allLeads.filter(l => l.ownerId === rep.id)
        const repOpps = opportunities.filter(o => o.ownerId === rep.id)
        const repPeriodTasks = periodTasks.filter(t => t.ownerId === rep.id)
        const repAllTasks = allTasks.filter(t => t.ownerId === rep.id)
        const repCalls = callAttempts.filter(c => c.createdBy === rep.id)
        const repMails = mailAttempts.filter(m => m.createdBy === rep.id)
        const repAttendance = attendanceRecords.filter(a => a.userId === rep.id)
        const repLogs = activityLogs.filter(l => l.userId === rep.id)
        const repStageProgs = stageProgressions.filter(s => s.opportunity?.ownerId === rep.id)

        const closedWon = repOpps.filter(o => o.stage === 'Closed Won').length
        const totalHours = Math.round((repAttendance.reduce((s, a) => s + (a.duration || 0), 0)) / 60)

        const statusBreakdown = repPeriodLeads.reduce((acc, l) => {
            acc[l.status] = (acc[l.status] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const callOutcomes = repCalls.reduce((acc, c) => {
            acc[c.outcome] = (acc[c.outcome] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const mailOutcomes = repMails.reduce((acc, m) => {
            acc[m.outcome] = (acc[m.outcome] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const leadsCreated = repPeriodLeads.filter(l => !l.isClaimedFromPool).length
        const leadsClaimed = repPeriodLeads.filter(l => l.isClaimedFromPool).length

        const stageProgress = repStageProgs.reduce((acc, s) => {
            acc[s.stage] = (acc[s.stage] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const completedTasks = repAllTasks.filter(t => t.completed).length
        const overdueTasks = repAllTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length
        const tasksDueToday = repAllTasks.filter(t => !t.completed && t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')).length
        const onTimeCompleted = repAllTasks.filter(t => t.completed && t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate)).length
        const taskCompletionRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 0

        const staleLeads = repAllLeads.filter(l => {
            const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
            return differenceInDays(now, lastActivity) > 7
        }).length

        const lastCall = repCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        const lastMail = repMails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        const lastActivityDate = [lastCall?.createdAt, lastMail?.createdAt].filter(Boolean).sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]
        const daysSinceActivity = lastActivityDate ? differenceInDays(now, new Date(lastActivityDate)) : null

        const stuckOpps = repOpps.filter(o => {
            if (o.stage === 'Closed Won' || o.stage === 'Closed Lost') return false
            return differenceInDays(now, new Date(o.updatedAt)) > 14
        }).length

        return {
            id: rep.id,
            name: rep.name,
            leadsCreated,
            leadsClaimed,
            totalLeads: repPeriodLeads.length,
            totalAssignedLeads: repAllLeads.length,
            opportunitiesCreated: repOpps.length,
            closedWon,
            tasksCompleted: repPeriodTasks.length,
            totalCalls: repCalls.length,
            totalEmails: repMails.length,
            totalHours,
            statusBreakdown,
            callOutcomes,
            mailOutcomes,
            stageProgress,
            taskCompletionRate,
            overdueTasks,
            tasksDueToday,
            staleLeads,
            stuckOpportunities: stuckOpps,
            daysSinceActivity,
            recentActivity: repLogs.slice(0, 10).map(l => ({
                id: l.id,
                action: l.action,
                type: l.type,
                description: l.description,
                createdAt: l.createdAt
            }))
        }
    })

    const dailyStats = []
    for (let i = 0; i < 14; i++) {
        const day = subDays(now, i)
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)

        const dayLeads = trendLeads.filter(l => l.createdAt >= dayStart && l.createdAt <= dayEnd).length
        const dayCalls = trendCalls.filter(c => c.createdAt >= dayStart && c.createdAt <= dayEnd).length
        const dayMails = trendMails.filter(m => m.createdAt >= dayStart && m.createdAt <= dayEnd).length
        const dayTasks = trendTasks.filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd).length
        const dayClosed = trendOpps.filter(o => o.updatedAt >= dayStart && o.updatedAt <= dayEnd).length

        dailyStats.push({
            date: format(dayStart, 'MMM dd'),
            leads: dayLeads,
            calls: dayCalls,
            emails: dayMails,
            tasks: dayTasks,
            closed: dayClosed
        })
    }
    dailyStats.reverse()

    const leadDistribution = {
        unassigned: allLeads.filter(l => !l.ownerId).length,
        assigned: allLeads.filter(l => l.ownerId).length,
        byRep: salesReps.map(rep => ({
            name: rep.name,
            count: allLeads.filter(l => l.ownerId === rep.id).length
        })),
        byStatus: allLeads.reduce((acc, l) => {
            acc[l.status] = (acc[l.status] || 0) + 1
            return acc
        }, {} as Record<string, number>)
    }

    const leadAging = {
        fresh: allLeads.filter(l => {
            const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
            return differenceInDays(now, lastActivity) <= 3
        }).length,
        active: allLeads.filter(l => {
            const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
            const days = differenceInDays(now, lastActivity)
            return days > 3 && days <= 7
        }).length,
        stale: allLeads.filter(l => {
            const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
            const days = differenceInDays(now, lastActivity)
            return days > 7 && days <= 14
        }).length,
        atRisk: allLeads.filter(l => {
            const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
            return differenceInDays(now, lastActivity) > 14
        }).length,
        byRep: salesReps.map(rep => {
            const repLeads = allLeads.filter(l => l.ownerId === rep.id)
            return {
                name: rep.name,
                fresh: repLeads.filter(l => {
                    const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
                    return differenceInDays(now, lastActivity) <= 3
                }).length,
                active: repLeads.filter(l => {
                    const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
                    const days = differenceInDays(now, lastActivity)
                    return days > 3 && days <= 7
                }).length,
                stale: repLeads.filter(l => {
                    const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
                    const days = differenceInDays(now, lastActivity)
                    return days > 7 && days <= 14
                }).length,
                atRisk: repLeads.filter(l => {
                    const lastActivity = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt)
                    return differenceInDays(now, lastActivity) > 14
                }).length
            }
        })
    }

    const pipelineHealth = {
        total: opportunities.length,
        won: opportunities.filter(o => o.stage === 'Closed Won').length,
        lost: opportunities.filter(o => o.stage === 'Closed Lost').length,
        active: opportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost').length,
        stuck: opportunities.filter(o => {
            if (o.stage === 'Closed Won' || o.stage === 'Closed Lost') return false
            return differenceInDays(now, new Date(o.updatedAt)) > 14
        }).length,
        byRep: salesReps.map(rep => {
            const repOpps = opportunities.filter(o => o.ownerId === rep.id)
            return {
                name: rep.name,
                total: repOpps.length,
                stuck: repOpps.filter(o => {
                    if (o.stage === 'Closed Won' || o.stage === 'Closed Lost') return false
                    return differenceInDays(now, new Date(o.updatedAt)) > 14
                }).length
            }
        })
    }

    const taskOverview = {
        total: allTasks.length,
        completed: allTasks.filter(t => t.completed).length,
        pending: allTasks.filter(t => !t.completed).length,
        overdue: allTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length,
        dueToday: allTasks.filter(t => !t.completed && t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')).length,
        byRep: salesReps.map(rep => {
            const repTasks = allTasks.filter(t => t.ownerId === rep.id)
            return {
                name: rep.name,
                total: repTasks.length,
                completed: repTasks.filter(t => t.completed).length,
                pending: repTasks.filter(t => !t.completed).length,
                overdue: repTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length
            }
        })
    }

    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const goals = await prisma.userGoal.findMany({
        where: { period: periodKey }
    })

    const goalAlerts = salesReps.map(rep => {
        const repGoals = goals.filter(g => g.userId === rep.id)
        const repLeads = periodLeads.filter(l => l.ownerId === rep.id).length
        const repClosedWon = opportunities.filter(o => o.ownerId === rep.id && o.stage === 'Closed Won').length
        const repTasks = periodTasks.filter(t => t.ownerId === rep.id).length

        const missedGoals = repGoals.map(goal => {
            let actual = 0
            if (goal.category === 'TEST_JOBS' || goal.category === 'LEADS') {
                actual = stageProgressions.filter(s => s.stage === 'Test Job Received' && s.opportunity?.ownerId === rep.id).length
            } else if (goal.category === 'DEALS') {
                actual = repClosedWon
            }

            const percent = goal.targetValue > 0 ? (actual / goal.targetValue) * 100 : 0
            const achieved = actual >= goal.targetValue

            return {
                category: goal.category,
                target: goal.targetValue,
                actual,
                percent: Math.round(percent),
                achieved
            }
        }).filter(g => !g.achieved)

        return {
            id: rep.id,
            name: rep.name,
            missedGoals,
            alertLevel: missedGoals.length > 0 ? 'warning' : 'normal'
        }
    }).filter(r => r.alertLevel !== 'normal')

    const inactivityAlerts = salesReps
        .map(rep => {
            const repCalls = callAttempts.filter(c => c.createdBy === rep.id)
            const repMails = mailAttempts.filter(m => m.createdBy === rep.id)
            const lastCall = repCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            const lastMail = repMails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            const lastActivityDate = [lastCall?.createdAt, lastMail?.createdAt].filter(Boolean).sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]
            const daysSinceActivity = lastActivityDate ? differenceInDays(now, new Date(lastActivityDate)) : null

            const repTasks = allTasks.filter(t => t.ownerId === rep.id)
            const overdueCount = repTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length

            return {
                id: rep.id,
                name: rep.name,
                daysSinceActivity,
                hasOverdueTasks: overdueCount > 0,
                overdueTaskCount: overdueCount,
                alertLevel: daysSinceActivity === null ? 'no_activity' : daysSinceActivity >= 7 ? 'critical' : daysSinceActivity >= 3 ? 'warning' : 'normal'
            }
        })
        .filter(r => r.alertLevel !== 'normal' || r.hasOverdueTasks)
        .sort((a, b) => {
            const order = { critical: 0, warning: 1, no_activity: 2, normal: 3 }
            return (order[a.alertLevel as keyof typeof order] || 3) - (order[b.alertLevel as keyof typeof order] || 3)
        })

    const globalStats = {
        totalLeads: periodLeads.length,
        totalOpportunities: opportunities.length,
        totalClosedWon: opportunities.filter(o => o.stage === 'Closed Won').length,
        totalTasks: periodTasks.length,
        totalCalls: callAttempts.length,
        totalEmails: mailAttempts.length,
        totalHours: Math.round(attendanceRecords.reduce((s, a) => s + (a.duration || 0), 0) / 60),
        activeReps: salesReps.length
    }

    return NextResponse.json({
        period,
        salesReps: repStats,
        dailyStats,
        globalStats,
        leadDistribution,
        leadAging,
        pipelineHealth,
        taskOverview,
        inactivityAlerts,
        goalAlerts,
        periodStart: since.toISOString(),
        periodEnd: now.toISOString()
    })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
