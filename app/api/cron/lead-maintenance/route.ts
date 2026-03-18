import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'
import { logActivity } from '@/lib/activity'

export async function GET(req: Request) {
    // In production, authenticate this via a secret token from your cron service
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
            where: { key: { in: ['STALE_DAYS', 'RECYCLE_DAYS'] } }
        })
        const staleDays = parseInt(settings.find((s: any) => s.key === 'STALE_DAYS')?.value || '14')
        const recycleDays = parseInt(settings.find((s: any) => s.key === 'RECYCLE_DAYS')?.value || '60')

        const fourteenDaysAgo = subDays(now, staleDays)
        const twelveDaysAgo = subDays(now, staleDays - 2)
        const sixtyDaysAgo = subDays(now, recycleDays)

        // 1. Recirculate Lost Leads (60+ days)
        // Set ownerId to null, status to 'New', isClaimedFromPool to false
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
                    previousOwnerId: lead.ownerId, // So they can't reclaim it immediately
                    isClaimedFromPool: false,
                    lastActivityAt: new Date(), // Reset clock
                }
            })
            // Log it
            await logActivity({
                userId: lead.ownerId!,
                type: 'SYSTEM',
                action: 'RECIRCULATED',
                description: 'Lost lead automatically recirculated to open pool after 60 days of inactivity.',
                leadId: lead.id
            })
            recirculatedCount++
        }

        // 2. Strip Stale Active Leads (> 14 days no activity)
        const staleLeads = await prisma.lead.findMany({
            where: {
                ownerId: { not: null },
                status: { notIn: ['Lost', 'Won', 'Converted', 'Active Client'] },
                lastActivityAt: { lt: fourteenDaysAgo }
            }
        })

        let reclaimedCount = 0
        for (const lead of staleLeads) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    ownerId: null,
                    status: 'Open Pool',
                    previousOwnerId: lead.ownerId,
                    isClaimedFromPool: false,
                    lastActivityAt: new Date(), // Reset clock
                }
            })

            await logActivity({
                userId: lead.ownerId!,
                type: 'SYSTEM',
                action: 'RECLAIMED',
                description: 'Lead reclaimed from rep due to 14 days of inactivity.',
                leadId: lead.id
            })
            reclaimedCount++
        }

        // 3. Issue Warnings (12 days no activity + warning not already generated recently)
        // A simple way to check if a warning wasn't already generated is to check if there is a task created in the last 2 days with the title "Warning: Lead will be reclaimed"
        const warningLeads = await prisma.lead.findMany({
            where: {
                ownerId: { not: null },
                status: { notIn: ['Lost', 'Won', 'Converted', 'Active Client'] },
                lastActivityAt: { lt: twelveDaysAgo, gte: fourteenDaysAgo }
            }
        })

        let warningsIssued = 0
        for (const lead of warningLeads) {
            const existingTask = await prisma.task.findFirst({
                where: {
                    leadId: lead.id,
                    title: { startsWith: 'WARNING: Auto-Reclaim' }
                }
            })

            if (!existingTask) {
                await prisma.task.create({
                    data: {
                        title: 'WARNING: Auto-Reclaim in 48 hours',
                        description: 'You have not interacted with this lead for 12 days. It will be reclaimed and put in the Open Pool in 48 hours unless you log an activity (task, note, call, etc).',
                        priority: 'High',
                        taskType: 'System Warning',
                        status: 'Pending',
                        dueDate: subDays(now, -2), // Due in 2 days
                        ownerId: lead.ownerId,
                        leadId: lead.id
                    }
                })
                warningsIssued++
            }
        }

        return NextResponse.json({
            success: true,
            recirculatedCount,
            reclaimedCount,
            warningsIssued
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Maintenance failed' }, { status: 500 })
    }
}
