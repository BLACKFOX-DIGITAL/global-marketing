'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'midnight' | 'light' | 'cyber' | 'forest'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('midnight')

    useEffect(() => {
        const savedTheme = localStorage.getItem('crm-theme')
        const validThemes: Theme[] = ['light', 'cyber', 'forest']
        
        if (savedTheme === 'midnight') {
            setThemeState('midnight')
            document.documentElement.className = ''
        } else if (validThemes.includes(savedTheme as Theme)) {
            const themeToSet = savedTheme as Theme
            setThemeState(themeToSet)
            document.documentElement.className = `theme-${themeToSet}`
        } else if (savedTheme) {
            // Handle legacy/removed themes
            setThemeState('midnight')
            document.documentElement.className = ''
            localStorage.removeItem('crm-theme')
        }
    }, [])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem('crm-theme', newTheme)
        document.documentElement.className = newTheme === 'midnight' ? '' : `theme-${newTheme}`
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
