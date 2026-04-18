'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, X, Info, CheckCircle, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Notification {
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    link?: string | null
    createdAt: string
}

export default function NotificationCenter() {
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = async () => {
        const res = await fetch('/api/notifications')
        if (res.ok) {
            const data = await res.json()
            setNotifications(data.notifications)
            setUnreadCount(data.unreadCount)
        }
    }

    useEffect(() => {
        requestAnimationFrame(() => {
            fetchNotifications()
        })
        const interval = setInterval(fetchNotifications, 60000) // Poll every minute
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const markRead = async (id?: string) => {
        await fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, readAll: !id })
        })
        fetchNotifications()
    }

    const clearNotifications = async (id?: string) => {
        await fetch(`/api/notifications${id ? `?id=${id}` : ''}`, { method: 'DELETE' })
        fetchNotifications()
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle size={14} color="#10b981" />
            case 'WARNING': return <AlertTriangle size={14} color="#f59e0b" />
            case 'SYSTEM_WARNING': return <AlertCircle size={14} color="#f43f5e" />
            case 'URGENT': return <AlertCircle size={14} color="#ef4444" />
            default: return <Info size={14} color="#6366f1" />
        }
    }

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                className="btn-ghost"
                onClick={() => setOpen(!open)}
                style={{ padding: '6px 8px', position: 'relative' }}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: 4, right: 4, width: 8, height: 8,
                        background: '#ef4444', borderRadius: '50%', border: '1.5px solid var(--bg-secondary)',
                        boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)'
                    }} />
                )}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, width: 340, zIndex: 100,
                    marginTop: 16, padding: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.4)',
                    maxHeight: 480, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 20,
                    background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 900, margin: 0, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Alerts</h3>
                        <button onClick={() => markRead()} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Mark all as read</button>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    style={{
                                        padding: '12px 16px', borderBottom: '1px solid var(--border)',
                                        background: n.isRead ? 'transparent' : 'rgba(99,102,241,0.05)',
                                        transition: 'background 0.2s', position: 'relative'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                                    onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(99,102,241,0.05)'}
                                >
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <div style={{ marginTop: 2 }}>{getTypeIcon(n.type)}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                                                {n.title}
                                                <button onClick={() => clearNotifications(n.id)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0 }}><X size={10} /></button>
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.4 }}>{n.message}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                                                {n.link && (
                                                    <Link href={n.link} onClick={() => { setOpen(false); markRead(n.id) }} style={{ fontSize: 10, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                                        View <ExternalLink size={8} />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div style={{ padding: 10, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => clearNotifications()} style={{ color: '#ef4444', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>Clear history</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
