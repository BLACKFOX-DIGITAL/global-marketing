import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import CommandPalette from '@/components/CommandPalette'

export const dynamic = 'force-dynamic'

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser()
    console.log(`[CRM-LAYOUT] Verifying user: ${user?.email || 'GUEST'}, Role: ${user?.role || 'NONE'}`)
    
    if (!user) {
        console.log(`[CRM-LAYOUT] No user found, redirecting to /login`)
        redirect('/login')
    }
    
    if (user.role === 'Administrator') {
        console.log(`[CRM-LAYOUT] Admin detected, redirecting to /admin/dashboard`)
        redirect('/admin/dashboard')
    }


    return (
        <div className="crm-layout">
            <Sidebar user={user} />
            <main className="crm-main">
                {children}
            </main>
            <CommandPalette />
        </div>
    )
}
