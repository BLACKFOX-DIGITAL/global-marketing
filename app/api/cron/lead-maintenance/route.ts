import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'
import { logActivity } from '@/lib/activity'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return new NextResponse('Internal Server Error: CRON_SECRET not configured', { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const now = new Date()

        // Fetch dynamic settings
        const settingKeys = [
            'RECYCLE_DAYS', 'CLAIM_LIMIT',
            'RECLAIM_HIGH', 'WARN_HIGH',
            'RECLAIM_MEDIUM', 'WARN_MEDIUM',
            'RECLAIM_LOW', 'WARN_LOW'
        ]
        const dbSettings = await prisma.systemSetting.findMany({
            where: { key: { in: settingKeys } }
        })
        const config: Record<string, string> = {}
        dbSettings.forEach(s => config[s.key] = s.value)

        const recycleDays = parseInt(config['RECYCLE_DAYS'] || '60')
        const recycleWarnDays = 7 // Days before recirculation to send advance warning
        const recycleCutoff = subDays(now, recycleDays)

        // Enforce minimum 1-day grace period so a lead can never be reclaimed the same day it's warned
        const priorityWindows: Record<string, { warn: number; reclaim: number; graceDays: number }> = {
            'High': {
                warn: parseInt(config['WARN_HIGH'] || '5'),
                reclaim: parseInt(config['RECLAIM_HIGH'] || '7'),
                graceDays: Math.max(1, parseInt(config['RECLAIM_HIGH'] || '7') - parseInt(config['WARN_HIGH'] || '5'))
            },
            'Medium': {
                warn: parseInt(config['WARN_MEDIUM'] || '12'),
                reclaim: parseInt(config['RECLAIM_MEDIUM'] || '14'),
                graceDays: Math.max(1, parseInt(config['RECLAIM_MEDIUM'] || '14') - parseInt(config['WARN_MEDIUM'] || '12'))
            },
            'Low': {
                warn: parseInt(config['WARN_LOW'] || '19'),
                reclaim: parseInt(config['RECLAIM_LOW'] || '21'),
                graceDays: Math.max(1, parseInt(config['RECLAIM_LOW'] || '21') - parseInt(config['WARN_LOW'] || '19'))
            },
        }

        // 0. Pre-Recirculation Warning (7 days before a Lost lead gets recycled)
        let preRecycleWarningsIssued = 0
        if (recycleDays > recycleWarnDays) {
            const preWarnCutoff = subDays(now, recycleDays - recycleWarnDays)
            const preWarnLeads = await prisma.lead.findMany({
                where: {
                    status: 'Lost',
                    ownerId: { not: null },
                    lastActivityAt: {
                        lt: preWarnCutoff,    // at least (recycleDays - 7) days of inactivity
                        gte: recycleCutoff,   // but not yet past the recirculation threshold
                    }
                },
                include: {
                    tasks: {
                        where: { title: { startsWith: 'WARNING: Lead Recycling in' }, completed: false },
                        take: 1
                    }
                }
            })

            for (const lead of preWarnLeads) {
                if (lead.tasks.length > 0) continue // already warned this cycle

                const daysInactive = Math.floor((now.getTime() - lead.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
                const daysUntilRecycle = recycleDays - daysInactive

                await prisma.task.create({
                    data: {
                        title: `WARNING: Lead Recycling in ${daysUntilRecycle} days`,
                        description: `Lost lead "${lead.company || lead.name}" has been inactive for ${daysInactive} days. It will be returned to the Open Pool in ${daysUntilRecycle} days.`,
                        priority: 'Medium',
                        taskType: 'System Warning',
                        status: 'Pending',
                        dueDate: subDays(now, -daysUntilRecycle),
                        ownerId: lead.ownerId,
                        leadId: lead.id
                    }
                })
                await prisma.notification.create({
                    data: {
                        userId: lead.ownerId!,
                        title: '⚠️ Lost Lead Returning to Pool Soon',
                        message: `Lead "${lead.company || lead.name}" will be recycled to the Open Pool in ${daysUntilRecycle} days due to inactivity.`,
                        type: 'SYSTEM_WARNING',
                        link: `/leads/${lead.id}`
                    }
                })
                preRecycleWarningsIssued++
            }
        }

        // 1. Recirculate Lost Leads (60+ days of inactivity)
        const lostLeads = await prisma.lead.findMany({
            where: {
                status: 'Lost',
                lastActivityAt: { lt: recycleCutoff },
                ownerId: { not: null }
            }
        })

        let recirculatedCount = 0
        for (const lead of lostLeads) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    ownerId: null,
                    status: 'Open Pool',
                    previousOwnerId: lead.ownerId,
                    isClaimedFromPool: false,
                    lastActivityAt: new Date(),
                }
            })
            // Close all open tasks for this lead — rep no longer owns it, orphaned tasks
            // would appear in their task list pointing to a lead they can't access
            await prisma.task.updateMany({
                where: { leadId: lead.id, completed: false },
                data: { completed: true, completedAt: new Date(), status: 'Completed' }
            })
            await logActivity({
                userId: lead.ownerId!,
                type: 'SYSTEM',
                action: 'RECIRCULATED',
                description: `Lost lead auto-recirculated to open pool after ${recycleDays} days of inactivity.`,
                leadId: lead.id
            })
            await prisma.notification.create({
                data: {
                    userId: lead.ownerId!,
                    title: '♻️ Lead Returned to Pool',
                    message: `Lead "${lead.company || lead.name}" was a Lost lead with no activity for ${recycleDays}+ days and has been returned to the Open Pool.`,
                    type: 'SYSTEM_WARNING',
                    link: `/leads/${lead.id}`
                }
            })
            recirculatedCount++
        }

        // 2. Priority-Based Stale Lead Maintenance (Warnings & Reclaims)
        let reclaimedCount = 0
        let warningsIssued = 0
        let finalWarningsIssued = 0

        for (const [priority, { warn, reclaim, graceDays }] of Object.entries(priorityWindows)) {
            const warnCutoff = subDays(now, warn)

            // Fetch active leads in or past the warning window, including all open system warning tasks
            const alertCandidates = await prisma.lead.findMany({
                where: {
                    ownerId: { not: null },
                    priority,
                    status: { notIn: ['Lost', 'Won', 'Converted', 'Active Client', 'Open Pool'] },
                    OR: [
                        { lastMeaningfulActivityAt: { lt: warnCutoff } },
                        {
                            lastMeaningfulActivityAt: null,
                            lastActivityAt: { lt: warnCutoff }
                        }
                    ]
                },
                include: {
                    tasks: {
                        where: {
                            taskType: 'System Warning'
                            // Include both completed and incomplete — if a rep manually marks a
                            // warning complete, we still need to detect it so the reclaim proceeds
                            // instead of issuing a duplicate warning.
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            })

            for (const lead of alertCandidates) {
                const activityDate = lead.lastMeaningfulActivityAt || lead.lastActivityAt
                const existingWarning = lead.tasks.find(t => t.title.startsWith('WARNING: Auto-Reclaim'))
                const existingFinalWarning = lead.tasks.find(t => t.title.startsWith('FINAL WARNING:'))
                const daysInactive = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

                // SCENARIO A: Lead is past RECLAIM age
                if (daysInactive >= reclaim) {
                    if (existingWarning && existingWarning.createdAt <= subDays(now, graceDays)) {
                        // Warning exists and grace period has passed — reclaim the lead
                        await prisma.lead.update({
                            where: { id: lead.id },
                            data: {
                                ownerId: null,
                                status: 'Open Pool',
                                previousOwnerId: lead.ownerId,
                                isClaimedFromPool: false,
                                lastActivityAt: new Date(),
                            }
                        })
                        // Close all open tasks — rep no longer owns the lead, orphaned tasks
                        // would appear in their list pointing to a lead they can't access
                        await prisma.task.updateMany({
                            where: { leadId: lead.id, completed: false },
                            data: { completed: true, completedAt: new Date(), status: 'Completed' }
                        })
                        await logActivity({
                            userId: lead.ownerId!,
                            type: 'SYSTEM',
                            action: 'RECLAIMED',
                            description: `${priority}-priority lead reclaimed after ${daysInactive} days without activity (Mandatory grace period satisfied).`,
                            leadId: lead.id
                        })
                        await prisma.notification.create({
                            data: {
                                userId: lead.ownerId!,
                                title: '🔴 Lead Reclaimed',
                                message: `Lead "${lead.company || lead.name}" has been moved to the Open Pool after ${daysInactive} days of inactivity. The grace period has expired.`,
                                type: 'SYSTEM_WARNING',
                                link: `/leads/${lead.id}`
                            }
                        })
                        reclaimedCount++
                        continue
                    }
                    // Past reclaim but no warning yet — fall through to Scenario B to warn first
                }

                // SCENARIO C: Final warning — 1 day or less until reclaim deadline
                if (existingWarning && !existingFinalWarning) {
                    const daysLeft = Math.max(0, reclaim - daysInactive)
                    if (daysLeft <= 1) {
                        await prisma.task.create({
                            data: {
                                title: `FINAL WARNING: Lead reclaim is imminent`,
                                description: `This ${priority}-priority lead will be moved to the Open Pool within 24 hours. Log a call or send an email immediately to keep it.`,
                                priority: 'High',
                                taskType: 'System Warning',
                                status: 'Pending',
                                dueDate: subDays(now, -1),
                                ownerId: lead.ownerId,
                                leadId: lead.id
                            }
                        })
                        await prisma.notification.create({
                            data: {
                                userId: lead.ownerId!,
                                title: '🚨 Lead Reclaim Imminent',
                                message: `Lead "${lead.company || lead.name}" will be moved to the Open Pool within 24 hours. Act now!`,
                                type: 'SYSTEM_WARNING',
                                link: `/leads/${lead.id}`
                            }
                        })
                        finalWarningsIssued++
                        continue
                    }
                }

                // SCENARIO B: Issue initial warning
                if (!existingWarning) {
                    const daysLeft = Math.max(graceDays, reclaim - daysInactive)

                    await prisma.task.create({
                        data: {
                            title: `WARNING: Auto-Reclaim in ${daysLeft * 24} hours`,
                            description: `This ${priority}-priority lead has had no real sales activity for ${daysInactive} days. It will be moved to the Open Pool in ${daysLeft} days unless you log a call or send an email.`,
                            priority: 'High',
                            taskType: 'System Warning',
                            status: 'Pending',
                            dueDate: subDays(now, -daysLeft),
                            ownerId: lead.ownerId,
                            leadId: lead.id
                        }
                    })
                    await prisma.notification.create({
                        data: {
                            userId: lead.ownerId!,
                            title: '⏳ Lead at Risk of Reclaim',
                            message: `Lead "${lead.company || lead.name}" will be moved to the pool in ${daysLeft} days due to inactivity.`,
                            type: 'SYSTEM_WARNING',
                            link: `/leads/${lead.id}`
                        }
                    })
                    warningsIssued++
                }
            }
        }

        logger.info('Lead maintenance complete', {
            preRecycleWarningsIssued,
            recirculatedCount,
            reclaimedCount,
            warningsIssued,
            finalWarningsIssued,
        })

        return NextResponse.json({
            success: true,
            preRecycleWarningsIssued,
            recirculatedCount,
            reclaimedCount,
            warningsIssued,
            finalWarningsIssued,
            priorityWindows,
        })

    } catch (error) {
        logger.error('Lead maintenance failed', { error: String(error) })
        return NextResponse.json({ error: 'Maintenance failed' }, { status: 500 })
    }
}
