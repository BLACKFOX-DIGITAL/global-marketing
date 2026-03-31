import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const password = 'Password123!'
    const hashed = await bcrypt.hash(password, 12)
    
    const emails = ['shakkhor@blackfox.com.bd', 'emily@blackfoxdigital.com.bd']
    
    for (const email of emails) {
        const user = await prisma.user.update({
            where: { email },
            data: { password: hashed }
        })
        console.log(`Password reset for ${user.email} to Password123!`)
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
