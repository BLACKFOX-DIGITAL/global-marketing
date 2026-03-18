import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashed = await bcrypt.hash('user123', 12)
    const user = await prisma.user.upsert({
        where: { email: 'user@businesshub.com' },
        update: { role: 'SalesRep', password: hashed },
        create: { name: 'Normal User', email: 'user@businesshub.com', password: hashed, role: 'SalesRep' }
    })
    console.log('Normal user created/updated successfully:', user.email)
}

main().finally(() => prisma.$disconnect())
