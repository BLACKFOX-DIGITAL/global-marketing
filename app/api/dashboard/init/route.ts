import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCachedSystemOptions } from '@/lib/cached/settings'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [leadStatuses, stages, priorities] = await Promise.all([
        getCachedSystemOptions('LEAD_STATUS'),
        getCachedSystemOptions('OPPORTUNITY_STAGE'),
        getCachedSystemOptions('TASK_PRIORITY'),
    ])

    const responseData: {
        user: { name: string; email: string; role: string }
        settings: { leadStatuses: unknown; stages: unknown; priorities: unknown }
        redirect?: string
    } = {
        user: { name: user.name, email: user.email, role: user.role },
        settings: { leadStatuses, stages, priorities },
    }

    if (user.role === 'Administrator') {
        responseData.redirect = '/admin/dashboard'
    }

    const response = NextResponse.json(responseData)

    // Profile info is stable, settings are cached on server
    response.headers.set('Cache-Control', 'private, max-age=600, stale-while-revalidate=120')
    return response
}
