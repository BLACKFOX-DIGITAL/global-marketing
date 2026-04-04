import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Check if setup is needed (i.e. are there any administrators?)
export async function GET() {
    try {
        const adminCount = await prisma.user.count({ where: { role: 'Administrator' } })
        
        return NextResponse.json({ setupNeeded: adminCount === 0 })
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// Create the first admin
export async function POST(req: Request) {
    try {
        // Enforce security: ONLY allow this if no admin exists
        const adminCount = await prisma.user.count({ where: { role: 'Administrator' } })
        if (adminCount > 0) {
            return NextResponse.json({ error: 'Setup has already been completed. Cannot create another admin via this route.' }, { status: 403 })
        }

        const body = await req.json()
        const { name, email, password } = body

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 })
        }

        const hashed = await hashPassword(password)
        const admin = await prisma.user.create({
            data: { 
                name, 
                email, 
                password: hashed, 
                role: 'Administrator' 
            }
        })

        return NextResponse.json({ success: true, email: admin.email })
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
