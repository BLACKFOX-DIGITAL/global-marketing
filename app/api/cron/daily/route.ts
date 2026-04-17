import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    let isAuthorized = false
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        isAuthorized = true
    } else {
        const user = await getCurrentUser()
        if (user?.role === 'Administrator') isAuthorized = true
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const notifications: any[] = []
        const todayStr = new Date().toISOString().split('T')[0]

        // 1. Streak Risk Alerts
        const reps = await prisma.user.findMany({
            where: { role: 'Sales Rep', isSuspended: false },
            select: { id: true, name: true, lastActiveDay: true, currentStreak: true, streakFreezeAvailable: true }
        })

        for (const rep of reps) {
            // If they have a streak > 1 and haven't logged activity today
            if (rep.currentStreak > 1) {
                const lastActiveStr = rep.lastActiveDay ? new Date(rep.lastActiveDay).toISOString().split('T')[0] : null
                if (lastActiveStr !== todayStr) {
                    notifications.push({
                        userId: rep.id,
                        type: 'WARNING',
                        title: '🔥 Streak At Risk!',
                        message: `You haven't logged any activity today! Log an action now or activate your Streak Freeze to save your ${rep.currentStreak}-day streak!`,
                        link: '/dashboard'
                    })
                }
            }
        }

        // 2. Task Deadlines & Overdue Warnings
        const pendingTasks = await prisma.task.findMany({
            where: { completed: false, dueDate: { not: null } },
            select: { id: true, ownerId: true, title: true, dueDate: true }
        })

        const now = new Date()
        
        for (const task of pendingTasks) {
            if (!task.dueDate) continue
            const dueStr = task.dueDate.toISOString().split('T')[0]
            
            if (dueStr === todayStr) {
                // Due today
                notifications.push({
                    userId: task.ownerId,
                    type: 'SYSTEM_WARNING',
                    title: '📋 Task Due Today',
                    message: `Reminder: "${task.title}" is due today.`,
                    link: '/tasks'
                })
            } else if (task.dueDate < now) {
                // Overdue
                notifications.push({
                    userId: task.ownerId,
                    type: 'URGENT',
                    title: '🚨 Overdue Task!',
                    message: `Action Required: "${task.title}" is actively overdue!`,
                    link: '/tasks'
                })
            }
        }

        // Store all generated notifications
        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications })
        }

        return NextResponse.json({ 
            message: 'Daily cron executed.', 
            streakAlertsSent: notifications.filter(n => n.title.includes('Streak')).length,
            taskAlertsSent: notifications.filter(n => n.title.includes('Task')).length
        })
    } catch (error) {
        console.error('Daily cron processing failed:', error)
        return NextResponse.json({ error: 'Failed to execute daily cron updates' }, { status: 500 })
    }
}
