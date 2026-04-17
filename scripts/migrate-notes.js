const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Starting Lead Notes migration...')
    
    // Find all leads that have non-empty notes
    const leads = await prisma.lead.findMany({
        where: {
            notes: { not: null },
        },
        select: {
            id: true,
            notes: true,
            ownerId: true,
            createdAt: true
        }
    })

    console.log(`Found ${leads.length} leads with existing notes.`)

    let migrated = 0
    let skipped = 0

    // Fetch an admin user to use as fallback if a lead is unassigned
    const adminUser = await prisma.user.findFirst({
        where: { role: 'Administrator' },
        select: { id: true }
    })

    if (!adminUser) {
        console.error('No Administrator user found to attribute unassigned notes. Please create one first.')
        process.exit(1)
    }

    for (const lead of leads) {
        // Skip empty notes or just whitespace/empty html
        if (!lead.notes || lead.notes.trim() === '' || lead.notes === '<p></p>') {
            skipped++
            continue
        }

        // Determine who gets credit for the note
        const authorId = lead.ownerId || adminUser.id

        // Create the individual note record
        await prisma.leadNote.create({
            data: {
                content: lead.notes,
                leadId: lead.id,
                userId: authorId,
                createdAt: lead.createdAt // Set to lead creation date to preserve history timeline
            }
        })
        
        migrated++
    }

    console.log(`Migration complete. Migrated ${migrated} notes, skipped ${skipped} empty notes.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
