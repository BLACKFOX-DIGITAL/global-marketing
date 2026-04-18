export default function OpportunitiesLoading() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ width: 160, height: 16, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ width: 160, height: 24, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: 160, height: 36, borderRadius: 8, background: 'var(--accent-primary)', opacity: 0.3, animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
                {/* Pipeline columns skeleton */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[1, 2, 3, 4].map(col => (
                        <div key={col}>
                            <div style={{ width: 100, height: 14, borderRadius: 6, background: 'var(--border)', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
                            {[1, 2, 3].map(card => (
                                <div key={card} style={{
                                    height: 90, background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    borderRadius: 10, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite',
                                    animationDelay: `${(col * 3 + card) * 0.05}s`,
                                }} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
