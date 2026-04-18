'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { LayoutDashboard, Users, Target, CheckSquare, Zap, LogOut, Clock, ClipboardList, CalendarOff, Trophy, Settings, Briefcase, Waves, ChevronLeft, ChevronRight, Banknote } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/opportunities', label: 'Opportunities', icon: Target },
    { href: '/pool', label: 'Lead Pool', icon: Waves },
    { href: '/customers', label: 'Customers', icon: Briefcase },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

const HR_ITEMS = [
    { href: '/attendance', label: 'Attendance', icon: Clock },
    { href: '/attendance/log', label: 'My Log', icon: ClipboardList },
    { href: '/leave', label: 'Leave', icon: CalendarOff },
]

const ADMIN_PERFORMANCE = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/reports/sales', label: 'Analytics', icon: Waves },
    { href: '/admin/goals', label: 'Targets & Quotas', icon: Target },
]

const ADMIN_SYSTEM = [
    { href: '/admin/leads', label: 'Global Leads', icon: Users },
    { href: '/admin/audit', label: 'Activity Log', icon: ClipboardList },
    { href: '/admin/workforce', label: 'Attendance', icon: Clock },
    { href: '/admin/payroll', label: 'Payroll', icon: Banknote },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
    user: { name: string; email: string; role: string } | null
}

export default function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed')
        if (saved === 'true') setIsCollapsed(true)
    }, [])

    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '280px')
        localStorage.setItem('sidebar-collapsed', String(isCollapsed))
    }, [isCollapsed])

    // Click-outside to close user menu
    useEffect(() => {
        if (!menuOpen) return
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [menuOpen])

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
        router.refresh()
    }

    const initials = user?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
    const colorIndex = (user?.name.charCodeAt(0) || 0) % colors.length

    const NavLink = ({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) => (
        <Link
            href={href}
            className={`nav-item ${active ? 'active' : ''}`}
            style={{
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '10px 0' : '10px 12px',
                position: 'relative',
            }}
        >
            {/* Active indicator bar */}
            {active && (
                <div style={{
                    position: 'absolute',
                    left: 0, top: '20%', bottom: '20%',
                    width: 3, borderRadius: '0 3px 3px 0',
                    background: 'var(--accent-primary)',
                    boxShadow: '0 0 8px var(--accent-primary)',
                    transition: 'all 0.3s ease',
                }} />
            )}
            <Icon size={18} style={{ opacity: active ? 1 : 0.7, transition: 'opacity 0.2s' }} />
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>{label}</span>}
        </Link>
    )

    return (
        <>
            {/* Dynamic transform for collapse button hover — depends on isCollapsed state */}
            <style>{`.sidebar-collapse-btn:hover { transform: ${isCollapsed ? 'translateX(50%)' : 'translateY(-50%)'} scale(1.1); }`}</style>

            <aside className="sidebar sidebar-polished" style={{ width: isCollapsed ? 80 : 280 }}>
                {/* Logo */}
                <div className="sidebar-logo" style={{
                    padding: isCollapsed ? '24px 0' : '24px 16px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    position: 'relative', minHeight: 80,
                }}>
                    <div className="sidebar-logo-icon">
                        <Zap size={18} color="white" fill="white" />
                    </div>
                    {!isCollapsed && (
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>Global Marketing</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>Sales Platform</div>
                        </div>
                    )}
                    <button
                        className="sidebar-collapse-btn"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{
                            position: 'absolute',
                            right: isCollapsed ? '50%' : '-10px',
                            top: isCollapsed ? '85%' : '50%',
                            transform: isCollapsed ? 'translateX(50%)' : 'translateY(-50%)',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            width: 24, height: 24,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)',
                            zIndex: 50, cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Navigation */}
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {user?.role !== 'Administrator' ? (
                        <>
                            <div className="nav-section">
                                {!isCollapsed && <div className="nav-section-label">Sales</div>}
                                {NAV_ITEMS.map(({ href, label, icon }) => {
                                    const active = pathname === href || (pathname.startsWith(href + '/') && href !== '/attendance')
                                    return <NavLink key={href} href={href} label={label} icon={icon} active={active} />
                                })}
                            </div>

                            <div className="nav-section">
                                {!isCollapsed && <div className="nav-section-label">HR</div>}
                                {HR_ITEMS.map(({ href, label, icon }) => {
                                    const active = pathname === href
                                    return <NavLink key={href} href={href} label={label} icon={icon} active={active} />
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="nav-section">
                                {!isCollapsed && <div className="nav-section-label">Overview</div>}
                                {ADMIN_PERFORMANCE.map(({ href, label, icon }) => {
                                    const active = pathname === href || pathname.startsWith(href + '/')
                                    return <NavLink key={href} href={href} label={label} icon={icon} active={active} />
                                })}
                            </div>
                            <div className="nav-section">
                                {!isCollapsed && <div className="nav-section-label">Management</div>}
                                {ADMIN_SYSTEM.slice(0, 4).map(({ href, label, icon }) => {
                                    const active = pathname === href || pathname.startsWith(href + '/')
                                    return <NavLink key={href} href={href} label={label} icon={icon} active={active} />
                                })}
                            </div>
                            <div className="nav-section">
                                {!isCollapsed && <div className="nav-section-label">System</div>}
                                {ADMIN_SYSTEM.slice(4).map(({ href, label, icon }) => {
                                    const active = pathname === href || pathname.startsWith(href + '/')
                                    return <NavLink key={href} href={href} label={label} icon={icon} active={active} />
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* User Menu */}
                <div ref={menuRef} style={{ padding: isCollapsed ? '12px 10px' : '16px 14px', borderTop: '1px solid var(--border)', position: 'relative' }}>
                    {/* User Menu Dropdown */}
                    {menuOpen && user && (
                        <div className="sidebar-menu-popup" style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 12px)',
                            left: isCollapsed ? 12 : 14,
                            right: isCollapsed ? 'auto' : 14,
                            width: isCollapsed ? 240 : 'auto',
                            background: 'rgba(15,23,42,0.8)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 24,
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.6)',
                            padding: '24px',
                            zIndex: 1000,
                            backdropFilter: 'blur(40px)'
                        }}>
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: 12 }}>User Account</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div className="avatar" style={{
                                        background: `linear-gradient(135deg, ${colors[colorIndex]}, ${colors[(colorIndex + 1) % colors.length]})`,
                                        color: 'white', width: 44, height: 44, fontSize: 16, fontWeight: 700,
                                        border: '2px solid rgba(255,255,255,0.1)',
                                    }}>
                                        {initials}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 16 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: 12 }}>Appearance</div>
                                <ThemeSwitcher variant="sidebar" />
                            </div>

                            <button 
                                onClick={handleLogout} 
                                className="sidebar-logout-btn"
                                style={{ 
                                    width: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    color: '#ef4444', 
                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    padding: '10px',
                                    fontWeight: 600, fontSize: 13,
                                    borderRadius: 10, cursor: 'pointer',
                                }}
                            >
                                <LogOut size={15} />
                                <span>Sign out</span>
                            </button>
                        </div>
                    )}

                    {/* Main User Button */}
                    <button 
                        id="user-menu-trigger"
                        className="sidebar-user-btn"
                        onClick={() => setMenuOpen(prev => !prev)}
                        style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 14,
                            padding: isCollapsed ? '8px 4px' : '10px 12px',
                            display: 'flex', alignItems: 'center', gap: 10,
                            cursor: 'pointer', textAlign: 'left',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div className="avatar" style={{
                            background: `linear-gradient(135deg, ${colors[colorIndex]}, ${colors[(colorIndex + 1) % colors.length]})`,
                            color: 'white', width: 32, height: 32, fontSize: 12, flexShrink: 0,
                        }}>
                            {initials}
                        </div>
                        {!isCollapsed && (
                            <>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{user?.name || 'User'}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role === 'Administrator' ? 'Admin' : 'Sales Rep'}</div>
                                </div>
                                <ChevronRight size={14} color="var(--text-muted)" style={{ opacity: 0.4, transition: 'opacity 0.2s' }} />
                            </>
                        )}
                    </button>
                </div>
            </aside>
        </>
    )
}
