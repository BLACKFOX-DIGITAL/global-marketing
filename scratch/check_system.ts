import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Checking for Warning Tasks ---')
    const warningTasks = await prisma.task.findMany({
        where: {
            title: { startsWith: 'WARNING: Auto-Reclaim' }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    })

    if (warningTasks.length === 0) {
        console.log('No WARNING: Auto-Reclaim tasks found.')
    } else {
        warningTasks.forEach(task => {
            console.log(`Task ID: ${task.id}`)
            console.log(`Title: ${task.title}`)
            console.log(`Lead ID: ${task.leadId}`)
            console.log(`Owner ID: ${task.ownerId}`)
            console.log(`Created At: ${task.createdAt}`)
            console.log(`Status: ${task.status}`)
            console.log('---')
        })
    }

    console.log('\n--- Checking for Recently Reclaimed Leads ---')
    // Leads that have ownerId is null but previousOwnerId is set
    const reclaimedLeads = await prisma.lead.findMany({
        where: {
            ownerId: null,
            previousOwnerId: { not: null },
            status: 'Open Pool'
        },
        orderBy: { lastActivityAt: 'desc' },
        take: 10
    })

    if (reclaimedLeads.length === 0) {
        console.log('No recently reclaimed leads found.')
    } else {
        reclaimedLeads.forEach(lead => {
            console.log(`Lead ID: ${lead.id}`)
            console.log(`Previous Owner: ${lead.previousOwnerId}`)
            console.log(`Last Activity: ${lead.lastActivityAt}`)
            console.log(`Status: ${lead.status}`)
            console.log('---')
        })
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
