import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const options = await prisma.systemOption.findMany({
        where: category ? { category } : undefined,
        orderBy: { order: 'asc' }
    })

    return NextResponse.json({ options })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Administrator') {
        return NextResponse.json({ error: 'Forbidden. Administrator access required.' }, { status: 403 })
    }

    try {
        const { category, value, color, order } = await req.json()

        if (!category || !value) {
            return NextResponse.json({ error: 'Category and value are required' }, { status: 400 })
        }

        const option = await prisma.systemOption.create({
            data: { category, value, color, order: order || 0 }
        })

        return NextResponse.json(option, { status: 201 })
    } catch (err: unknown) {
        const error = err as { code?: string; message: string }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Option already exists in this category' }, { status: 400 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
