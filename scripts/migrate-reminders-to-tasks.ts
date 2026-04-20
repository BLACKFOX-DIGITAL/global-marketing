import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Migrating Reminders \u2192 Tasks ---')

    const reminders = await prisma.reminder.findMany({
        include: { lead: { select: { name: true, company: true } } }
    })
    console.log(`Found ${reminders.length} reminders`)

    let created = 0
    for (const r of reminders) {
        const fallbackTitle = `Follow up with ${r.lead.name}${r.lead.company ? ` (${r.lead.company})` : ''}`
        await prisma.task.create({
            data: {
                title: r.message?.trim() || fallbackTitle,
                taskType: 'Reminder',
                priority: 'Medium',
                status: r.isTriggered ? 'Completed' : 'Pending',
                dueDate: r.remindAt,
                completed: r.isTriggered,
                completedAt: r.isTriggered ? r.remindAt : null,
                ownerId: r.userId,
                leadId: r.leadId,
                createdAt: r.createdAt
            }
        })
        created++
    }

    console.log(`Created ${created} tasks from reminders`)
    console.log('Done. You can now run `npm run db:push` to drop the Reminder table.')
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
