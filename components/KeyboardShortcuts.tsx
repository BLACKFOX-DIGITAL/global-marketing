'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Keyboard, X } from 'lucide-react'

const SHORTCUTS = [
    { keys: ['⌘', 'K'], description: 'Command Palette', action: 'palette' },
    { keys: ['N'], description: 'New Lead', action: 'newLead' },
    { keys: ['T'], description: 'New Task', action: 'newTask' },
    { keys: ['G', 'D'], description: 'Go to Dashboard', action: 'goDashboard' },
    { keys: ['G', 'L'], description: 'Go to Leads', action: 'goLeads' },
    { keys: ['G', 'P'], description: 'Go to Pool', action: 'goPool' },
    { keys: ['G', 'T'], description: 'Go to Tasks', action: 'goTasks' },
    { keys: ['G', 'B'], description: 'Go to Leaderboard', action: 'goLeaderboard' },
    { keys: ['?'], description: 'Show Shortcuts Help', action: 'help' },
    { keys: ['Esc'], description: 'Close Modal/Popup', action: 'escape' },
]

export function useKeyboardShortcuts() {
    const router = useRouter()
    const [showHelp, setShowHelp] = useState(false)
    const [pendingKey, setPendingKey] = useState<string | null>(null)

    const handleShortcut = useCallback((action: string) => {
        switch (action) {
            case 'palette':
                // Trigger the existing command palette — dispatch a custom event
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
                break
            case 'newLead':
                document.dispatchEvent(new CustomEvent('shortcut:newLead'))
                break
            case 'newTask':
                document.dispatchEvent(new CustomEvent('shortcut:newTask'))
                break
            case 'goDashboard':
                router.push('/dashboard')
                break
            case 'goLeads':
                router.push('/leads')
                break
            case 'goPool':
                router.push('/pool')
                break
            case 'goTasks':
                router.push('/tasks')
                break
            case 'goLeaderboard':
                router.push('/leaderboard')
                break
            case 'help':
                setShowHelp(prev => !prev)
                break
        }
    }, [router])

    useEffect(() => {
        let pendingTimeout: ReturnType<typeof setTimeout> | null = null

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
                return
            }

            // Handle Escape
            if (e.key === 'Escape') {
                if (showHelp) {
                    setShowHelp(false)
                    e.preventDefault()
                }
                return
            }

            // Handle ? for help
            if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                handleShortcut('help')
                return
            }

            // Handle single-key shortcuts
            const key = e.key.toUpperCase()

            // Handle "G + X" combo shortcuts
            if (pendingKey === 'G') {
                if (pendingTimeout) clearTimeout(pendingTimeout)
                setPendingKey(null)
                e.preventDefault()

                switch (key) {
                    case 'D': handleShortcut('goDashboard'); break
                    case 'L': handleShortcut('goLeads'); break
                    case 'P': handleShortcut('goPool'); break
                    case 'T': handleShortcut('goTasks'); break
                    case 'B': handleShortcut('goLeaderboard'); break
                }
                return
            }

            if (key === 'G' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                setPendingKey('G')
                pendingTimeout = setTimeout(() => setPendingKey(null), 800)
                return
            }

            // Single key shortcuts
            if (key === 'N' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                handleShortcut('newLead')
                return
            }
            if (key === 'T' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault()
                handleShortcut('newTask')
                return
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            if (pendingTimeout) clearTimeout(pendingTimeout)
        }
    }, [pendingKey, showHelp, handleShortcut])

    return { showHelp, setShowHelp }
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null

    return (
        <div 
            style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(30px)',
                zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'fadeIn 0.15s ease'
            }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                width: 440, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 24, padding: 24, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.5)',
                animation: 'slideDown 0.2s ease'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                            width: 32, height: 32, borderRadius: 8, 
                            background: 'rgba(99,102,241,0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--accent-primary)'
                        }}>
                            <Keyboard size={16} />
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Keyboard Shortcuts</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ 
                            background: 'transparent', border: 'none', color: 'var(--text-muted)',
                            cursor: 'pointer', padding: 4 
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {SHORTCUTS.filter(s => s.action !== 'escape').map(shortcut => (
                        <div key={shortcut.action} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {shortcut.description}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {shortcut.keys.map((key, i) => (
                                    <span key={i}>
                                        <kbd style={{
                                            display: 'inline-block', padding: '3px 8px',
                                            borderRadius: 6, border: '1px solid var(--border)',
                                            background: 'rgba(255,255,255,0.05)',
                                            fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                                            color: 'var(--text-primary)', minWidth: 24, textAlign: 'center'
                                        }}>
                                            {key}
                                        </kbd>
                                        {i < shortcut.keys.length - 1 && (
                                            <span style={{ margin: '0 2px', fontSize: 10, color: 'var(--text-muted)' }}>+</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ 
                    marginTop: 16, padding: '10px 12px', 
                    background: 'rgba(99,102,241,0.06)', borderRadius: 8,
                    fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5
                }}>
                    💡 Shortcuts are disabled when typing in input fields. Press <kbd style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid var(--border)', fontSize: 10 }}>?</kbd> anytime to toggle this overlay.
                </div>
            </div>
        </div>
    )
}
