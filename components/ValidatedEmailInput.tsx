'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'

type ValidationState = 'idle' | 'loading' | 'valid' | 'unknown' | 'invalid'
type CachedResult = { state: ValidationState, reason: string }

// Module-level cache — persists across re-renders and re-mounts
const validationCache = new Map<string, CachedResult>()

interface ValidatedEmailInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    style?: React.CSSProperties
    isDuplicate?: boolean
}

export default function ValidatedEmailInput({ value, onChange, placeholder = 'email@example.com', style, isDuplicate }: ValidatedEmailInputProps) {
    const [state, setState] = useState<ValidationState>('idle')
    const [reason, setReason] = useState('')
    const abortRef = useRef<AbortController | null>(null)

    // Restore from cache on mount or when value changes from outside
    useEffect(() => {
        const trimmed = value.trim().toLowerCase()
        if (trimmed && validationCache.has(trimmed)) {
            const cached = validationCache.get(trimmed)!
            // Using requestAnimationFrame to avoid React devtools warning for synchronous state update in effect
            requestAnimationFrame(() => {
                setState(cached.state)
                setReason(cached.reason)
            })
        } else if (!trimmed) {
            requestAnimationFrame(() => {
                setState('idle')
                setReason('')
            })
        }
    }, [value])

    const validateEmail = useCallback(async (email: string) => {
        const trimmed = email.trim().toLowerCase()
        if (!trimmed) return

        // Check cache first
        if (validationCache.has(trimmed)) {
            const cached = validationCache.get(trimmed)!
            setState(cached.state)
            setReason(cached.reason)
            return
        }

        // Basic format check (instant)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            const result: CachedResult = { state: 'invalid', reason: 'Invalid format' }
            validationCache.set(trimmed, result)
            setState('invalid')
            setReason('Invalid format')
            return
        }

        // Cancel previous request
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setState('loading')
        try {
            const res = await fetch('/api/leads/validate-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmed }),
                signal: controller.signal,
            })
            const data = await res.json()

            let newState: ValidationState
            let newReason = ''

            if (data.valid && data.unknown) {
                newState = 'unknown'
            } else if (data.valid) {
                newState = 'valid'
            } else {
                newState = 'invalid'
                newReason = data.reason || 'Invalid email'
            }

            // Cache the result
            validationCache.set(trimmed, { state: newState, reason: newReason })
            setState(newState)
            setReason(newReason)
        } catch (err) {
            if ((err as Error)?.name !== 'AbortError') {
                setState('idle')
            }
        }
    }, [])

    const handleBlur = useCallback(() => {
        const trimmed = value.trim()
        if (trimmed) {
            validateEmail(trimmed)
        } else {
            setState('idle')
            setReason('')
        }
    }, [value, validateEmail])

    const handleChange = useCallback((newVal: string) => {
        onChange(newVal)
    }, [onChange])

    const borderColor = isDuplicate ? 'rgba(239, 68, 68, 0.8)' :
        state === 'invalid' ? 'rgba(239, 68, 68, 0.4)' :
            state === 'valid' ? 'rgba(34, 197, 94, 0.3)' :
                state === 'unknown' ? 'rgba(234, 179, 8, 0.3)' : undefined

    const iconBg = state === 'valid' ? 'rgba(34,197,94,0.15)' :
        state === 'unknown' ? 'rgba(234,179,8,0.15)' :
            state === 'invalid' ? 'rgba(239,68,68,0.15)' : undefined

    const titleText = state === 'valid' ? 'Email verified ✓' :
        state === 'unknown' ? 'Domain verified' :
            state === 'invalid' ? reason : 'Validating...'

    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <input
                type="email"
                placeholder={placeholder}
                value={value}
                onChange={e => handleChange(e.target.value.toLowerCase())}
                onBlur={handleBlur}
                style={{
                    ...style,
                    width: '100%',
                    paddingRight: state !== 'idle' ? 32 : undefined,
                    borderColor,
                    transition: 'border-color 0.2s ease',
                }}
            />

            {/* Status icon inside input */}
            {state !== 'idle' && (
                <div
                    style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: '50%',
                        cursor: (state === 'invalid' || state === 'unknown') ? 'help' : 'default',
                        background: iconBg,
                    }}
                    title={titleText}
                >
                    {state === 'loading' && (
                        <Loader2 size={12} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                    )}
                    {state === 'valid' && (
                        <Check size={12} color="#22c55e" strokeWidth={3} />
                    )}
                    {state === 'unknown' && (
                        <Check size={12} color="#eab308" strokeWidth={3} />
                    )}
                    {state === 'invalid' && (
                        <AlertCircle size={12} color="#ef4444" />
                    )}
                </div>
            )}

            {/* Invalid reason tooltip */}

        </div>
    )
}
