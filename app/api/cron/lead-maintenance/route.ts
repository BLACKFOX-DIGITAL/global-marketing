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
        const sixtyDaysAgo = subDays(now, recycleDays)

        const priorityWindows: Record<string, { warn: number; reclaim: number; graceDays: number }> = {
            'High': { 
                warn: parseInt(config['WARN_HIGH'] || '5'), 
                reclaim: parseInt(config['RECLAIM_HIGH'] || '7'),
                graceDays: parseInt(config['RECLAIM_HIGH'] || '7') - parseInt(config['WARN_HIGH'] || '5')
            },
            'Medium': { 
                warn: parseInt(config['WARN_MEDIUM'] || '12'), 
                reclaim: parseInt(config['RECLAIM_MEDIUM'] || '14'),
                graceDays: parseInt(config['RECLAIM_MEDIUM'] || '14') - parseInt(config['WARN_MEDIUM'] || '12')
            },
            'Low': { 
                warn: parseInt(config['WARN_LOW'] || '19'), 
                reclaim: parseInt(config['RECLAIM_LOW'] || '21'),
                graceDays: parseInt(config['RECLAIM_LOW'] || '21') - parseInt(config['WARN_LOW'] || '19')
            },
        }

        // 1. Recirculate Lost Leads (60+ days of inactivity)
        const lostLeads = await prisma.lead.findMany({
            where: {
                status: 'Lost',
                lastActivityAt: { lt: sixtyDaysAgo },
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
            await logActivity({
                userId: lead.ownerId!,
                type: 'SYSTEM',
                action: 'RECIRCULATED',
                description: `Lost lead auto-recirculated to open pool after ${recycleDays} days of inactivity.`,
                leadId: lead.id
            })
            recirculatedCount++
        }

        // 2. Priority-Based Stale Lead Maintenance (Warnings & Reclaims)
        let reclaimedCount = 0
        let warningsIssued = 0

        for (const [priority, { warn, reclaim, graceDays }] of Object.entries(priorityWindows)) {
            const reclaimCutoff = subDays(now, reclaim)
            const warnCutoff = subDays(now, warn)

            // Find all active leads in or past the warning window
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
                            title: { startsWith: 'WARNING: Auto-Reclaim' },
                            completed: false 
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            })

            for (const lead of alertCandidates) {
                const activityDate = lead.lastMeaningfulActivityAt || lead.lastActivityAt
                const existingWarning = lead.tasks[0]
                const daysInactive = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

                // SCENARIO A: Lead is past RECLAIM age
                if (daysInactive >= reclaim) {
                    // Check if it's had a warning for the required grace period
                    if (existingWarning && existingWarning.createdAt <= subDays(now, graceDays)) {
                        // All conditions met: Warning exists and has aged enough. Reclaim it.
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
                        await logActivity({
                            userId: lead.ownerId!,
                            type: 'SYSTEM',
                            action: 'RECLAIMED',
                            description: `${priority}-priority lead reclaimed after ${daysInactive} days without activity (Mandatory grace period satisfied).`,
                            leadId: lead.id
                        })
                        reclaimedCount++
                        continue // Lead is gone, skip warning creation
                    } 
                    // If it's past reclaim but NO warning exists, we MUST warn first (Scenario B handles this)
                }

                // SCENARIO B: Issue Warning (either because it's in the window or past reclaim without previous notice)
                if (!existingWarning) {
                    const daysLeft = Math.max(graceDays, reclaim - daysInactive)
                    
                    // Create Task
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

                    // Create Notification for the Bell/Notification Center
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

        logger.info('Lead maintenance complete', { recirculatedCount, reclaimedCount, warningsIssued })

        return NextResponse.json({
            success: true,
            recirculatedCount,
            reclaimedCount,
            warningsIssued,
            priorityWindows,
        })

    } catch (error) {
        logger.error('Lead maintenance failed', { error: String(error) })
        return NextResponse.json({ error: 'Maintenance failed' }, { status: 500 })
    }
}
