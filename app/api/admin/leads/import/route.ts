import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const { leads } = await req.json()

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
        }

        if (leads.length > 500) {
            return NextResponse.json({ error: 'Maximum 500 leads per import' }, { status: 400 })
        }

        // Get valid system options for validation
        const [industries, priorities] = await Promise.all([
            prisma.systemOption.findMany({ where: { category: 'industry' }, select: { value: true } }),
            prisma.systemOption.findMany({ where: { category: 'priority' }, select: { value: true } }),
        ])
        const validIndustries = new Set(industries.map(i => i.value))
        const validPriorities = new Set(priorities.map(p => p.value))

        const results = { created: 0, skipped: 0, errors: [] as string[] }

        for (let i = 0; i < leads.length; i++) {
            const row = leads[i]
            const rowNum = i + 1

            // Validate required field
            if (!row.name || typeof row.name !== 'string' || row.name.trim().length === 0) {
                results.errors.push(`Row ${rowNum}: Missing name`)
                results.skipped++
                continue
            }

            // Check for duplicates by name+company or email
            const dupConditions: any[] = []
            if (row.email) dupConditions.push({ email: row.email.trim().toLowerCase() })
            if (row.name && row.company) dupConditions.push({ name: row.name.trim(), company: row.company.trim() })

            if (dupConditions.length > 0) {
                const existing = await prisma.lead.findFirst({
                    where: { OR: dupConditions, isDeleted: false },
                    select: { id: true, name: true }
                })
                if (existing) {
                    results.errors.push(`Row ${rowNum}: Duplicate of "${existing.name}"`)
                    results.skipped++
                    continue
                }
            }

            try {
                await prisma.lead.create({
                    data: {
                        name: row.name.trim(),
                        company: row.company?.trim() || null,
                        email: row.email?.trim().toLowerCase() || null,
                        phone: row.phone?.trim() || null,
                        website: row.website?.trim() || null,
                        country: row.country?.trim() || null,
                        industry: (row.industry && validIndustries.has(row.industry.trim())) ? row.industry.trim() : null,
                        priority: (row.priority && validPriorities.has(row.priority.trim())) ? row.priority.trim() : 'Medium',
                        status: 'Open Pool',
                        ownerId: null,
                        isClaimedFromPool: false,
                        notes: row.notes?.trim() || null,
                    }
                })
                results.created++
            } catch (err) {
                results.errors.push(`Row ${rowNum}: Failed to create — ${(err as any).message?.slice(0, 100)}`)
                results.skipped++
            }
        }

        if (results.created > 0) {
            const reps = await prisma.user.findMany({ where: { role: 'Sales Rep' }, select: { id: true } })
            const ops = reps.map(rep => ({
                userId: rep.id,
                type: 'SUCCESS',
                title: 'New Leads in Pool',
                message: `🚨 ${results.created} new leads were just added to the Global Pool! Jump in and claim them.`,
                link: '/pool'
            }))
            ops.push({
                userId: user.userId,
                type: 'SUCCESS',
                title: 'Bulk Import Finished',
                message: `✅ Processed CSV. ${results.created} created. ${results.skipped} duplicates/errors skipped.`,
                link: '/admin/leads'
            })
            await prisma.notification.createMany({ data: ops })
        }

        return NextResponse.json(results)
    } catch (error) {
        console.error('CSV import failed:', error)
        return NextResponse.json({ error: 'Import failed' }, { status: 500 })
    }
}
