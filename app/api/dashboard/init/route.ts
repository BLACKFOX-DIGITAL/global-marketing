import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCachedSystemOptions } from '@/lib/cached/settings'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.role === 'Administrator') {
        return NextResponse.json({ redirect: '/admin/dashboard' })
    }

    const [leadStatuses, stages, priorities] = await Promise.all([
        getCachedSystemOptions('LEAD_STATUS'),
        getCachedSystemOptions('OPPORTUNITY_STAGE'),
        getCachedSystemOptions('TASK_PRIORITY'),
    ])

    const response = NextResponse.json({
        user: { name: user.name, email: user.email, role: user.role },
        settings: {
            leadStatuses,
            stages,
            priorities,
        },
    })

    // Profile info is stable, settings are cached on server
    response.headers.set('Cache-Control', 'private, max-age=600, stale-while-revalidate=120')
    return response
}
