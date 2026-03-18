'use client'

import { SWRConfig } from 'swr'

export function SWRProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig value={{
            keepPreviousData: true,
            revalidateOnFocus: false,       // Don't refetch when user switches tabs  
            revalidateOnReconnect: false,    // Don't refetch on reconnect
            dedupingInterval: 10000,         // 10s dedup — prevents duplicate requests within 10s
            focusThrottleInterval: 30000,    // If revalidateOnFocus were on, throttle to 30s
        }}>
            {children}
        </SWRConfig>
    )
}
