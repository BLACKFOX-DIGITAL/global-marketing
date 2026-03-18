import { User, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useState } from 'react'
import useSWR from 'swr'

interface Activity {
    id: string
    action: string
    description: string
    createdAt: string
    user: { name: string }
}

const ACTION_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
    'CALL_ATTEMPT': { icon: '📞', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    'MAIL_ATTEMPT': { icon: '📧', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    'STATUS_CHANGE': { icon: '🔄', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    'CREATED': { icon: '✨', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    'UPDATED': { icon: '✏️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    'DELETED': { icon: '🗑️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    'CONVERTED': { icon: '🚀', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    'TASK_CREATED': { icon: '📋', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

const DEFAULT_CONFIG = { icon: '📌', color: 'var(--text-muted)', bg: 'var(--bg-input)' }

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ActivityTimeline({ leadId, activities: passedActivities }: { leadId?: string, activities?: Activity[] }) {
    const { data, error } = useSWR(leadId ? `/api/leads/${leadId}/activity` : null, fetcher, {
        revalidateOnFocus: false
    })
    const [showAll, setShowAll] = useState(false)

    if (!passedActivities && error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Could not load activity timeline.</div>
    if (!passedActivities && !data && leadId) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>

    const activities: Activity[] = passedActivities || data?.activityLogs || []

    if (!activities || activities.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No activity recorded yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Actions will appear here</div>
            </div>
        )
    }

    const displayedActivities = showAll ? activities : activities.slice(0, 5)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
            {displayedActivities.map((item, idx) => {
                const config = ACTION_CONFIG[item.action] || DEFAULT_CONFIG
                const isLast = idx === displayedActivities.length - 1

                return (
                    <div key={item.id} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: isLast ? 0 : 4 }}>
                        {/* Vertical line */}
                        {!isLast && (
                            <div style={{
                                position: 'absolute', left: 15, top: 36, bottom: 0,
                                width: 1.5, background: `linear-gradient(to bottom, ${config.color}30, var(--border))`,
                            }} />
                        )}

                        {/* Icon dot */}
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: config.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                            border: `1.5px solid ${config.color}40`, flexShrink: 0, fontSize: 14,
                        }}>
                            {config.icon}
                        </div>

                        <div style={{ flex: 1, paddingBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                <div style={{
                                    fontSize: 11, fontWeight: 700, color: config.color,
                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                }}>
                                    {item.action?.replace(/_/g, ' ') || 'ACTIVITY'}
                                </div>
                                <div style={{
                                    fontSize: 10, color: 'var(--text-muted)', fontWeight: 500,
                                    background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4,
                                }}>
                                    {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : '—'}
                                </div>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: 1.5, fontWeight: 500 }}>
                                {item.description}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                                <User size={10} /> {item.user?.name || 'System'} • {item.createdAt ? format(new Date(item.createdAt), 'MMM d, h:mm a') : 'Unknown Date'}
                            </div>
                        </div>
                    </div>
                )
            })}

            {activities.length > 5 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="btn-ghost"
                    style={{
                        marginTop: 8, alignSelf: 'center', fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 6,
                        color: 'var(--accent-primary)', fontWeight: 600,
                        padding: '8px 16px', borderRadius: 8,
                        background: 'rgba(99,102,241,0.05)',
                        border: '1px solid rgba(99,102,241,0.15)',
                    }}
                >
                    {showAll ? (
                        <><ChevronUp size={14} /> Show Less</>
                    ) : (
                        <><ChevronDown size={14} /> Show All ({activities.length})</>
                    )}
                </button>
            )}
        </div>
    )
}
