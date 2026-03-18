import { Search } from 'lucide-react'
import NotificationCenter from './NotificationCenter'
interface HeaderProps {
    title: string
    user?: any 
    onSearch?: (query: string) => void
}

export default function Header({ title, onSearch }: HeaderProps) {

    return (
        <header className="header">
            <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                {title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="search-bar" style={{ maxWidth: 260 }}>
                    <Search size={15} color="var(--text-muted)" />
                    <input
                        placeholder="Search..."
                        onChange={e => onSearch && onSearch(e.target.value)}
                    />
                </div>
                <NotificationCenter />
            </div>
        </header>
    )
}
