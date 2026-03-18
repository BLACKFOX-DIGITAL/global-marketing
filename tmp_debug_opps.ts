import { prisma } from './lib/prisma'

async function test() {
    try {
        console.log('Testing Opportunity.findMany...')
        const opps = await prisma.opportunity.findMany({
            include: {
                owner: { select: { id: true, name: true, email: true } },
                lead: { select: { id: true, name: true, company: true } },
                stageHistory: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { updatedAt: 'desc' },
        })
        console.log('Successfully fetched', opps.length, 'opportunities')
        process.exit(0)
    } catch (err) {
        console.error('CRITICAL ERROR:', err)
        process.exit(1)
    }
}

test()
