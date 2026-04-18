export default function TasksLoading() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ width: 140, height: 16, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div style={{ width: 120, height: 24, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ height: 40, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{
                            height: 52, borderBottom: '1px solid var(--border)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.06}s`,
                        }} />
                    ))}
                </div>
            </div>
        </div>
    )
}
