import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import CommandPalette from '@/components/CommandPalette'

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')
    if (user.role === 'Administrator') redirect('/admin/dashboard')

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
