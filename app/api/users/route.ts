import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isSystemAdmin = currentUser.role === 'Administrator'

    // Non-admins can only see id and name for assignment purposes
    const selectFields = isSystemAdmin
        ? { id: true, name: true, email: true, role: true, createdAt: true }
        : { id: true, name: true }

    const users = await prisma.user.findMany({
        select: selectFields,
        orderBy: { name: 'asc' }
    })

    return NextResponse.json({ users })
}
