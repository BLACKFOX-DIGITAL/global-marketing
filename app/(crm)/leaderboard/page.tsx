'use client'
import { useState, useEffect } from 'react'
import NotificationCenter from '@/components/NotificationCenter'
import { Trophy, Award, Star, TrendingUp, Target, CheckCircle, Clock, Flame, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'


interface LeaderboardEntry {
    id: string; name: string; role: string; rank: number
    xp: number; level: number; title: string
    currentStreak: number; longestStreak: number; badgeCount: number
    leads: number; closedWon: number; winRate: number
    tasksCompleted: number; hoursWorked: number; totalOpps: number
}

interface LeaderboardData {
    leaderboard: LeaderboardEntry[]
    currentUser: LeaderboardEntry | null
    totalUsers: number
}

const PERIODS = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
]

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899']

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getColor(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

export default function LeaderboardPage() {
    const [data, setData] = useState<LeaderboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('month')
    const [xpGuideOpen, setXpGuideOpen] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => {
            setLoading(true)
            fetch(`/api/leaderboard?period=${period}`)
                .then(r => r.json())
                .then(d => { setData(d); setLoading(false) })
                .catch(() => setLoading(false))
        })
    }, [period])

    const top3 = data?.leaderboard.slice(0, 3) || []
    const cu = data?.currentUser

    // Podium order: [2nd, 1st, 3rd]
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3

    return (
        <div className="crm-content" style={{ paddingTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* Left column */}
                <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <NotificationCenter />
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Trophy size={22} color="#f59e0b" /> Sales Leaderboard
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Ranked by XP. Earn points through calls, mails, tasks, conversions & wins.</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                                    Last updated: {data ? format(new Date(), 'MMM dd, h:mm a') : '—'}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                            {PERIODS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriod(p.key)}
                                    style={{
                                        padding: '8px 16px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        background: period === p.key ? 'var(--accent-primary)' : 'transparent',
                                        color: period === p.key ? 'white' : 'var(--text-secondary)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                                <div className="spinner" style={{ width: 32, height: 32 }} />
                            </div>
                        ) : (
                            <>
                                {/* Podium */}
                                {top3.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
                                        {podiumOrder.map((entry, idx) => {
                                            const podiumRank = top3.length >= 3 ? [2, 1, 3][idx] : entry.rank
                                            const isFirst = podiumRank === 1
                                            const rankColors: Record<number, string> = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' }
                                            const rankLabels: Record<number, string> = { 1: '1ST', 2: '2ND', 3: '3RD' }
                                            const podiumHeightMap: Record<number, number> = { 1: 160, 2: 130, 3: 110 }
                                            const rankColor = rankColors[podiumRank] || '#6366f1'
                                            const rankLabel = rankLabels[podiumRank] || `#${podiumRank}`

                                            return (
                                                <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 200 }}>
                                                    {/* Avatar */}
                                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                                        <div style={{
                                                            width: isFirst ? 80 : 64, height: isFirst ? 80 : 64,
                                                            borderRadius: '50%', background: getColor(entry.name),
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: isFirst ? 24 : 18, fontWeight: 700, color: 'white',
                                                            border: `3px solid ${rankColor}`,
                                                            boxShadow: isFirst ? `0 0 30px ${rankColor}40` : 'none',
                                                        }}>
                                                            {getInitials(entry.name)}
                                                        </div>
                                                        {/* Rank badge */}
                                                        <div style={{
                                                            position: 'absolute', bottom: -4, right: -4,
                                                            background: rankColor, color: podiumRank === 1 ? '#000' : '#fff',
                                                            fontSize: 9, fontWeight: 800, padding: '2px 6px',
                                                            borderRadius: 8, letterSpacing: '0.5px',
                                                        }}>
                                                            {rankLabel}
                                                        </div>
                                                        {/* Crown for 1st */}
                                                        {isFirst && (
                                                            <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)' }}>
                                                                <Star size={20} color="#f59e0b" fill="#f59e0b" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Name & Title */}
                                                    <div style={{ fontSize: isFirst ? 15 : 13, fontWeight: 700, textAlign: 'center', marginBottom: 2 }}>{entry.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{entry.title}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                                        <span style={{ fontSize: 12, color: rankColor, fontWeight: 700 }}>{entry.xp} XP</span>
                                                        {entry.currentStreak >= 3 && (
                                                            <span style={{ fontSize: 11 }}>🔥{entry.currentStreak}</span>
                                                        )}
                                                    </div>

                                                    {/* Podium pillar */}
                                                    <div style={{
                                                        width: '100%', height: podiumHeightMap[podiumRank] || 100,
                                                        background: `linear-gradient(180deg, ${rankColor}20 0%, ${rankColor}08 100%)`,
                                                        border: `1px solid ${rankColor}30`,
                                                        borderRadius: '12px 12px 0 0',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                        justifyContent: 'center', gap: 6,
                                                    }}>
                                                        <div style={{ fontSize: 16, fontWeight: 800, color: rankColor }}>Lv.{entry.level}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.closedWon} won</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.leads} leads</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🏅 {entry.badgeCount}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Full Rankings Table */}
                                {(data?.leaderboard?.length || 0) > 0 && (
                                    <div className="card" style={{ padding: 0 }}>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 60 }}>Rank</th>
                                                    <th>Name</th>
                                                    <th>Level</th>
                                                    <th>XP</th>
                                                    <th>Streak</th>
                                                    <th>Badges</th>
                                                    <th>Tasks</th>
                                                    <th>Win Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data?.leaderboard.map(entry => (
                                                    <tr key={entry.id} style={{ background: entry.id === cu?.id ? 'rgba(99,102,241,0.06)' : undefined }}>
                                                        <td style={{ fontWeight: 700, fontSize: 14, color: entry.rank <= 3 ? ['', '#f59e0b', '#94a3b8', '#cd7f32'][entry.rank] : 'var(--text-muted)' }}>#{entry.rank}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{
                                                                    width: 32, height: 32, borderRadius: '50%',
                                                                    background: getColor(entry.name), color: 'white',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 11, fontWeight: 700,
                                                                }}>
                                                                    {getInitials(entry.name)}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.name}</div>
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{entry.title}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                                                                Lv.{entry.level}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: 13, fontWeight: 700 }}>{entry.xp.toLocaleString()}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                {entry.currentStreak >= 3 && <span style={{ fontSize: 13 }}>🔥</span>}
                                                                <span style={{ fontSize: 13, fontWeight: entry.currentStreak >= 3 ? 700 : 400, color: entry.currentStreak >= 3 ? '#f59e0b' : 'var(--text-muted)' }}>
                                                                    {entry.currentStreak}d
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: 13 }}>🏅 {entry.badgeCount}</td>
                                                        <td style={{ fontSize: 13 }}>{entry.tasksCompleted}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ fontSize: 13 }}>{entry.winRate}%</span>
                                                                <div style={{ width: 50, height: 5, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', width: `${entry.winRate}%`, background: '#6366f1', borderRadius: 3 }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Your current status */}
                        {cu && (
                            <div style={{
                                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                borderRadius: 14, padding: '24px 20px', color: 'white',
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8, marginBottom: 8 }}>Your Current Status</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>#{cu.rank}</span>
                                    <span style={{ fontSize: 13, opacity: 0.8 }}>out of {data?.totalUsers} agents</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700 }}>{cu.title}</span>
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>Level {cu.level} · {cu.xp.toLocaleString()} XP</div>
                                {cu.rank > 1 && (
                                    <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                                        You need <strong>{(data?.leaderboard[cu.rank - 2]?.xp || 0) - cu.xp} more XP</strong> to reach #{cu.rank - 1}!
                                    </div>
                                )}
                                {cu.currentStreak >= 1 && (
                                    <div style={{ fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>🔥</span> <strong>{cu.currentStreak}-day streak</strong>
                                        {cu.longestStreak > cu.currentStreak && (
                                            <span style={{ opacity: 0.6, fontSize: 11 }}>(best: {cu.longestStreak})</span>
                                        )}
                                    </div>
                                )}
                                <button
                                    onClick={() => window.location.href = '/tasks'}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.3)',
                                        background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 13, fontWeight: 700,
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    Earn More XP →
                                </button>
                            </div>
                        )}

                        {/* Quick Stats */}
                        {cu && (
                            <div className="card">
                                <div style={{ fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <TrendingUp size={15} color="#6366f1" /> Quick Stats
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                        <Target size={16} color="#6366f1" style={{ marginBottom: 6 }} />
                                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Leads</div>
                                        <div style={{ fontSize: 20, fontWeight: 700 }}>{cu.leads}</div>
                                    </div>
                                    <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                        <Award size={16} color="#10b981" style={{ marginBottom: 6 }} />
                                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Closed</div>
                                        <div style={{ fontSize: 20, fontWeight: 700 }}>{cu.closedWon} Deals</div>
                                    </div>
                                    <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                        <CheckCircle size={16} color="#f59e0b" style={{ marginBottom: 6 }} />
                                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Tasks</div>
                                        <div style={{ fontSize: 20, fontWeight: 700 }}>{cu.tasksCompleted}</div>
                                    </div>
                                    <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                        <Clock size={16} color="#06b6d4" style={{ marginBottom: 6 }} />
                                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Hours</div>
                                        <div style={{ fontSize: 20, fontWeight: 700 }}>{cu.hoursWorked}h</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* XP Scoring Guide */}
                        <div className="card">
                            <div 
                                style={{ fontWeight: 600, marginBottom: xpGuideOpen ? 14 : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}
                                onClick={() => setXpGuideOpen(!xpGuideOpen)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Zap size={15} color="#f59e0b" /> How to Earn XP
                                </div>
                                {xpGuideOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                            </div>
                            
                            {xpGuideOpen && (
                                <div style={{ animation: 'slideDown 0.2s ease-out' }}>
                                    {[
                                        { label: 'Win Opportunity', points: '+100 XP', color: '#10b981', icon: '🏆' },
                                        { label: 'Convert a Lead', points: '+50 XP', color: '#8b5cf6', icon: '⚔️' },
                                        { label: 'Log a Call', points: '+15 XP', color: '#6366f1', icon: '📞' },
                                        { label: 'Complete Task', points: '+10 XP', color: '#f59e0b', icon: '✅' },
                                        { label: 'Send Mail', points: '+10 XP', color: '#06b6d4', icon: '📧' },
                                        { label: 'Add a Lead', points: '+5 XP', color: '#ec4899', icon: '➕' },
                                        { label: 'Claim from Pool', points: '+5 XP', color: '#94a3b8', icon: '🎣' },
                                        { label: 'Create a Task', points: '+3 XP', color: '#f59e0b', icon: '📝' },
                                        { label: 'Update a Lead', points: '+3 XP', color: '#64748b', icon: '✏️' },
                                    ].map(item => (
                                        <div key={item.label} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 0', borderBottom: '1px solid var(--border)',
                                        }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <span>{item.icon}</span> {item.label}
                                            </span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.points}</span>
                                        </div>
                                    ))}
                                    <div style={{ padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8, marginTop: 12 }}>
                                        <div style={{ marginBottom: 4, fontSize: 11, color: 'var(--text-primary)' }}>
                                            💡 <strong>Streak Bonus:</strong> Keep a daily streak to multiply all XP by up to 2x!
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                            ⚠️ <strong>Note:</strong> Editing the same item repeatedly is subject to an anti-spam cooldown.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
