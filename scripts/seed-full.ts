import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Follow-up', 'Closed-Lost', 'Closed-Won']
const OPPORTUNITY_STAGES = ['Test Job Received', 'Proposal Sent', 'Negotiation', 'Won', 'Lost']
const TASK_TYPES = ['Follow-up', 'Email', 'Call', 'Meeting']
const PRIORITIES = ['Low', 'Medium', 'High']

async function main() {
    console.log('--- Starting Global Seed ---')

    const admin = await prisma.user.findUnique({ where: { email: 'admin@blackfox.digital' } })
    const salesRep = await prisma.user.findUnique({ where: { email: 'user@example.com' } })

    if (!admin || !salesRep) {
        throw new Error('Required users (admin or salesRep) not found. Run admin setup/user creation first.')
    }

    const userIds = [admin.id, salesRep.id]

    // 1. Seed Leads
    console.log('Seeding Leads...')
    const leadsData = []
    for (let i = 0; i < 100; i++) {
        leadsData.push({
            name: `Lead ${i + 1}`,
            company: `Company ${Math.floor(i / 5) + 1}`,
            email: `contact${i}@example.com`,
            phone: `+1 555-010${i % 100}`,
            status: LEAD_STATUSES[Math.floor(Math.random() * LEAD_STATUSES.length)],
            ownerId: userIds[Math.floor(Math.random() * userIds.length)],
            priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
            industry: ['E-commerce', 'Photography', 'Real Estate', 'Tech', 'Marketing'][Math.floor(Math.random() * 5)],
        })
    }
    
    // Using simple loop to avoid batch issues if database is small (sqlite is fine with many inserts but let's be safe)
    const createdLeads = []
    for (const data of leadsData) {
        const lead = await prisma.lead.create({ data })
        createdLeads.push(lead)
    }
    console.log(`Created ${createdLeads.length} leads.`)

    // 2. Seed Opportunities
    console.log('Seeding Opportunities...')
    const createdOpps = []
    for (let i = 0; i < 30; i++) {
        const randomLead = createdLeads[Math.floor(Math.random() * createdLeads.length)]
        const opp = await prisma.opportunity.create({
            data: {
                title: `Opp for ${randomLead.company || 'Unknown'}`,
                company: randomLead.company || 'Unknown',
                stage: OPPORTUNITY_STAGES[Math.floor(Math.random() * OPPORTUNITY_STAGES.length)],
                probability: Math.floor(Math.random() * 100),
                ownerId: randomLead.ownerId,
                leadId: randomLead.id,
                notes: 'Generated seed opportunity notes',
            }
        })
        createdOpps.push(opp)
    }
    console.log(`Created ${createdOpps.length} opportunities.`)

    // 3. Seed Tasks
    console.log('Seeding Tasks...')
    for (let i = 0; i < 50; i++) {
        const randomLead = createdLeads[Math.floor(Math.random() * createdLeads.length)]
        await prisma.task.create({
            data: {
                title: `${TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)]} for ${randomLead.name}`,
                description: 'Generated seed task description',
                priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
                ownerId: randomLead.ownerId,
                leadId: randomLead.id,
                dueDate: new Date(Date.now() + Math.random() * 86400000 * 7), // within next week
            }
        })
    }
    console.log('Created 50 tasks.')

    // 4. Seed Activity Logs
    console.log('Seeding Activity Logs...')
    for (let i = 0; i < 100; i++) {
        const randomLead = createdLeads[Math.floor(Math.random() * createdLeads.length)]
        await prisma.activityLog.create({
            data: {
                userId: randomLead.ownerId || admin.id,
                type: 'STATUS_CHANGE',
                action: 'Update',
                description: `Updated status of lead: ${randomLead.name}`,
                leadId: randomLead.id
            }
        })
    }
    console.log('Created 100 activity logs.')

    console.log('--- Global Seed Completed ---')
}

main().catch(err => {
    console.error(err)
    process.exit(1)
}).finally(() => prisma.$disconnect())
