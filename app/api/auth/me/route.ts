import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const tokenUser = await getCurrentUser()
    if (!tokenUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Re-validate against the database so suspended/demoted/deleted users are rejected
    const dbUser = await prisma.user.findUnique({
        where: { id: tokenUser.userId },
        select: { id: true, email: true, name: true, role: true, isSuspended: true }
    })

    if (!dbUser || dbUser.isSuspended) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
        userId: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
    })
}
