/**
 * Migration: Fix attendance timestamps that were stored as local time (UTC+7)
 * instead of UTC, causing a 7-hour forward offset in display.
 *
 * Root cause: SQLite @default(now()) used local time, but Prisma reads it as UTC,
 * resulting in all timestamps being 7 hours ahead of their actual value.
 *
 * This script shifts all punchIn/punchOut values back by 7 hours.
 *
 * Run with:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-attendance-timezone.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const OFFSET_HOURS = 7  // UTC+7 — adjust if your server timezone differs

async function main() {
    console.log(`--- Fixing attendance timestamps (shifting back ${OFFSET_HOURS}h) ---`)

    const records = await prisma.attendanceRecord.findMany({
        select: { id: true, punchIn: true, punchOut: true },
    })

    console.log(`Found ${records.length} attendance records.`)

    let updated = 0

    for (const rec of records) {
        const correctedPunchIn = new Date(rec.punchIn.getTime() - OFFSET_HOURS * 60 * 60 * 1000)
        const correctedPunchOut = rec.punchOut
            ? new Date(rec.punchOut.getTime() - OFFSET_HOURS * 60 * 60 * 1000)
            : null

        await prisma.attendanceRecord.update({
            where: { id: rec.id },
            data: {
                punchIn: correctedPunchIn,
                ...(correctedPunchOut !== null ? { punchOut: correctedPunchOut } : {}),
            },
        })

        console.log(`  [fixed] ${rec.id}: ${rec.punchIn.toISOString()} → ${correctedPunchIn.toISOString()}`)
        updated++
    }

    console.log(`\n--- Done ---`)
    console.log(`Fixed: ${updated} records`)
}

main()
    .catch(err => { console.error('Migration failed:', err); process.exit(1) })
    .finally(() => prisma.$disconnect())
