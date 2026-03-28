'use client'
import { Component, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

/**
 * React Error Boundary — catches runtime errors in the component tree
 * and shows a friendly fallback instead of a blank white screen.
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', {
            message: error.message,
            stack: error.stack,
            componentStack: info.componentStack,
            timestamp: new Date().toISOString(),
        })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: 300, padding: 40, gap: 16,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 16, textAlign: 'center',
                }}>
                    <div style={{ fontSize: 40 }}>⚠️</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Something went wrong
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400 }}>
                        This section encountered an unexpected error. Please refresh the page or contact support.
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            padding: '8px 20px', borderRadius: 10, border: 'none',
                            background: 'var(--accent-primary)', color: 'white',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'left', maxWidth: '100%', overflowX: 'auto' }}>
                            <summary style={{ cursor: 'pointer', marginBottom: 6 }}>Error details (dev only)</summary>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
                        </details>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}
