import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

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
    const backupPath = process.argv[2]
    if (!backupPath) {
        console.error('Usage: npx ts-node scripts/import-db.ts <path-to-backup.json>')
        process.exit(1)
    }

    const absolutePath = path.resolve(backupPath)
    if (!fs.existsSync(absolutePath)) {
        console.error(`Error: File not found at ${absolutePath}`)
        process.exit(1)
    }

    console.log(`Reading backup from ${absolutePath}...`)
    const rawData = fs.readFileSync(absolutePath, 'utf8')
    const backup = JSON.parse(rawData)

    if (!backup.data || typeof backup.data !== 'object') {
        console.error('Error: Invalid backup format. Missing "data" object.')
        process.exit(1)
    }

    const backupData = backup.data

    console.log('Starting database import...')

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete all existing data in REVERSE order of dependencies
            const reverseOrder = [...TABLES_ORDER].reverse()
            console.log('Cleaning up existing data...')
            for (const table of reverseOrder) {
                const modelName = table.charAt(0).toLowerCase() + table.slice(1)
                const model = (tx as any)[modelName]
                if (model) {
                    const count = await model.deleteMany({})
                    if (count.count > 0) {
                        console.log(`  - Deleted ${count.count} records from ${table}`)
                    }
                }
            }

            // 2. Insert new data in the correct order
            console.log('Importing new data...')
            for (const table of TABLES_ORDER) {
                const modelName = table.charAt(0).toLowerCase() + table.slice(1)
                const records = backupData[table]
                
                if (records && Array.isArray(records) && records.length > 0) {
                    const model = (tx as any)[modelName]
                    console.log(`  + Importing ${records.length} records into ${table}...`)
                    
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
            timeout: 300000 // 5 minutes for large datasets
        })

        console.log('\nSuccess: Database imported successfully!')
    } catch (error) {
        console.error('\nImport failed:', error)
        process.exit(1)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
