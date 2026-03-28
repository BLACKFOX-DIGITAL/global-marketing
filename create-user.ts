import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'user@example.com'
    const password = 'password123'
    const name = 'Normal User'
    const role = 'SalesRep'

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.upsert({
        where: { email },
        update: { role, password: hashed, name },
        create: { name, email, password: hashed, role }
    })
    
    console.log(`\nNew Normal User set up:\nName: ${user.name}\nEmail: ${user.email}\nPassword: ${password}\nRole: ${user.role}`)
}

main().finally(() => prisma.$disconnect())
