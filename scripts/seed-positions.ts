import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const POSITIONS = [
    "Retoucher", "Senior Retoucher", "Image Editor", "Photo Editor",
    "E-commerce Retoucher", "High-End Retoucher", "Colorist",
    "Art Director", "Creative Director", "Studio Manager",
    "Production Manager", "Photography Assistant",
    "Quality Control Specialist", "Visual Merchandiser",
    "CEO", "Founder", "Co-Founder", "Owner", "President",
    "Managing Director", "Operations Manager", "General Manager",
    "Project Manager", "Account Manager", "Marketing Manager"
]

async function main() {
    console.log('--- Starting Seeding Positions ---')
    
    // Get existing to avoid duplicates
    const existing = await prisma.systemOption.findMany({
        where: { category: 'LEAD_POSITION' }
    })
    const existingValues = existing.map(o => o.value.toLowerCase())

    for (let i = 0; i < POSITIONS.length; i++) {
        const val = POSITIONS[i]
        if (!existingValues.includes(val.toLowerCase())) {
            console.log(`Adding: ${val}`)
            await prisma.systemOption.create({
                data: {
                    category: 'LEAD_POSITION',
                    value: val,
                    order: i,
                    color: '#6366f1' // Indigo default
                }
            })
        } else {
            console.log(`Skipping existing: ${val}`)
        }
    }
    
    console.log('--- Seeding Done ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
