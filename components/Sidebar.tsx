'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { LayoutDashboard, Users, Target, CheckSquare, Zap, LogOut, Clock, ClipboardList, CalendarOff, Trophy, ShieldAlert, Settings, Briefcase, Waves, ChevronLeft, ChevronRight, Banknote } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/opportunities', label: 'Opportunities', icon: Target },
    { href: '/pool', label: 'Lead Pool', icon: Waves },
    { href: '/customers', label: 'Customers', icon: Briefcase },
    { href: '/tasks', label: 'Follow-Ups', icon: CheckSquare },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

const HR_ITEMS = [
    { href: '/attendance', label: 'Attendance', icon: Clock },
    { href: '/attendance/log', label: 'Attendance Log', icon: ClipboardList },
    { href: '/leave', label: 'Leave Requests', icon: CalendarOff },
]

const ADMIN_PERFORMANCE = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/reports/sales', label: 'Analytics', icon: Waves }, // Using Waves/BarChart icon
    { href: '/admin/goals', label: 'Targets & Quotas', icon: Target },
]

const ADMIN_SYSTEM = [
    { href: '/admin/leads', label: 'Global Leads', icon: Users },
    { href: '/admin/audit', label: 'Leads Activity', icon: ClipboardList },
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
        <Link href={href} className={`nav-item ${active ? 'active' : ''}`} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '10px 0' : '10px 12px' }}>
            <Icon size={18} />
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
        </Link>
    )

    return (
        <aside className="sidebar" style={{ width: isCollapsed ? 80 : 280 }}>
            <div className="sidebar-logo" style={{ padding: isCollapsed ? '24px 0' : '24px 16px', justifyContent: isCollapsed ? 'center' : 'flex-start', position: 'relative', minHeight: 80 }}>
                <div className="sidebar-logo-icon">
                    <Zap size={18} color="white" fill="white" />
                </div>
                {!isCollapsed && (
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>Global Marketing</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sales Platform</div>
                    </div>
                )}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        position: 'absolute',
                        right: isCollapsed ? '50%' : '-10px',
                        top: isCollapsed ? '85%' : '50%',
                        transform: isCollapsed ? 'translateX(50%)' : 'translateY(-50%)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        zIndex: 50,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {user?.role !== 'Administrator' ? (
                    <>
                        <div className="nav-section">
                            {!isCollapsed && <div className="nav-section-label">Operations Control</div>}
                            {NAV_ITEMS.map(({ href, label, icon }) => {
                                const active = pathname === href || (pathname.startsWith(href + '/') && href !== '/attendance')
                                return <NavLink key={href} href={href} label={label} icon={icon} active={active} />
                            })}
                        </div>

                        <div className="nav-section">
                            {!isCollapsed && <div className="nav-section-label">Performance & HR</div>}
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

            <div ref={menuRef} style={{ padding: isCollapsed ? '12px 10px' : '16px 14px', borderTop: '1px solid var(--border)', position: 'relative' }}>
                {/* User Menu Dropdown — React-controlled */}
                {menuOpen && user && (
                    <div style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 12px)',
                        left: isCollapsed ? 12 : 14,
                        right: isCollapsed ? 'auto' : 14,
                        width: isCollapsed ? 240 : 'auto',
                        background: '#0f172a', /* Solid background to prevent bleed */
                        border: '1px solid var(--border-light)',
                        borderRadius: 16,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                        padding: '20px',
                        zIndex: 1000,
                        animation: 'fadeSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both',
                    }}>
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: 12 }}>User Account</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div className="avatar" style={{ background: colors[colorIndex], color: 'white', width: 44, height: 44, fontSize: 16, fontWeight: 700, border: '2px solid rgba(255,255,255,0.1)' }}>
                                    {initials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: 12 }}>Appearance</div>
                            <ThemeSwitcher variant="sidebar" />
                        </div>

                        <button 
                            onClick={handleLogout} 
                            className="nav-item" 
                            style={{ 
                                width: '100%', 
                                justifyContent: 'center', 
                                color: '#ef4444', 
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '10px',
                                fontWeight: 600,
                                borderRadius: 10
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            <LogOut size={16} />
                            <span style={{ marginLeft: 8 }}>Sign out</span>
                        </button>
                    </div>
                )}

                {/* Main User Button */}
                <button 
                    id="user-menu-trigger"
                    onClick={() => setMenuOpen(prev => !prev)}
                    style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: isCollapsed ? '8px 4px' : '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                >
                    <div className="avatar" style={{ background: colors[colorIndex], color: 'white', width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 660, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{user?.name || 'User'}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{user?.role === 'Administrator' ? 'Admin' : 'Sales Rep'}</div>
                            </div>
                            <ChevronRight size={14} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                        </>
                    )}
                </button>
            </div>
        </aside>
    )
}
