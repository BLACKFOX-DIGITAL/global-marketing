import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

export const getCachedSystemOptions = unstable_cache(
    async (category: string) => {
        return prisma.systemOption.findMany({
            where: { category },
            orderBy: { order: 'asc' },
            select: { value: true, color: true }
        })
    },
    ['system-options'],
    { revalidate: 3600, tags: ['settings'] }
)
