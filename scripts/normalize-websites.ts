/**
 * Migration: Normalize website values in the Lead table.
 *
 * Strips protocol (http/https), www., and trailing slashes, then lowercases.
 * Example: "https://www.Acme.com/" → "acme.com"
 *
 * Run with:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/normalize-websites.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeWebsite(url: string): string {
    return url
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .trim()
}

async function main() {
    console.log('--- Starting website normalization ---')

    // Fetch all non-deleted leads that have a website
    const leads = await prisma.lead.findMany({
        where: { website: { not: null } },
        select: { id: true, website: true },
    })

    console.log(`Found ${leads.length} leads with a website value.`)

    let updated = 0
    let skipped = 0

    for (const lead of leads) {
        if (!lead.website) { skipped++; continue }

        const normalized = normalizeWebsite(lead.website)

        if (normalized === lead.website) {
            skipped++
            continue
        }

        await prisma.lead.update({
            where: { id: lead.id },
            data: { website: normalized },
        })

        console.log(`  [updated] ${lead.id}: "${lead.website}" → "${normalized}"`)
        updated++
    }

    console.log(`\n--- Done ---`)
    console.log(`Updated : ${updated}`)
    console.log(`Skipped : ${skipped} (already normalized or no website)`)
}

main()
    .catch(err => { console.error('Migration failed:', err); process.exit(1) })
    .finally(() => prisma.$disconnect())
