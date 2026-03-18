import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
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
        
        // This acts as a soft sync to ensure all standard definitions exist
        await prisma.systemOption.deleteMany({
            where: {
                category: { in: ['LEAD_STATUS', 'LEAD_INDUSTRY', 'OPPORTUNITY_STAGE', 'TASK_PRIORITY', 'LEAVE_TYPE'] }
            }
        })

        await prisma.systemOption.createMany({
            data: options
        })

        return NextResponse.json({ success: true, message: "Standard settings successfully migrated to Live database!" })
    } catch(e) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
