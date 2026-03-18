import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { seedAchievements } from '@/lib/gamification'

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Not found', { status: 404 })
    }

    const defaults = [
        { category: 'LEAD_STATUS', value: 'New', color: '#6366f1', order: 0 },
        { category: 'LEAD_STATUS', value: 'Called', color: '#f59e0b', order: 1 },
        { category: 'LEAD_STATUS', value: 'Mail Sent', color: '#10b981', order: 2 },
        { category: 'LEAD_STATUS', value: 'Lost', color: '#ef4444', order: 3 },
        { category: 'LEAD_STATUS', value: 'Converted', color: '#8b5cf6', order: 4 },

        { category: 'LEAD_INDUSTRY', value: 'Photography Studio', color: '#6366f1', order: 0 },
        { category: 'LEAD_INDUSTRY', value: 'E-commerce / Retail', color: '#06b6d4', order: 1 },
        { category: 'LEAD_INDUSTRY', value: 'Fashion & Apparel', color: '#10b981', order: 2 },
        { category: 'LEAD_INDUSTRY', value: 'Advertising / Creative Agency', color: '#f59e0b', order: 3 },
        { category: 'LEAD_INDUSTRY', value: 'Media & Publishing', color: '#8b5cf6', order: 4 },
        { category: 'LEAD_INDUSTRY', value: 'Real Estate', color: '#ef4444', order: 5 },
        { category: 'LEAD_INDUSTRY', value: 'Product Manufacturing', color: '#94a3b8', order: 6 },
        { category: 'LEAD_INDUSTRY', value: 'Other', color: '#64748b', order: 7 },

        { category: 'OPPORTUNITY_STAGE', value: 'Test Job Received', color: '#8b5cf6', order: 0 },
        { category: 'OPPORTUNITY_STAGE', value: 'Test Job Sent', color: '#06b6d4', order: 1 },
        { category: 'OPPORTUNITY_STAGE', value: 'Test Job Approved', color: '#10b981', order: 2 },
        { category: 'OPPORTUNITY_STAGE', value: 'Price Quote Sent', color: '#f59e0b', order: 3 },
        { category: 'OPPORTUNITY_STAGE', value: 'Approval Pending', color: '#f43f5e', order: 4 },

        { category: 'TASK_PRIORITY', value: 'High', color: '#ef4444', order: 0 },
        { category: 'TASK_PRIORITY', value: 'Medium', color: '#f59e0b', order: 1 },
        { category: 'TASK_PRIORITY', value: 'Low', color: '#10b981', order: 2 },

        { category: 'LEAVE_TYPE', value: 'Casual Leave', color: '#6366f1', order: 0 },
        { category: 'LEAVE_TYPE', value: 'Sick Leave', color: '#f59e0b', order: 1 },
    ]

    try {
        for (const opt of defaults) {
            const existing = await prisma.systemOption.findFirst({
                where: { category: opt.category, value: opt.value }
            })
            if (!existing) {
                await prisma.systemOption.create({ data: opt })
            }
        }

        // Seed gamification achievements
        await seedAchievements()

        return NextResponse.json({ success: true, message: 'Seeded default system options and achievements.' })
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
