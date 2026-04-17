import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'shakkhor@blackfox.com.bd'
    const password = 'admin123'
    const hashed = await bcrypt.hash(password, 12)
    
    await prisma.user.upsert({
        where: { email },
        update: { password: hashed, role: 'Administrator' },
        create: { 
            name: 'Tanvir Mahedi', 
            email, 
            password: hashed, 
            role: 'Administrator' 
        }
    })
    
    console.log(`Password reset for ${email} to ${password}`)
}

main().finally(() => prisma.$disconnect())
