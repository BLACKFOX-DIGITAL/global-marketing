export default function DashboardLoading() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Bar Skeleton */}
            <div style={{
                height: 56, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0,
            }}>
                <div style={{ width: 120, height: 14, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>

            <div style={{ padding: '20px 24px' }}>
                {/* Hero Skeleton */}
                <div style={{
                    marginBottom: 20, padding: '20px 24px', height: 80,
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    animation: 'pulse 1.5s ease-in-out infinite',
                }} />

                {/* KPI Cards Skeleton */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                            height: 120, background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.1}s`,
                        }} />
                    ))}
                </div>

                {/* Bottom Row Skeleton */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            height: 280, background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.15}s`,
                        }} />
                    ))}
                </div>
            </div>

        </div>
    )
}
