import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getGamificationProfile } from '@/lib/gamification'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const profile = await getGamificationProfile(user.userId)
        const res = NextResponse.json(profile)
        res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
        return res
    } catch (err) {
        console.error('Gamification profile error:', err)
        return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }
}
