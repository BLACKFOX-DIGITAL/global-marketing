import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const userCount = await prisma.user.count()
  const leadCount = await prisma.lead.count({ where: { isDeleted: false } })
  const oppCount = await prisma.opportunity.count({ where: { isDeleted: false } })
  const wonCount = await prisma.opportunity.count({ where: { stage: 'Closed Won', isDeleted: false } })
  const taskCount = await prisma.task.count()
  const callCount = await prisma.callAttempt.count()
  const mailCount = await prisma.mailAttempt.count()

  console.log({
    users: userCount,
    leads: leadCount,
    opportunities: oppCount,
    closedWon: wonCount,
    tasks: taskCount,
    calls: callCount,
    emails: mailCount
  })

  // Check some recent leads
  const recentLeads = await prisma.lead.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true }
  })
  console.log('Recent Leads:', recentLeads)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
