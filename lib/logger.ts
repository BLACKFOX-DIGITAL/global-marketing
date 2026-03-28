/**
 * Structured logger — writes timestamped JSON logs to stdout.
 * In production, PM2 captures these and writes them to log files automatically.
 *
 * Usage: import { logger } from '@/lib/logger'
 *        logger.error('Something broke', { route: '/api/leads', userId })
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
    timestamp: string
    level: LogLevel
    message: string
    context?: Record<string, unknown>
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(context ? { context } : {}),
    }

    const output = JSON.stringify(entry)

    if (level === 'error') {
        console.error(output)
    } else if (level === 'warn') {
        console.warn(output)
    } else {
        console.log(output)
    }
}

export const logger = {
    info:  (message: string, context?: Record<string, unknown>) => log('info',  message, context),
    warn:  (message: string, context?: Record<string, unknown>) => log('warn',  message, context),
    error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
    debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
}
