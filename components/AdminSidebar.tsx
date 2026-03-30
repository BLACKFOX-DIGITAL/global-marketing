'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { LayoutDashboard, Users, Target, CheckSquare, Zap, LogOut, ShieldAlert, Settings, Briefcase, ChevronLeft, ChevronRight, Banknote, BarChart3, Database, History } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'

const ADMIN_LINKS = [
    { section: 'Overview', items: [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/reports/sales', label: 'Analytics', icon: BarChart3 },
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
    
    // Very subtle, modern color for admin avatar
    const avatarBg = 'linear-gradient(135deg, #1e293b, #0f172a)'

    const NavLink = ({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) => (
        <Link href={href} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: isCollapsed ? '10px 0' : '8px 12px',
            margin: '2px 10px',
            borderRadius: 8,
            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: active ? 600 : 500,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s ease',
        }} onMouseEnter={e => { if(!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }} onMouseLeave={e => { if(!active) e.currentTarget.style.background = 'transparent' }}>
            <Icon size={16} color={active ? 'var(--text-primary)' : 'var(--text-muted)'} />
            {!isCollapsed && <span>{label}</span>}
        </Link>
    )

    return (
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
            <div style={{ padding: isCollapsed ? '24px 0' : '24px 20px', display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start', alignItems: 'center', minHeight: 70, position: 'relative' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={14} color="var(--bg-card)" fill="var(--bg-card)" />
                </div>
                {!isCollapsed && (
                    <div style={{ marginLeft: 12, overflow: 'hidden' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Workspace</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.3px', textTransform: 'uppercase', fontWeight: 600 }}>Admin Portal</div>
                    </div>
                )}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        position: 'absolute', right: isCollapsed ? '50%' : '-12px', top: isCollapsed ? '85%' : '50%',
                        transform: isCollapsed ? 'translateX(50%)' : 'translateY(-50%)',
                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%',
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', cursor: 'pointer', zIndex: 50, transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 10 }}>
                {ADMIN_LINKS.map(section => (
                    <div key={section.section} style={{ marginBottom: 16 }}>
                        {!isCollapsed && <div style={{ padding: '0 22px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 6 }}>
                            {section.section}
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
                    <div style={{
                        position: 'absolute', bottom: 'calc(100% + 10px)', left: isCollapsed ? 10 : 16, right: isCollapsed ? 'auto' : 16,
                        width: isCollapsed ? 220 : 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', padding: 12, zIndex: 100,
                        animation: 'fadeSlideUp 0.15s ease-out'
                    }}>
                        <div style={{ padding: '4px 8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
                        </div>
                        <div style={{ padding: '4px 8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Theme</div>
                            <ThemeSwitcher variant="sidebar" />
                        </div>
                        <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px', color: '#ef4444', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <LogOut size={14} /> Sign out
                        </button>
                    </div>
                )}

                <button onClick={() => setMenuOpen(prev => !prev)} style={{
                    width: '100%', background: 'transparent', border: 'none', padding: isCollapsed ? '4px' : '6px 8px', borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.2s'
                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ background: avatarBg, color: '#fff', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name || 'Admin'}</div>
                        </div>
                    )}
                </button>
            </div>
        </aside>
    )
}
