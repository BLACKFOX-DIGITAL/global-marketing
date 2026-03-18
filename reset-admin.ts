import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function reset() {
    console.log('Resetting admin password...')
    const hashed = await bcrypt.hash('password123', 12)

    // Ensure admin@foxcrm.com exists and has the correct password and role
    const admin = await prisma.user.upsert({
        where: { email: 'admin@foxcrm.com' },
        update: {
            password: hashed,
            role: 'Administrator'
        },
        create: {
            name: 'System Admin',
            email: 'admin@foxcrm.com',
            password: hashed,
            role: 'Administrator'
        }
    })

    console.log(`✅ User ${admin.email} is now an Administrator with password 'password123'`)
}

reset()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
