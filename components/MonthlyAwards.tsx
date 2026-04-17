'use client'
import useSWR from 'swr'
import { Trophy, PhoneCall, Zap, TrendingUp } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface AwardData {
    category: string
    value: number
    month: number
    year: number
    user: { id: string; name: string }
}

const AWARD_CONFIG: Record<string, { title: string; icon: any; color: string; bg: string; suffix: string }> = {
    top_closer: { title: 'Top Closer', icon: Trophy, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', suffix: ' deals' },
    call_king: { title: 'Call King', icon: PhoneCall, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', suffix: ' calls' },
    longest_streak: { title: 'Iron Streak', icon: Zap, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', suffix: ' days' },
    rising_star: { title: 'Rising Star', icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', suffix: ' XP' },
}

export default function MonthlyAwards() {
    // Check if it's the first week of the month, if so show previous month's awards maybe?
    // The API fetches the requested month, or defaults to the last completed month if not passed.
    const { data } = useSWR<{ awards: AwardData[]; month: number; year: number }>('/api/cron/monthly-awards', fetcher, { refreshInterval: 3600000 })

    if (!data?.awards || data.awards.length === 0) return null

    const monthName = new Date(data.year, data.month - 1, 1).toLocaleString('default', { month: 'long' })

    return (
        <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={18} color="#f59e0b" /> {monthName} {data.year} Awards
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {data.awards.map(award => {
                    const config = AWARD_CONFIG[award.category]
                    if (!config) return null
                    const Icon = config.icon
                    return (
                        <div key={award.category} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 16,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12, background: config.bg,
                                color: config.color, display: 'flex', alignItems: 'center', justifyItems: 'center',
                                border: `1px solid ${config.color}30`, flexShrink: 0
                            }}>
                                <Icon size={22} style={{ margin: 'auto' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: config.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {config.title}
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {award.user.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                                    {award.value.toLocaleString()}{config.suffix}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
