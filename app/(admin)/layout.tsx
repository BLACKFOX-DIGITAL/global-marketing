import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import CommandPalette from '@/components/CommandPalette'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    // If an authorized user is NOT an Administrator, send them to their dashboard
    // rather than the login page to prevent a bounce loop if they hit this group.
    if (user.role !== 'Administrator') {
        redirect('/dashboard')
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
            <AdminSidebar user={user} />
            <main style={{ 
                flex: 1, 
                marginLeft: 'var(--sidebar-width, 260px)', 
                transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                position: 'relative'
            }}>
                {children}
            </main>
            <CommandPalette />
        </div>
    )
}
