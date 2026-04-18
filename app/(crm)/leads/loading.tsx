export default function LeadsLoading() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header Skeleton */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ width: 180, height: 16, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>

            <div style={{ padding: '24px' }}>
                {/* Page Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <div style={{ width: 80, height: 24, borderRadius: 6, background: 'var(--border)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <div style={{ width: 300, height: 12, borderRadius: 6, background: 'var(--border)', opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                    <div style={{ width: 120, height: 36, borderRadius: 8, background: 'var(--accent-primary)', opacity: 0.3, animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>

                {/* Stat Cards Skeleton */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            flex: 1, height: 72, background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 20, animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.1}s`,
                        }} />
                    ))}
                </div>

                {/* Search Bar Skeleton */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <div style={{ flex: 1, maxWidth: 480, height: 38, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: 140, height: 38, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>

                {/* Table Skeleton */}
                <div style={{ background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, overflow: 'hidden' }}>
                    {/* Header row */}
                    <div style={{ height: 48, borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    {/* Data rows */}
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} style={{
                            height: 52, borderBottom: '1px solid rgba(255,255,255,0.04)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.05}s`,
                        }} />
                    ))}
                </div>
            </div>

        </div>
    )
}
