export default function LeaderboardLoading() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ width: 160, height: 16, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            <div style={{ padding: '24px', display: 'flex', gap: 20 }}>
                {/* Main leaderboard skeleton */}
                <div style={{ flex: 1 }}>
                    <div style={{ width: 140, height: 28, borderRadius: 8, background: 'var(--border)', marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{
                            height: 64, background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 12, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.08}s`,
                        }} />
                    ))}
                </div>
                {/* Sidebar skeleton */}
                <div style={{ width: 280, flexShrink: 0 }}>
                    <div style={{
                        height: 200, background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 12, marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                    <div style={{
                        height: 300, background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite',
                        animationDelay: '0.15s',
                    }} />
                </div>
            </div>
        </div>
    )
}
