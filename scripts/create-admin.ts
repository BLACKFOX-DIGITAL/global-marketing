import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const prisma = new PrismaClient()
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
    console.log('\n--- Setup First Administrator ---')
    
    // Check if an admin already exists (optional, but good practice)
    const existingAdmins = await prisma.user.count({ where: { role: 'Administrator' } })
    if (existingAdmins > 0) {
        console.log(`\nNote: There are already ${existingAdmins} administrators in the system.`)
        const proceed = await question('Do you want to create another one? (y/N): ')
        if (proceed.toLowerCase() !== 'y') {
            console.log('Aborting.')
            rl.close()
            return
        }
    }

    const name = await question('Admin Name (e.g., System Admin): ')
    const email = await question('Admin Email: ')
    const password = await question('Admin Password: ')

    if (!email || !password || !name) {
        console.error('Error: Name, Email and Password are required.')
        rl.close()
        return
    }

    const hashed = await bcrypt.hash(password, 12)
    const admin = await prisma.user.upsert({
        where: { email },
        update: { role: 'Administrator', password: hashed, name },
        create: { name, email, password: hashed, role: 'Administrator' }
    })
    
    console.log(`\nSuccess! Admin user created successfully:\nName: ${admin.name}\nEmail: ${admin.email}\n`)
    rl.close()
}

main().finally(() => prisma.$disconnect())
