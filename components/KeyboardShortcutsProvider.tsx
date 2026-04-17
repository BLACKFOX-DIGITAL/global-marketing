'use client'
import { useKeyboardShortcuts } from './KeyboardShortcuts'
import KeyboardShortcutsHelp from './KeyboardShortcuts'

export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
    const { showHelp, setShowHelp } = useKeyboardShortcuts()

    return (
        <>
            {children}
            <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </>
    )
}
