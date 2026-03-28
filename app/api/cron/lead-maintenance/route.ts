import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'
import { logActivity } from '@/lib/activity'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
    const expectedSecret = process.env.CRON_SECRET || 'local_cron_secret'

    if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
        return new NextResponse('Internal Server Error: CRON_SECRET not configured', { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${expectedSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const now = new Date()

        // Fetch dynamic settings
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: ['RECYCLE_DAYS', 'CLAIM_LIMIT'] } }
        })
        const recycleDays = parseInt(settings.find((s: any) => s.key === 'RECYCLE_DAYS')?.value || '60')
        const sixtyDaysAgo = subDays(now, recycleDays)

        // Priority-based reclaim windows (in days)
        // High priority leads must be worked more urgently
        const priorityWindows: Record<string, { warn: number; reclaim: number }> = {
            'High':   { warn: 5,  reclaim: 7  },
            'Medium': { warn: 12, reclaim: 14 },
            'Low':    { warn: 19, reclaim: 21 },
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

        // 2. Priority-Based Stale Lead Reclaim
        // Uses lastMeaningfulActivityAt (calls/emails only) — notes do NOT reset the clock
        let reclaimedCount = 0
        let warningsIssued = 0

        for (const [priority, { warn, reclaim }] of Object.entries(priorityWindows)) {
            const reclaimCutoff = subDays(now, reclaim)
            const warnCutoff = subDays(now, warn)

            // Reclaim leads that have had no meaningful activity beyond the priority window
            const staleLeads = await prisma.lead.findMany({
                where: {
                    ownerId: { not: null },
                    priority,
                    status: { notIn: ['Lost', 'Won', 'Converted', 'Active Client', 'Open Pool'] },
                    OR: [
                        { lastMeaningfulActivityAt: { lt: reclaimCutoff } },
                        {
                            lastMeaningfulActivityAt: null,
                            lastActivityAt: { lt: reclaimCutoff }
                        }
                    ]
                }
            })

            for (const lead of staleLeads) {
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
                    description: `${priority}-priority lead reclaimed after ${reclaim} days without a meaningful sales action (call/email).`,
                    leadId: lead.id
                })
                reclaimedCount++
            }

            // Issue warnings for leads approaching the reclaim cutoff
            const warningLeads = await prisma.lead.findMany({
                where: {
                    ownerId: { not: null },
                    priority,
                    status: { notIn: ['Lost', 'Won', 'Converted', 'Active Client', 'Open Pool'] },
                    OR: [
                        { lastMeaningfulActivityAt: { lt: warnCutoff, gte: reclaimCutoff } },
                        {
                            lastMeaningfulActivityAt: null,
                            lastActivityAt: { lt: warnCutoff, gte: reclaimCutoff }
                        }
                    ]
                }
            })

            for (const lead of warningLeads) {
                const existing = await prisma.task.findFirst({
                    where: { leadId: lead.id, title: { startsWith: 'WARNING: Auto-Reclaim' } }
                })
                if (!existing) {
                    const daysLeft = reclaim - warn
                    await prisma.task.create({
                        data: {
                            title: `WARNING: Auto-Reclaim in ${daysLeft * 24} hours`,
                            description: `This ${priority}-priority lead has had no real sales activity (calls/emails) for ${warn} days. It will be moved to the Open Pool in ${daysLeft} days unless you log a call or send an email. Notes alone do not count.`,
                            priority: 'High',
                            taskType: 'System Warning',
                            status: 'Pending',
                            dueDate: subDays(now, -daysLeft),
                            ownerId: lead.ownerId,
                            leadId: lead.id
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
