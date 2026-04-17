import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

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
    'Attachment',
    'UserGoal',
    'StageHistory',
    'CallAttempt',
    'MailAttempt',
    'AttendanceRecord',
    'LeaveRequest',
    'UserAchievement',
    'XPHistory'
]

async function main() {
    const backupPath = path.join(process.cwd(), 'cfm-backup-2026-04-09.json')
    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found at:', backupPath)
        return
    }

    console.log('Reading backup file...')
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    const backupData = backup.data

    console.log('Starting data import transaction...')
    
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete all existing data in REVERSE order
            console.log('Wiping existing data...')
            const reverseOrder = [...TABLES_ORDER].reverse()
            for (const table of reverseOrder) {
                const modelName = table.charAt(0).toLowerCase() + table.slice(1)
                const model = (tx as any)[modelName]
                if (model) {
                    await model.deleteMany({})
                }
            }

            // 2. Insert new data in order
            for (const table of TABLES_ORDER) {
                const modelName = table.charAt(0).toLowerCase() + table.slice(1)
                const records = backupData[table]
                
                if (records && Array.isArray(records) && records.length > 0) {
                    process.stdout.write(`Importing ${records.length} records into ${table}... `)
                    const model = (tx as any)[modelName]
                    
                    const processedRecords = records.map(record => {
                        const processed = { ...record }
                        for (const key in processed) {
                            if (typeof processed[key] === 'string' && 
                                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(processed[key])) {
                                processed[key] = new Date(processed[key])
                            }
                        }
                        return processed
                    })

                    // Use createMany for speed if supported, otherwise fallback to loop
                    try {
                        await model.createMany({ data: processedRecords })
                    } catch (e) {
                        // Fallback to individual creates if there's a unique constraint issue or other error
                        for (const record of processedRecords) {
                            await model.create({ data: record })
                        }
                    }
                    console.log('Done.')
                }
            }
        }, {
            timeout: 120000 // 2 minutes timeout for large datasets
        })

        console.log('✅ Import successful!')
    } catch (error) {
        console.error('❌ Import failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
