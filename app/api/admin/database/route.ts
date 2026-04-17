import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Define the order of tables to respect foreign key constraints during import
const TABLES_ORDER = [
    'User',
    'Achievement',
    'SystemOption',
    'SystemSetting',
    'Holiday',
    'Lead',
    'Contact',
    'Opportunity',
    'Task',
    'ActivityLog',
    'Notification',
    'UserGoal',
    'StageHistory',
    'CallAttempt',
    'MailAttempt',
    'LeadNote',
    'Reminder',
    'AttendanceRecord',
    'LeaveRequest',
    'UserAchievement',
    'XPHistory',
    'MonthlyAward'
]

export async function GET() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const data: Record<string, any[]> = {}

        // Construct dynamic queries for all tables
        for (const table of TABLES_ORDER) {
            const model = (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)]
            if (model) {
                data[table] = await model.findMany()
            }
        }

        const backup = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data
        }

        return new NextResponse(JSON.stringify(backup, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="cfm-backup-${new Date().toISOString().split('T')[0]}.json"`
            }
        })
    } catch (error) {
        console.error('Export failed:', error)
        return NextResponse.json({ error: 'Export failed' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        if (!body.data || typeof body.data !== 'object') {
            return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 })
        }

        const backupData = body.data

        // Run entire import in a single transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete all existing data in REVERSE order of dependencies
            const reverseOrder = [...TABLES_ORDER].reverse()
            for (const table of reverseOrder) {
                const model = (tx as any)[table.charAt(0).toLowerCase() + table.slice(1)]
                if (model) {
                    await model.deleteMany({})
                }
            }

            // 2. Insert new data in the correct order
            for (const table of TABLES_ORDER) {
                const modelName = table.charAt(0).toLowerCase() + table.slice(1)
                const records = backupData[table]
                
                if (records && Array.isArray(records) && records.length > 0) {
                    const model = (tx as any)[modelName]
                    
                    // SQLite createMany support exists but we'll loop to handle any potential Prisma quirks with ID mapping
                    // or just use createMany if we are confident.
                    // For safety and compatibility with Prisma's ID handling:
                    for (const record of records) {
                        // Convert ISO date strings back to Date objects
                        const processedRecord = { ...record }
                        for (const key in processedRecord) {
                            if (typeof processedRecord[key] === 'string' && 
                                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(processedRecord[key])) {
                                processedRecord[key] = new Date(processedRecord[key])
                            }
                        }
                        
                        await model.create({ data: processedRecord })
                    }
                }
            }
        }, {
            timeout: 60000 // Increase timeout for large datasets
        })

        return NextResponse.json({ success: true, message: 'Database imported successfully' })
    } catch (error) {
        console.error('Import failed:', error)
        return NextResponse.json({ error: 'Import failed: ' + (error as any).message }, { status: 500 })
    }
}
