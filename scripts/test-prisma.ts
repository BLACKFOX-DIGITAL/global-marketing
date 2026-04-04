import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst()
    console.log('User found:', user ? user.email : 'None')
}

main().catch(console.error).finally(() => prisma.$disconnect())
