import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashed = await bcrypt.hash('admin123', 12)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@businesshub.com' },
        update: { role: 'Administrator', password: hashed },
        create: { name: 'System Admin', email: 'admin@businesshub.com', password: hashed, role: 'Administrator' }
    })
    console.log('Admin user created/updated successfully:', admin.email)
}

main().finally(() => prisma.$disconnect())
