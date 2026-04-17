import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import CommandPalette from '@/components/CommandPalette'
import KeyboardShortcutsProvider from '@/components/KeyboardShortcutsProvider'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser()
    console.log(`[ADMIN-LAYOUT] Verifying user: ${user?.email || 'GUEST'}, Role: ${user?.role || 'NONE'}`)
    
    if (!user) {
        console.log(`[ADMIN-LAYOUT] No user found, redirecting to /login`)
        redirect('/login')
    }

    // If an authorized user is NOT an Administrator, send them to their dashboard
    // rather than the login page to prevent a bounce loop if they hit this group.
    if (user.role !== 'Administrator') {
        console.log(`[ADMIN-LAYOUT] Admin-only access. Redirecting user ${user.email} to /dashboard`)
        redirect('/dashboard')
    }


    return (
        <KeyboardShortcutsProvider>
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
        </KeyboardShortcutsProvider>
    )
}
