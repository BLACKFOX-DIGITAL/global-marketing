
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    await prisma.systemOption.deleteMany({
        where: { category: 'LEAD_STATUS', value: 'Follow-up' }
    })
    console.log('Removed Follow-up status')
}

main().catch(e => {
    console.error(e)
    process.exit(1)
}).finally(() => prisma.$disconnect())
