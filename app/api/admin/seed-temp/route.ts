import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const options = [
{"category":"LEAD_STATUS","value":"New","color":"#6366f1","order":0},
{"category":"LEAD_INDUSTRY","value":"Photography Studio","color":"#6366f1","order":0},
{"category":"OPPORTUNITY_STAGE","value":"Test Job Received","color":"#8b5cf6","order":0},
{"category":"TASK_PRIORITY","value":"High","color":"#ef4444","order":0},
{"category":"LEAVE_TYPE","value":"Casual Leave","color":"#6366f1","order":0},
{"category":"LEAD_STATUS","value":"Called","color":"#f59e0b","order":1},
{"category":"LEAD_INDUSTRY","value":"E-commerce / Retail","color":"#06b6d4","order":1},
{"category":"OPPORTUNITY_STAGE","value":"Test Job Sent","color":"#06b6d4","order":1},
{"category":"TASK_PRIORITY","value":"Medium","color":"#f59e0b","order":1},
{"category":"LEAVE_TYPE","value":"Sick Leave","color":"#f59e0b","order":1},
{"category":"LEAD_STATUS","value":"Mail Sent","color":"#10b981","order":2},
{"category":"LEAD_INDUSTRY","value":"Fashion & Apparel","color":"#10b981","order":2},
{"category":"OPPORTUNITY_STAGE","value":"Test Job Approved","color":"#10b981","order":2},
{"category":"TASK_PRIORITY","value":"Low","color":"#10b981","order":2},
{"category":"LEAVE_TYPE","value":"Bereavement","color":"#ef4444","order":2},
{"category":"LEAD_STATUS","value":"Lost","color":"#ef4444","order":3},
{"category":"LEAD_INDUSTRY","value":"Advertising Agency","color":"#f59e0b","order":3},
{"category":"OPPORTUNITY_STAGE","value":"Price Quote Sent","color":"#f59e0b","order":3},
{"category":"LEAD_STATUS","value":"Converted","color":"#8b5cf6","order":4},
{"category":"OPPORTUNITY_STAGE","value":"Closed Won","color":"#10b981","order":5},
{"category":"OPPORTUNITY_STAGE","value":"Closed Lost","color":"#ef4444","order":6}
        ]

        // Use upsert to safely sync without destroying existing custom options
        for (const opt of options) {
            await prisma.systemOption.upsert({
                where: { category_value: { category: opt.category, value: opt.value } },
                update: { color: opt.color, order: opt.order },
                create: opt
            })
        }

        return NextResponse.json({ success: true, message: "Standard settings synced." })
    } catch(e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
