
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const status = 'Follow-up'
    const exists = await prisma.systemOption.findFirst({
        where: { category: 'LEAD_STATUS', value: status }
    })

    if (!exists) {
        await prisma.systemOption.create({
            data: {
                category: 'LEAD_STATUS',
                value: status,
                color: '#10b981', // Emerald green
                order: 2, // Place it after 'Called' (order 1)
            }
        })
        console.log('Added Follow-up status')
        
        // Push others down
        await prisma.systemOption.updateMany({
            where: { category: 'LEAD_STATUS', order: { gte: 2 }, NOT: { value: status } },
            data: { order: { increment: 1 } }
        })
    } else {
        console.log('Follow-up status already exists')
    }
}

main().catch(e => {
    console.error(e)
    process.exit(1)
}).finally(() => prisma.$disconnect())
