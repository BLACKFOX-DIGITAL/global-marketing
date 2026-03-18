import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Not found', { status: 404 })
    }

    try {
        const hashed = await bcrypt.hash('admin123', 12)
        const admin = await prisma.user.upsert({
            where: { email: 'admin@businesshub.com' },
            update: { role: 'Administrator', password: hashed },
            create: { name: 'System Admin', email: 'admin@businesshub.com', password: hashed, role: 'Administrator' }
        })
        return NextResponse.json({ success: true, email: admin.email })
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
