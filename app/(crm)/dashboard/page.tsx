'use client'
import { useEffect, useState } from 'react'
import { Users, Calendar, CheckCircle, TrendingUp, Briefcase, ChevronRight, Phone, Mail, Zap, Star, Check, Waves, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'
import { AttendanceWidget } from '@/components/AttendanceWidget'
import EditTaskModal from '@/components/EditTaskModal'

// Lazy-load heavy Recharts bundle — doesn't block initial render
import { AnalyticsDashboard } from '@/components/AnalyticsCharts'
import StreakFreeze from '@/components/StreakFreeze'
import NotificationCenter from '@/components/NotificationCenter'


interface DashboardData {
    stats: {
        totalLeads: number
        tasksDueToday: number
        closedWon: number
        overdueTasks: number
        poolCount: number
    }
    recentLeads: Array<{ id: string; name: string; company: string | null; status: string; createdAt: string; lastContactedAt?: string | null; phone?: string | null; email?: string | null; mailCount: number; callCount: number }>
    todaysTasks: Array<{ id: string; title: string; priority: string; completed: boolean; dueDate: string | null; leadId?: string | null }>
    pipelineByStage: Array<{ stage: string; _count: number }>
    upcomingTasks: Array<{ id: string; title: string; dueDate: string | null }>
    holidays: Array<{ id: string; name: string; date: string; description: string | null }>
}

function StatusBadge({ status, options }: { status: string, options?: Array<{ value: string; color: string | null }> }) {
    const opt = options?.find(o => o.value === status)
    if (opt && opt.color) {
        return <span className="badge" style={{ background: `${opt.color}20`, color: opt.color, border: `1px solid ${opt.color}40`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>{status}</span>
    }
    const cls = status.toLowerCase().replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '-')
    return <span className={`badge badge-${cls}`}>{status}</span>
}

function PriorityBadge({ priority, options }: { priority: string, options?: Array<{ value: string; color: string | null }> }) {
    const opt = options?.find(o => o.value === priority)
    if (opt && opt.color) {
        return <span className="badge" style={{ background: `${opt.color}20`, color: opt.color, border: `1px solid ${opt.color}40`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>{priority}</span>
    }
    return <span className={`badge badge-${priority.toLowerCase()}`}>{priority}</span>
}

import useSWR, { useSWRConfig } from 'swr'

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
        const err: any = new Error('API error')
        err.status = res.status
        try { err.data = await res.json() } catch {}
        throw err
    }
    return res.json()
}

const CALL_OUTCOME_OPTIONS = [
    { value: 'connected_interested', label: 'Connected - Interested', icon: '✅', color: '#22c55e' },
    { value: 'no_answer', label: 'No Answer', icon: '📵', color: '#f59e0b' },
    { value: 'voicemail', label: 'Voicemail Left', icon: '📞', color: '#6366f1' },
    { value: 'call_back_later', label: 'Call Back Later', icon: '🔄', color: '#06b6d4' },
    { value: 'connected_not_interested', label: 'Not Interested', icon: '❌', color: '#ef4444' },
]

const MAIL_OUTCOME_OPTIONS = [
    { value: 'sent', label: 'Mail Sent', icon: '📧', color: '#6366f1' },
    { value: 'follow_up', label: 'Follow-up Mail', icon: '🔁', color: '#f59e0b' },
    { value: 'response_interested', label: 'Got Response - Interested', icon: '✅', color: '#22c55e' },
    { value: 'response_not_interested', label: 'Got Response - Not Interested', icon: '❌', color: '#ef4444' },
]

export default function DashboardPage() {
    const router = useRouter()
    const { mutate } = useSWRConfig()
    const [activeActionPopup, setActiveActionPopup] = useState<{ leadId: string, type: 'call' | 'mail' } | null>(null)
    const [editTaskId, setEditTaskId] = useState<string | null>(null)
    const [taskTab, setTaskTab] = useState<'today' | 'upcoming'>('today')
    const [togglingTask, setTogglingTask] = useState<string | null>(null)
    const [actionPending, setActionPending] = useState<string | null>(null)
    const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([])

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now()
        setToasts(t => [...t, { id, msg, type }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
    }

    // Lightweight bootstrap: auth + settings + gamification (cached 5 min)
    const { data: init, error: initError } = useSWR('/api/dashboard/init', fetcher, {
        keepPreviousData: true,
        refreshInterval: 300_000,
        onError: (err) => { if (err.status === 401) router.replace('/login') },
    })

    // Heavy KPI data: leads, tasks, pipeline, goals (refreshes every 30 sec)
    const { data: statsData, error: statsError, mutate: mutateStats } = useSWR('/api/dashboard/stats', fetcher, {
        keepPreviousData: true,
        refreshInterval: 30_000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
    })

    useEffect(() => {
        if (init?.redirect) {
            const currentPath = window.location.pathname
            if (currentPath !== init.redirect) {
                router.replace(init.redirect)
            }
        }
    }, [init, router])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (activeActionPopup && !target.closest('.action-popup') && !target.closest('.action-trigger')) {
                setActiveActionPopup(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [activeActionPopup])

    const loading = !init && !initError

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Loading workspace...</div>
        </div>
    )

    if (initError && !init) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Failed to load workspace</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {initError.status === 401 ? 'Session expired — redirecting to login...' : 'Could not connect to server. Check your connection and try again.'}
            </div>
            {initError.status !== 401 && (
                <button
                    onClick={() => mutate('/api/dashboard/init')}
                    style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                    Retry
                </button>
            )}
        </div>
    )

    const data: DashboardData | null = statsData || null
    const settings: { leadStatuses: Array<{ value: string, color: string | null }>; stages: Array<{ value: string, color: string | null }>; priorities: Array<{ value: string, color: string | null }> } = init?.settings || { leadStatuses: [], stages: [], priorities: [] }
    const goalsData: { goals: Array<{ id: string, category: string, targetValue: number }>; progress: Record<string, number> } | null = statsData?.goals || null
    const gamification: { xp: number; level: number; title: string; xpInCurrentLevel: number; xpNeededForNextLevel: number; currentStreak: number; streakMultiplier: number; unlockedCount: number; totalAchievements: number } | null = statsData?.gamification || null
    const userName = init?.user?.name ? init.user.name.split(' ')[0] : 'User'

    const holidays = data?.holidays || []
    const pipelineArray = data?.pipelineByStage ?? []
    const maxPipelineCount = pipelineArray.length > 0 ? Math.max(...pipelineArray.map((s: any) => s._count)) : 0
    const totalPipelineDeals = data?.pipelineByStage?.reduce((sum: number, s: any) => sum + s._count, 0) || 0
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

    const handleToggleTask = async (taskId: string) => {
        if (togglingTask === taskId) return
        setTogglingTask(taskId)
        try {
            const res = await fetch(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' })
            if (!res.ok) throw new Error(`${res.status}`)
            mutate('/api/dashboard/stats')
        } catch {
            showToast('Failed to update task', 'error')
        } finally {
            setTogglingTask(null)
        }
    }

    const handleLogCallStep = async (leadId: string, outcome: string, phone: string) => {
        setActiveActionPopup(null)
        const pendingKey = `${leadId}:call`
        if (actionPending === pendingKey) return
        setActionPending(pendingKey)
        try {
            const res = await fetch(`/api/leads/${leadId}/call-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome, note: `Dashboard log: ${outcome}` })
            })
            if (!res.ok) throw new Error(`${res.status}`)
            mutate('/api/dashboard/stats')
            mutate((key: any) => typeof key === 'string' && (key.includes('/api/leads') || key.includes('/api/dashboard')))
            showToast('Call logged')
        } catch {
            showToast('Failed to log call', 'error')
        } finally {
            setActionPending(null)
        }
    }

    const handleLogMailStep = async (leadId: string, outcome: string, email: string) => {
        setActiveActionPopup(null)
        const pendingKey = `${leadId}:mail`
        if (actionPending === pendingKey) return
        setActionPending(pendingKey)
        try {
            const res = await fetch(`/api/leads/${leadId}/mail-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome, note: `Dashboard log: ${outcome}` })
            })
            if (!res.ok) throw new Error(`${res.status}`)
            mutate('/api/dashboard/stats')
            mutate((key: any) => typeof key === 'string' && (key.includes('/api/leads') || key.includes('/api/dashboard')))
            showToast('Mail logged')
        } catch {
            showToast('Failed to log mail', 'error')
        } finally {
            setActionPending(null)
        }
    }

    const handleUpdateStatus = async (leadId: string, status: string) => {
        try {
            const res = await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
            if (!res.ok) throw new Error(`${res.status}`)
            mutate('/api/dashboard/stats')
            mutate((key: any) => typeof key === 'string' && (key.includes('/api/leads') || key.includes('/api/dashboard')))
            showToast('Status updated')
        } catch {
            showToast('Failed to update status', 'error')
            mutate('/api/dashboard/stats')
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeSlideDown {
                    from { opacity: 0; transform: translateY(-16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .section-label {
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    color: var(--text-muted);
                }
                .dash-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
                }
                .dash-card:hover {
                    border-color: rgba(99,102,241,0.3);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                    line-height: 1;
                }
                .lead-row:hover { background: rgba(255,255,255,0.02); }
                .task-item:hover { background: rgba(255,255,255,0.02); }
            `}</style>
            {/* Top Bar */}
            <div style={{
                height: 56, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 32px', flexShrink: 0,
                backdropFilter: 'blur(12px)', position: 'relative', zIndex: 50
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statsError ? '#ef4444' : '#10b981', boxShadow: `0 0 8px ${statsError ? '#ef4444' : '#10b981'}` }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Live Dashboard</span>
                    {statsError && !statsData && (
                        <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>— data unavailable</span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {statsError && !statsData && (
                        <button
                            onClick={() => mutateStats()}
                            style={{ fontSize: 11, color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
                        >
                            Retry
                        </button>
                    )}
                    <NotificationCenter />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(new Date(), 'EEEE, MMMM d yyyy')}</div>
                </div>
            </div>

            <div className="crm-content" style={{ padding: '20px 24px', maxWidth: 1600, margin: '0' }}>

                {/* ── Hero Header ── */}
                <div style={{
                    marginBottom: 20, padding: '16px 24px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 50%, rgba(6,182,212,0.03) 100%)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 16, position: 'relative', overflow: 'hidden'
                }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 4, letterSpacing: '0.5px' }}>
                                {greeting}, {userName} 👋
                            </div>
                            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                                My Dashboard
                            </h1>
                        </div>

                        {gamification && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border)',
                                borderRadius: 12, padding: '12px 20px', backdropFilter: 'blur(12px)'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                                        <Star size={16} color="white" fill="white" />
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 900 }}>Lvl {gamification.level}</div>
                                </div>
                                <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
                                <div style={{ display: 'flex', gap: 16 }}>
                                    {[
                                        { label: 'XP', value: gamification.xp, icon: <Zap size={12} /> },
                                        { label: 'Streak', value: `${gamification.currentStreak}d`, icon: '🔥' },
                                    ].map(s => (
                                        <div key={s.label} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 14, fontWeight: 900 }}>{s.value}</div>
                                            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
                                <div style={{ width: 100 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next level</span>
                                        <span style={{ fontSize: 9, fontWeight: 700 }}>{gamification.xpInCurrentLevel}/{gamification.xpNeededForNextLevel}</span>
                                    </div>
                                    <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 10 }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.round((gamification.xpInCurrentLevel / gamification.xpNeededForNextLevel) * 100)}%`,
                                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                            borderRadius: 10, transition: 'width 1s ease-out'
                                        }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <StreakFreeze />
                </div>

                {/* ── Bento Grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 'auto', gap: 12 }}>

                    {/* KPI Cards — span 3 each */}
                    {[
                        {
                            label: 'Active Leads', value: data?.stats.totalLeads || 0,
                            sub: 'In your lead list', icon: <Users size={18} />, color: 'var(--accent-primary)', bg: 'rgba(99,102,241,0.1)'
                        },
                        {
                            label: 'Open Deals', value: totalPipelineDeals,
                            sub: 'Across all stages', icon: <Briefcase size={18} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'
                        },
                        {
                            label: 'Tasks Due Today', value: data?.stats.tasksDueToday || 0,
                            sub: data?.stats.overdueTasks ? `${data.stats.overdueTasks} overdue` : 'All on track',
                            icon: <Calendar size={18} />,
                            color: data?.stats.overdueTasks ? '#ef4444' : '#f59e0b',
                            bg: data?.stats.overdueTasks ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                            alert: !!data?.stats.overdueTasks
                        },
                        {
                            label: 'Leads in Pool', value: data?.stats.poolCount || 0,
                            sub: 'Available to claim', icon: <Waves size={18} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',
                            href: '/pool'
                        },
                    ].map((kpi: any, i) => (
                        <div key={i} className="dash-card" style={{
                            gridColumn: 'span 3', padding: '16px 20px',
                            borderLeft: `3px solid ${kpi.color}`,
                            animation: `fadeSlideUp 0.4s ease both ${i * 0.06}s`,
                            cursor: kpi.href ? 'pointer' : 'default'
                        }} onClick={() => kpi.href && router.push(kpi.href)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                                    {kpi.icon}
                                </div>

                                {kpi.alert && (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: 100 }}>
                                        Overdue
                                    </span>
                                )}
                            </div>
                            <div className="metric-value" style={{ color: kpi.color, marginBottom: 4 }}>
                                {kpi.value.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{kpi.label}</div>
                            <div style={{ fontSize: 11, color: kpi.alert ? '#ef4444' : 'var(--text-muted)', fontWeight: kpi.alert ? 600 : 400 }}>{kpi.sub}</div>
                        </div>
                    ))}

                    {/* Attendance Widget — span 4 */}
                    <div style={{ gridColumn: 'span 4', animation: 'fadeSlideUp 0.4s ease both 0.28s', display: 'flex' }}>
                        <AttendanceWidget />
                    </div>

                    {/* Today's Tasks — span 4 or 5 */}
                    <div className="dash-card" style={{ gridColumn: goalsData?.goals?.filter(g => g.category !== 'TASKS').length ? 'span 4' : 'span 4', padding: 0, animation: 'fadeSlideUp 0.4s ease both 0.32s', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                                <button
                                    onClick={() => setTaskTab('today')}
                                    style={{
                                        padding: '4px 10px', borderRadius: 6, border: 'none',
                                        background: taskTab === 'today' ? 'var(--bg-card)' : 'transparent',
                                        color: taskTab === 'today' ? 'var(--accent-primary)' : 'var(--text-muted)',
                                        fontSize: 11, fontWeight: taskTab === 'today' ? 700 : 500, cursor: 'pointer',
                                        boxShadow: taskTab === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >Today</button>
                                <button
                                    onClick={() => setTaskTab('upcoming')}
                                    style={{
                                        padding: '4px 10px', borderRadius: 6, border: 'none',
                                        background: taskTab === 'upcoming' ? 'var(--bg-card)' : 'transparent',
                                        color: taskTab === 'upcoming' ? 'var(--accent-primary)' : 'var(--text-muted)',
                                        fontSize: 11, fontWeight: taskTab === 'upcoming' ? 700 : 500, cursor: 'pointer',
                                        boxShadow: taskTab === 'upcoming' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >Upcoming</button>
                            </div>
                            <Link href="/tasks" style={{ fontSize: 11, color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                All <ChevronRight size={12} />
                            </Link>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
                            {taskTab === 'today' ? (
                                !data?.todaysTasks.length ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CheckCircle size={22} color="#10b981" />
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>All clear for today!</div>
                                    </div>
                                ) : (
                                    data?.todaysTasks.map((task, idx) => (
                                        <div key={task.id} className="task-item" style={{
                                            padding: '10px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
                                            borderBottom: idx < (data?.todaysTasks.length || 0) - 1 ? '1px solid var(--border)' : 'none',
                                            transition: 'background 0.15s'
                                        }}>
                                            <button
                                                onClick={() => handleToggleTask(task.id)}
                                                disabled={togglingTask === task.id}
                                                style={{
                                                    width: 18, height: 18, borderRadius: 6, flexShrink: 0, marginTop: 2,
                                                    border: `2px solid ${task.completed ? '#10b981' : 'var(--border)'}`,
                                                    background: task.completed ? '#10b981' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: togglingTask === task.id ? 'wait' : 'pointer', outline: 'none', padding: 0,
                                                    opacity: togglingTask === task.id ? 0.5 : 1
                                                }}
                                            >
                                                {task.completed && <Check size={10} color="white" strokeWidth={4} />}
                                            </button>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: 13, fontWeight: 600,
                                                    color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                                    textDecoration: task.completed ? 'line-through' : 'none',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4
                                                }}>{task.title}</div>
                                                <PriorityBadge priority={task.priority} options={settings.priorities} />
                                            </div>
                                            {!task.completed && (
                                                <button 
                                                    onClick={() => setEditTaskId(task.id)}
                                                    style={{ 
                                                        padding: '4px', borderRadius: 4, border: 'none', background: 'transparent', 
                                                        color: 'var(--accent-primary)', cursor: 'pointer', opacity: 0.6,
                                                        display: 'flex', alignItems: 'center'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )
                            ) : (
                                !data?.upcomingTasks.length ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Calendar size={22} color="var(--accent-primary)" />
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>No upcoming tasks</div>
                                    </div>
                                ) : (
                                    data?.upcomingTasks.map((task, idx) => (
                                        <div key={task.id} className="task-item" style={{
                                            padding: '10px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
                                            borderBottom: idx < (data?.upcomingTasks.length || 0) - 1 ? '1px solid var(--border)' : 'none',
                                            transition: 'background 0.15s'
                                        }}>
                                            <div style={{
                                                width: 18, height: 18, borderRadius: 6, flexShrink: 0, marginTop: 2,
                                                border: '2px solid var(--border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Calendar size={10} color="var(--text-muted)" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: 13, fontWeight: 600,
                                                    color: 'var(--text-primary)',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2
                                                }}>{task.title}</div>
                                                <div style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 600 }}>
                                                    {task.dueDate ? format(new Date(task.dueDate), 'MMM d, h:mm a') : 'No date'}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setEditTaskId(task.id)}
                                                style={{ 
                                                    padding: '4px', borderRadius: 4, border: 'none', background: 'transparent', 
                                                    color: 'var(--accent-primary)', cursor: 'pointer', opacity: 0.6,
                                                    display: 'flex', alignItems: 'center'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                                            >
                                                <Pencil size={12} />
                                            </button>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>

                    {/* Pipeline by Stage — span 4 */}
                    <div className="dash-card" style={{ gridColumn: 'span 4', padding: '16px 20px', animation: 'fadeSlideUp 0.4s ease both 0.36s' }}>
                        <div style={{ marginBottom: 14 }}>
                            <div className="section-label" style={{ marginBottom: 2 }}>Pipeline</div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Deals by Stage</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {pipelineArray.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>No pipeline data</div>
                            ) : (
                                pipelineArray.map((stage: any) => {
                                    const stgConf = settings.stages.find(s => s.value === stage.stage)
                                    const color = stgConf?.color || 'var(--accent-primary)'
                                    const pct = maxPipelineCount > 0 ? Math.round((stage._count / maxPipelineCount) * 100) : 0
                                    return (
                                        <div key={stage.stage}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{stage.stage}</span>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{stage._count}</span>
                                            </div>
                                            <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', width: `${pct}%`, borderRadius: 100,
                                                    background: color, transition: 'width 1.2s ease-out'
                                                }} />
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Recent Leads Table — FULL WIDTH / TOP PRIORITY */}
                    <div className="dash-card" style={{
                        gridColumn: 'span 12',
                        padding: 0, animation: 'fadeSlideUp 0.4s ease both 0.38s'
                    }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                    <div className="section-label" style={{ marginBottom: 2 }}>Activity</div>
                                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Recent Leads</h3>
                                </div>
                            <Link href="/leads" style={{ fontSize: 11, color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 100, border: '1px solid rgba(99,102,241,0.15)' }}>
                                View All <ChevronRight size={12} />
                            </Link>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        {['Lead', 'Company', 'Status', 'Created', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {!data?.recentLeads.length ? (
                                        <tr><td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No recent leads</td></tr>
                                    ) : (
                                        data?.recentLeads.map((lead, idx) => {
                                            const initials = lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                            const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']
                                            const avatarColor = colors[lead.name.charCodeAt(0) % colors.length]
                                            return (
                                                <tr key={lead.id} className="lead-row" style={{
                                                    borderBottom: idx < (data?.recentLeads.length || 0) - 1 ? '1px solid var(--border)' : 'none',
                                                    transition: 'background 0.15s'
                                                }}>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <Link href={`/leads/${lead.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                                                            <div style={{
                                                                width: 30, height: 30, borderRadius: 8,
                                                                background: `${avatarColor}20`,
                                                                border: `1px solid ${avatarColor}40`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 11, fontWeight: 800, color: avatarColor, flexShrink: 0
                                                            }}>{initials}</div>
                                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{lead.name}</span>
                                                        </Link>
                                                    </td>
                                                    <td style={{ padding: '10px 20px', fontSize: 12, color: 'var(--text-secondary)' }}>{lead.company || '—'}</td>
                                                    <td style={{ padding: '10px 20px' }}>
                                                        <select 
                                                            value={lead.status}
                                                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                                                            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: 0 }}
                                                        >
                                                            {settings.leadStatuses.map(s => (
                                                                <option key={s.value} value={s.value}>{s.value}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '10px 20px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                                                        {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                                                    </td>
                                                    <td style={{ padding: '10px 20px' }}>
                                                        <div style={{ display: 'flex', gap: 10 }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <button 
                                                                    className="action-trigger"
                                                                    onClick={() => setActiveActionPopup(activeActionPopup?.leadId === lead.id && activeActionPopup.type === 'call' ? null : { leadId: lead.id, type: 'call' })}
                                                                    style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(245,158,11,0.05)', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Phone size={14} fill={lead.callCount > 0 ? '#f59e0b' : 'none'} />
                                                                </button>
                                                                {activeActionPopup?.leadId === lead.id && activeActionPopup.type === 'call' && (
                                                                    <div className="action-popup" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 8, minWidth: 190, boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
                                                                        {CALL_OUTCOME_OPTIONS.map(opt => (
                                                                            <button key={opt.value} onClick={() => handleLogCallStep(lead.id, opt.value, lead.phone || '')} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                                                                                <span>{opt.icon}</span> {opt.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ position: 'relative' }}>
                                                                <button 
                                                                    className="action-trigger"
                                                                    onClick={() => setActiveActionPopup(activeActionPopup?.leadId === lead.id && activeActionPopup.type === 'mail' ? null : { leadId: lead.id, type: 'mail' })}
                                                                    style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Mail size={14} fill={lead.mailCount > 0 ? '#6366f1' : 'none'} />
                                                                </button>
                                                                {activeActionPopup?.leadId === lead.id && activeActionPopup.type === 'mail' && (
                                                                    <div className="action-popup" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 8, minWidth: 190, boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
                                                                        {MAIL_OUTCOME_OPTIONS.map(opt => (
                                                                            <button key={opt.value} onClick={() => handleLogMailStep(lead.id, opt.value, lead.email || '')} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                                                                                <span>{opt.icon}</span> {opt.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Goal Pacing */}
                    {goalsData?.goals && goalsData.goals.length > 0 && (
                        <div className="dash-card" style={{ gridColumn: 'span 12', padding: '16px 20px', animation: 'fadeSlideUp 0.4s ease both 0.44s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <div className="section-label" style={{ marginBottom: 2 }}>Monthly</div>
                                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Goal Pacing</h3>
                                </div>
                                <TrendingUp size={18} color="var(--accent-primary)" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
                                {goalsData.goals.map(goal => {
                                    const current = goalsData.progress[goal.category] || 0
                                    const percent = Math.min(100, Math.round((current / goal.targetValue) * 100))
                                    const label = goal.category === 'DEALS' ? 'Deals Closed' : goal.category === 'TEST_JOBS' ? 'Test Jobs' : goal.category === 'LEADS' ? 'New Leads' : goal.category
                                    const color = percent >= 100 ? '#10b981' : percent >= 60 ? 'var(--accent-primary)' : '#f59e0b'
                                    return (
                                        <div key={goal.id}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
                                                    <div style={{ fontSize: 22, fontWeight: 900, color }}>{percent}%</div>
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{current} / {goal.targetValue}</div>
                                            </div>
                                            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', width: `${percent}%`, borderRadius: 100,
                                                    background: `linear-gradient(90deg, ${color}, ${color}99)`,
                                                    transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Holidays */}
                    <div className="dash-card" style={{ gridColumn: 'span 12', padding: '16px 20px', animation: 'fadeSlideUp 0.4s ease both 0.46s', marginBottom: 12 }}>
                        <div className="section-label" style={{ marginBottom: 12 }}>Upcoming Holidays</div>
                        <div style={{ display: 'flex', gap: 24 }}>
                            {!holidays.length ? (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No upcoming holidays.</div>
                            ) : (
                                holidays.map((h) => (
                                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <Calendar size={14} color="var(--accent-primary)" />
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({format(new Date(h.date), 'MMM d')})</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Analytics Charts — AT THE BOTTOM */}
                    <div style={{ gridColumn: 'span 12', animation: 'fadeSlideUp 0.4s ease both 0.5s' }}>
                        <AnalyticsDashboard />
                    </div>

                </div>
            </div>
            
            {editTaskId && (
                <EditTaskModal
                    taskId={editTaskId}
                    onClose={() => setEditTaskId(null)}
                    onSuccess={() => {
                        setEditTaskId(null)
                        mutate('/api/dashboard/stats')
                    }}
                    leads={[]}
                    priorities={settings.priorities}
                />
            )}

            {/* Toast notifications */}
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: t.type === 'error' ? '#ef4444' : '#10b981',
                        color: 'white',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        animation: 'fadeSlideUp 0.25s ease both',
                        pointerEvents: 'auto'
                    }}>
                        {t.msg}
                    </div>
                ))}
            </div>
        </div>
    )
}
