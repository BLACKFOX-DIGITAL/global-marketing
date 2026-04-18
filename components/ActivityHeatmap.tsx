'use client'
import { useMemo } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface HeatmapEntry {
    date: string
    count: number
    types: Record<string, number>
}

export default function ActivityHeatmap() {
    const { data } = useSWR<{ heatmap: HeatmapEntry[] }>('/api/admin/dashboard/heatmap', fetcher, {
        refreshInterval: 300_000,
        keepPreviousData: true
    })

    const { weeks, maxCount, months } = useMemo(() => {
        const heatmapData = data?.heatmap || []
        const countMap = new Map(heatmapData.map(d => [d.date, d]))

        // Build 26 weeks (6 months) of day cells
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Start from the Sunday 26 weeks ago
        const start = new Date(today)
        start.setDate(start.getDate() - (26 * 7) - start.getDay())

        const weeks: Array<Array<{ date: string; count: number; dayOfWeek: number; isToday: boolean; isFuture: boolean }>> = []
        const months: Array<{ label: string; weekIndex: number }> = []

        let currentWeek: typeof weeks[0] = []
        let lastMonth = -1

        const cursor = new Date(start)
        let weekIndex = 0

        while (cursor <= today || currentWeek.length > 0) {
            const dateStr = cursor.toISOString().split('T')[0]
            const entry = countMap.get(dateStr)
            const isFuture = cursor > today

            currentWeek.push({
                date: dateStr,
                count: entry?.count || 0,
                dayOfWeek: cursor.getDay(),
                isToday: cursor.getTime() === today.getTime(),
                isFuture
            })

            // Track month labels
            const m = cursor.getMonth()
            if (m !== lastMonth && cursor.getDay() <= 3) {
                months.push({
                    label: cursor.toLocaleDateString('en-US', { month: 'short' }),
                    weekIndex
                })
                lastMonth = m
            }

            if (currentWeek.length === 7) {
                weeks.push(currentWeek)
                currentWeek = []
                weekIndex++
            }

            cursor.setDate(cursor.getDate() + 1)
            if (isFuture && currentWeek.length === 0) break
        }

        if (currentWeek.length > 0) weeks.push(currentWeek)

        const maxCount = Math.max(1, ...heatmapData.map(d => d.count))

        return { weeks, maxCount, months }
    }, [data])

    const getColor = (count: number, isFuture: boolean) => {
        if (isFuture) return 'rgba(255,255,255,0.02)'
        if (count === 0) return 'rgba(255,255,255,0.04)'
        const intensity = Math.min(count / maxCount, 1)
        if (intensity >= 0.8) return '#6366f1'
        if (intensity >= 0.6) return 'rgba(99,102,241,0.7)'
        if (intensity >= 0.4) return 'rgba(99,102,241,0.5)'
        if (intensity >= 0.2) return 'rgba(99,102,241,0.3)'
        return 'rgba(99,102,241,0.15)'
    }

    const totalActions = data?.heatmap?.reduce((sum, d) => sum + d.count, 0) || 0
    const activeDays = data?.heatmap?.filter(d => d.count > 0).length || 0

    return (
        <div className="card" style={{ padding: '24px 28px', borderRadius: 24, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 4 }}>Activity</div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Team Activity Heatmap</h3>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{totalActions.toLocaleString()}</strong> actions
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{activeDays}</strong> active days
                    </span>
                </div>
            </div>

            {/* Month labels */}
            <div style={{ display: 'flex', paddingLeft: 32, marginBottom: 4 }}>
                {months.map((m, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        left: `${32 + m.weekIndex * 14}px`,
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        fontWeight: 600
                    }}>
                        {m.label}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 2, position: 'relative', paddingTop: 18 }}>
                {/* Day labels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 6, flexShrink: 0 }}>
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
                        <div key={i} style={{ height: 10, fontSize: 8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div style={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
                    {weeks.map((week, wi) => (
                        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {week.map((day) => (
                                <div
                                    key={day.date}
                                    title={`${day.date}: ${day.count} actions`}
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: 2,
                                        background: getColor(day.count, day.isFuture),
                                        border: day.isToday ? '1px solid var(--accent-primary)' : '1px solid transparent',
                                        cursor: 'default',
                                        transition: 'transform 0.1s',
                                    }}
                                    onMouseEnter={e => (e.target as HTMLElement).style.transform = 'scale(1.4)'}
                                    onMouseLeave={e => (e.target as HTMLElement).style.transform = 'scale(1)'}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Less</span>
                {[0, 0.2, 0.4, 0.6, 0.8].map(i => (
                    <div key={i} style={{
                        width: 10, height: 10, borderRadius: 2,
                        background: getColor(Math.ceil(maxCount * i) || (i === 0 ? 0 : 1), false)
                    }} />
                ))}
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>More</span>
            </div>
        </div>
    )
}
