'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { LayoutDashboard, Users, Target, CheckSquare, Zap, LogOut, ShieldAlert, Settings, Briefcase, ChevronLeft, ChevronRight, Banknote, BarChart3, Database, History } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'

const ADMIN_LINKS = [
    { section: 'Overview', items: [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/reports/sales', label: 'Sales Report', icon: BarChart3 },
        { href: '/admin/reports/attendance', label: 'Attendance Report', icon: CheckSquare },
        { href: '/admin/goals', label: 'Targets & Quotas', icon: Target },
    ]},
    { section: 'Management', items: [
        { href: '/admin/leads', label: 'Global Leads', icon: Database },
        { href: '/admin/audit', label: 'Leads Activity', icon: History },
        { href: '/admin/workforce', label: 'Attendance', icon: Users },
        { href: '/admin/payroll', label: 'Payroll', icon: Banknote },
    ]},
    { section: 'System', items: [
        { href: '/admin/settings', label: 'Settings', icon: Settings },
    ]}
]

interface AdminSidebarProps {
    user: { name: string; email: string; role: string } | null
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const saved = localStorage.getItem('admin-sidebar-collapsed')
        if (saved === 'true') setIsCollapsed(true)
    }, [])

    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '260px')
        localStorage.setItem('admin-sidebar-collapsed', String(isCollapsed))
    }, [isCollapsed])

    useEffect(() => {
        if (!menuOpen) return
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [menuOpen])

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
        router.refresh()
    }

    const initials = user?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A'
    
    const adminColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981']
    const adminColorIdx = (user?.name.charCodeAt(0) || 0) % adminColors.length

    const NavLink = ({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) => (
        <Link href={href} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: isCollapsed ? '8px 0' : '6px 12px',
            margin: '1px 8px',
            borderRadius: 8,
            color: active ? '#f8fafc' : '#94a3b8',
            background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
            textDecoration: 'none',
            fontSize: 12.5,
            fontWeight: active ? 800 : 500,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            border: active ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
        }} onMouseEnter={e => { if(!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }} onMouseLeave={e => { if(!active) e.currentTarget.style.background = 'transparent' }}>
            {active && !isCollapsed && (
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2, background: 'var(--accent-primary)', borderRadius: '0 4px 4px 0', boxShadow: '0 0 10px var(--accent-primary)' }} />
            )}
            <Icon size={15} color={active ? 'var(--accent-primary)' : 'inherit'} strokeWidth={active ? 2.5 : 2} />
            {!isCollapsed && <span style={{ letterSpacing: '0.2px' }}>{label}</span>}
        </Link>
    )

    return (
        <>
        <aside style={{
            width: isCollapsed ? 80 : 260,
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 40,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            <div style={{ padding: isCollapsed ? '16px 0' : '16px 16px', display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start', alignItems: 'center', minHeight: 60, position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent-primary), #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)' }}>
                    <Zap size={16} color="#fff" fill="#fff" strokeWidth={3} />
                </div>
                {!isCollapsed && (
                    <div style={{ marginLeft: 12, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.4px', textTransform: 'uppercase' }}>Obsidian</div>
                        <div style={{ fontSize: 9, color: 'var(--accent-primary)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 900, opacity: 0.8 }}>Professional</div>
                    </div>
                )}
                <button 
                    className="admin-collapse-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        position: 'absolute', right: isCollapsed ? '50%' : '-12px', top: isCollapsed ? '85%' : '50%',
                        transform: isCollapsed ? 'translateX(50%)' : 'translateY(-50%)',
                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%',
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', cursor: 'pointer', zIndex: 50,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 10 }}>
                {ADMIN_LINKS.map(section => (
                    <div key={section.section} style={{ marginBottom: 12 }}>
                        {!isCollapsed && <div style={{ padding: '0 18px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {section.section}
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.02)' }} />
                        </div>}
                        {section.items.map(item => {
                            const active = pathname === item.href || pathname.startsWith(item.href + '/')
                            return <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={active} />
                        })}
                    </div>
                ))}
            </div>

            <div ref={menuRef} style={{ padding: isCollapsed ? '12px 10px' : '16px', borderTop: '1px solid var(--border)', position: 'relative' }}>
                {menuOpen && (
                    <div className="admin-sidebar-menu-popup" style={{
                        position: 'absolute', bottom: 'calc(100% + 10px)', left: isCollapsed ? 10 : 16, right: isCollapsed ? 'auto' : 16,
                        width: isCollapsed ? 240 : 'auto', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 24, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.6)', padding: 24, zIndex: 1000,
                        backdropFilter: 'blur(40px)'
                    }}>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: 12 }}>Admin Account</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="avatar" style={{
                                    background: `linear-gradient(135deg, ${adminColors[adminColorIdx]}, ${adminColors[(adminColorIdx + 1) % adminColors.length]})`,
                                    color: 'white', width: 40, height: 40, fontSize: 14, fontWeight: 700,
                                    border: '2px solid rgba(255,255,255,0.1)',
                                }}>{initials}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 14 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: 10 }}>Appearance</div>
                            <ThemeSwitcher variant="sidebar" />
                        </div>
                        <button className="admin-logout-btn" onClick={handleLogout} style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '10px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 10, cursor: 'pointer',
                            fontSize: 13, fontWeight: 600,
                        }}>
                            <LogOut size={15} /> <span>Sign out</span>
                        </button>
                    </div>
                )}

                <button className="admin-user-btn" onClick={() => setMenuOpen(prev => !prev)} style={{
                    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: isCollapsed ? '8px 4px' : '10px 12px', borderRadius: 14,
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
                    transition: 'all 0.2s'
                }}>
                    <div className="avatar" style={{
                        background: `linear-gradient(135deg, ${adminColors[adminColorIdx]}, ${adminColors[(adminColorIdx + 1) % adminColors.length]})`,
                        color: '#fff', width: 30, height: 30, borderRadius: 8, fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Admin'}</div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Administrator</div>
                            </div>
                            <ChevronRight size={14} color="var(--text-muted)" style={{ opacity: 0.4 }} />
                        </>
                    )}
                </button>
            </div>
        </aside>
        </>
    )
}
