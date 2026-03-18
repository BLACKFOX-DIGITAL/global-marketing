import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
    console.log('🌱 Seeding database with comprehensive data...')

    // Cleanup existing data in correct order
    await prisma.activityLog.deleteMany({})
    await prisma.task.deleteMany({})
    await prisma.stageHistory.deleteMany({})
    await prisma.userAchievement.deleteMany({})
    await prisma.achievement.deleteMany({})
    await prisma.opportunity.deleteMany({})
    await prisma.mailAttempt.deleteMany({})
    await prisma.callAttempt.deleteMany({})
    await prisma.attachment.deleteMany({})
    await prisma.contact.deleteMany({})
    await prisma.lead.deleteMany({})
    await prisma.userGoal.deleteMany({})
    await prisma.attendanceRecord.deleteMany({})
    await prisma.leaveRequest.deleteMany({})
    await prisma.holiday.deleteMany({})
    await prisma.systemOption.deleteMany({})
    await prisma.systemSetting.deleteMany({})
    await prisma.emailTemplate.deleteMany({})
    await prisma.notification.deleteMany({})
    await prisma.xPHistory.deleteMany({})
    await prisma.user.deleteMany({ where: { email: { notIn: ['admin@businesshub.com', 'user@businesshub.com'] } } })

    // Create/Upsert core users
    const hashedAdmin = await bcrypt.hash('admin123', 12)
    const hashedUser = await bcrypt.hash('user123', 12)
    
    console.log('👥 Creating team members...')
    const teamData = [
        { name: 'Sarah Miller', email: 'sarah.m@businesshub.com', password: hashedUser, role: 'SalesRep', baseSalary: 4500 },
        { name: 'David Wilson', email: 'david.w@businesshub.com', password: hashedUser, role: 'SalesRep', baseSalary: 4200 },
        { name: 'Jessica Alba', email: 'jess.a@businesshub.com', password: hashedUser, role: 'SalesRep', baseSalary: 4800 },
        { name: 'Kevin Hart', email: 'kevin.h@businesshub.com', password: hashedUser, role: 'SalesRep', baseSalary: 4000 },
        { name: 'System Admin', email: 'admin@businesshub.com', password: hashedAdmin, role: 'Administrator', baseSalary: 8000 },
        { name: 'Normal User', email: 'user@businesshub.com', password: hashedUser, role: 'SalesRep', baseSalary: 3500 }
    ]

    for (const u of teamData) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { 
                role: u.role,
                baseSalary: u.baseSalary,
                xp: u.email === 'user@businesshub.com' ? 1250 : 0,
                level: u.email === 'user@businesshub.com' ? 13 : 1
            },
            create: {
                ...u,
                xp: u.email === 'user@businesshub.com' ? 1250 : 0,
                level: u.email === 'user@businesshub.com' ? 13 : 1,
                lastActiveDay: new Date()
            }
        })
    }

    const allUsers = await prisma.user.findMany()
    const normalUser = allUsers.find(u => u.email === 'user@businesshub.com')!
    const adminUser = allUsers.find(u => u.role === 'Administrator')!

    // Seed System Options
    console.log('⚙️ Seeding system options...')
    const systemOptions = [
        { category: 'LEAD_STATUS', value: 'New', color: '#6366f1', order: 0 },
        { category: 'LEAD_STATUS', value: 'Called', color: '#f59e0b', order: 1 },
        { category: 'LEAD_STATUS', value: 'Mail Sent', color: '#10b981', order: 2 },
        { category: 'LEAD_STATUS', value: 'Lost', color: '#ef4444', order: 3 },
        { category: 'LEAD_STATUS', value: 'Converted', color: '#8b5cf6', order: 4 },

        { category: 'LEAD_INDUSTRY', value: 'Photography Studio', color: '#6366f1', order: 0 },
        { category: 'LEAD_INDUSTRY', value: 'E-commerce / Retail', color: '#06b6d4', order: 1 },
        { category: 'LEAD_INDUSTRY', value: 'Fashion & Apparel', color: '#10b981', order: 2 },
        { category: 'LEAD_INDUSTRY', value: 'Advertising Agency', color: '#f59e0b', order: 3 },

        { category: 'OPPORTUNITY_STAGE', value: 'Test Job Received', color: '#8b5cf6', order: 0 },
        { category: 'OPPORTUNITY_STAGE', value: 'Test Job Sent', color: '#06b6d4', order: 1 },
        { category: 'OPPORTUNITY_STAGE', value: 'Test Job Approved', color: '#10b981', order: 2 },
        { category: 'OPPORTUNITY_STAGE', value: 'Price Quote Sent', color: '#f59e0b', order: 3 },
        { category: 'OPPORTUNITY_STAGE', value: 'Closed Won', color: '#10b981', order: 5 },
        { category: 'OPPORTUNITY_STAGE', value: 'Closed Lost', color: '#ef4444', order: 6 },

        { category: 'TASK_PRIORITY', value: 'High', color: '#ef4444', order: 0 },
        { category: 'TASK_PRIORITY', value: 'Medium', color: '#f59e0b', order: 1 },
        { category: 'TASK_PRIORITY', value: 'Low', color: '#10b981', order: 2 },

        { category: 'LEAVE_TYPE', value: 'Casual Leave', color: '#6366f1', order: 0 },
        { category: 'LEAVE_TYPE', value: 'Sick Leave', color: '#f59e0b', order: 1 },
        { category: 'LEAVE_TYPE', value: 'Bereavement', color: '#ef4444', order: 2 },
    ]
    for (const opt of systemOptions) {
        await prisma.systemOption.create({ data: opt })
    }

    // Seed System Settings
    console.log('🔧 Seeding configurations...')
    const systemSettings = [
        { key: 'company_name', value: 'Global Marketing Hub' },
        { key: 'recirculation_days', value: '14' },
        { key: 'working_hours_start', value: '09:00' },
        { key: 'working_hours_end', value: '18:00' },
        { key: 'currency_symbol', value: '$' }
    ]
    for (const s of systemSettings) {
        await prisma.systemSetting.create({ data: s })
    }

    // Seed Email Templates
    await prisma.emailTemplate.create({
        data: {
            name: 'Welcome Email',
            subject: 'Welcome to Global Marketing Hub',
            body: 'Hello {{name}}, welcome aboard!'
        }
    })

    // Seed Holidays
    await prisma.holiday.create({
        data: {
            name: 'New Year Day',
            date: new Date('2026-01-01'),
            createdBy: adminUser.id
        }
    })

    // Seeding Leads and related data for each user
    console.log('📈 Seeding performance data...')
    for (const u of allUsers) {
        // Attendance - Last 5 days
        for (let i = 0; i < 5; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            if (date.getDay() === 0 || date.getDay() === 6) continue // Skip weekends

            const punchIn = new Date(date)
            punchIn.setHours(9, Math.floor(Math.random() * 15), 0)
            const punchOut = new Date(date)
            punchOut.setHours(18, Math.floor(Math.random() * 20), 0)

            await prisma.attendanceRecord.create({
                data: {
                    userId: u.id,
                    punchIn,
                    punchOut,
                    duration: 540 + Math.floor(Math.random() * 30),
                    notes: 'Regular check-in'
                }
            })
        }

        // Leave Requests
        if (Math.random() > 0.5) {
            await prisma.leaveRequest.create({
                data: {
                    userId: u.id,
                    type: 'Casual Leave',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 86400000),
                    status: 'Approved',
                    reason: 'Family event'
                }
            })
        }

        // Goals
        const monthStr = formatMonth(new Date())
        await prisma.userGoal.create({
            data: { userId: u.id, category: 'DEALS', targetValue: 15, period: monthStr }
        })
        await prisma.userGoal.create({
            data: { userId: u.id, category: 'TEST_JOBS', targetValue: 30, period: monthStr }
        })

        // Leads
        for (let i = 0; i < 10; i++) {
            const lead = await prisma.lead.create({
                data: {
                    name: `Contact ${i} - ${u.name}`,
                    company: `Company ${idxToAlp(i)}`,
                    email: `contact${i}@company${i}.com`,
                    status: i % 3 === 0 ? 'Converted' : 'New',
                    industry: 'E-commerce / Retail',
                    ownerId: u.id,
                    priority: i % 2 === 0 ? 'High' : 'Medium'
                }
            })

            // Add an Activity Log
            await prisma.activityLog.create({
                data: {
                    userId: u.id,
                    type: 'LEAD',
                    action: 'CREATED',
                    description: `Manually added lead ${lead.name}`,
                    leadId: lead.id
                }
            })

            if (lead.status === 'Converted') {
                const opp = await prisma.opportunity.create({
                    data: {
                        title: `Large Deal ${i}`,
                        company: lead.company,
                        stage: 'Closed Won',
                        probability: 100,
                        ownerId: u.id,
                        leadId: lead.id,
                        closeDate: new Date()
                    }
                })
                await prisma.stageHistory.create({ data: { stage: 'Closed Won', opportunityId: opp.id } })
            }
        }
    }

    // Unassigned Pool Leads
    console.log('🏢 Seeding unassigned pool...')
    for (let i = 0; i < 20; i++) {
        await prisma.lead.create({
            data: {
                name: `Pool Lead ${i}`,
                company: `Enterprise ${i}`,
                status: 'New',
                industry: 'Photography Studio',
                ownerId: null
            }
        })
    }

    console.log('✅ Seeding complete!')
}

function formatMonth(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function idxToAlp(i: number) {
    return String.fromCharCode(65 + i)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
