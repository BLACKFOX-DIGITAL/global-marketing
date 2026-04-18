'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Moon, Sun, Cloud, Zap, Trees, ChevronDown } from 'lucide-react'
import { useTheme } from './ThemeProvider'

const themes = [
    { id: 'midnight', name: 'Midnight Dark', icon: Moon },
    { id: 'light', name: 'SaaS Light', icon: Sun },
    { id: 'cyber', name: 'Cyberpunk Neon', icon: Zap },
    { id: 'forest', name: 'Soft Nature', icon: Trees },
] as const

interface ThemeSwitcherProps {
    variant?: 'header' | 'sidebar'
    collapsed?: boolean
}

export default function ThemeSwitcher({ variant = 'header', collapsed = false }: ThemeSwitcherProps) {
    const { theme, setTheme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const currentTheme = themes.find(t => t.id === theme) || themes[0]

    return (
        <div style={{ position: 'relative', width: (variant === 'sidebar' && !collapsed) ? '100%' : 'auto' }} ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={variant === 'sidebar' ? (collapsed ? 'nav-item' : 'nav-item') : 'btn-secondary'}
                style={{ 
                    padding: collapsed ? '0' : (variant === 'sidebar' ? '10px 12px' : '6px 10px'), 
                    fontSize: '13px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? '0' : '10px',
                    height: variant === 'sidebar' ? '40px' : '32px',
                    width: (variant === 'sidebar' && !collapsed) ? '100%' : (collapsed ? '40px' : 'auto'),
                    minWidth: (variant === 'sidebar' && !collapsed) ? '100%' : (collapsed ? '40px' : '40px'),
                    border: variant === 'sidebar' ? 'none' : '1px solid var(--border)',
                    background: variant === 'sidebar' ? (isOpen ? 'var(--bg-card-hover)' : 'transparent') : 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    color: 'inherit',
                    margin: collapsed ? '0 auto' : '0'
                }}
                title={`Switch Theme: ${currentTheme.name}`}
            >
                <currentTheme.icon size={variant === 'sidebar' ? 17 : 16} />
                {!collapsed && <span>{currentTheme.name}</span>}
                {!collapsed && <ChevronDown size={14} style={{ opacity: 0.5, marginLeft: 'auto' }} />}
            </button>

            {isOpen && (
                <div 
                    className="card glass" 
                    style={{ 
                        position: 'absolute', 
                        bottom: variant === 'sidebar' ? '100%' : 'auto',
                        top: variant === 'sidebar' ? 'auto' : '100%', 
                        left: variant === 'sidebar' && collapsed ? '0' : 0, 
                        right: variant === 'sidebar' && !collapsed ? 0 : 'auto',
                        width: (variant === 'sidebar' && !collapsed) ? '100%' : '200px', 
                        marginBottom: variant === 'sidebar' ? '8px' : 0,
                        marginTop: variant === 'sidebar' ? 0 : '8px', 
                        zIndex: 1000, 
                        padding: '8px',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 32px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(30,41,59,0.8)',
                        backdropFilter: 'blur(30px)',
                        borderRadius: 16
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {themes.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setTheme(t.id)
                                    setIsOpen(false)
                                }}
                                className={`nav-item ${theme === t.id ? 'active' : ''}`}
                                style={{ 
                                    border: 'none', 
                                    background: theme === t.id ? 'var(--accent-glow)' : 'transparent',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%'
                                }}
                            >
                                <t.icon size={16} style={{ color: theme === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
                                <span style={{ fontWeight: theme === t.id ? '600' : '400' }}>{t.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
