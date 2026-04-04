import { prisma } from '@/lib/prisma'

export async function getXPValues() {
    const settings = await prisma.systemSetting.findMany({
        where: { key: { startsWith: 'XP_' } }
    })
    const map = settings.reduce((acc, s) => ({ ...acc, [s.key]: Number(s.value) }), {} as Record<string, number>)
    
    return {
        CALL_ATTEMPT: map['XP_CALL_ATTEMPT'] ?? 15,
        MAIL_ATTEMPT: map['XP_MAIL_ATTEMPT'] ?? 10,
        TASK_COMPLETED: map['XP_TASK_COMPLETED'] ?? 10,
        LEAD_CONVERTED: map['XP_LEAD_CONVERTED'] ?? 50,
        OPPORTUNITY_WON: map['XP_OPPORTUNITY_WON'] ?? 100,
        POOL_CLAIM: map['XP_POOL_CLAIM'] ?? 5,
        LEAD_CREATED: map['XP_LEAD_CREATED'] ?? 5,
        TASK_CREATED: map['XP_TASK_CREATED'] ?? 3,
        // Hardcoded fallbacks for secondary actions
        TASK_ON_TIME_BONUS: 5,
        LEAD_UPDATED: 3,
        OPPORTUNITY_UPDATED: 5,
    }
}

// --- Streak Multiplier ---
// Streaks boost XP earnings to reward consistency
export function getStreakMultiplier(streak: number): number {
    if (streak >= 30) return 2.0   // 🔥🔥🔥 Legendary: 2x XP
    if (streak >= 14) return 1.5   // 🔥🔥 On Fire: 1.5x XP
    if (streak >= 7) return 1.25   // 🔥 Hot: 1.25x XP
    if (streak >= 3) return 1.1    // Warming Up: 1.1x XP
    return 1.0                      // No bonus
}

// --- Level Thresholds ---
// Level N requires (N-1) * 100 XP total
// Level 1: 0 XP, Level 2: 100 XP, Level 3: 200 XP, etc.
export function calculateLevel(totalXp: number): number {
    return Math.floor(totalXp / 100) + 1
}

export function xpForNextLevel(currentLevel: number): number {
    return currentLevel * 100
}

export function xpProgressInLevel(totalXp: number): number {
    return totalXp % 100
}

// --- Titles by Level ---
export function getTitleForLevel(level: number): string {
    if (level >= 50) return '👑 Rainmaker'
    if (level >= 40) return '🌟 Sales Legend'
    if (level >= 30) return '💎 Deal Maker'
    if (level >= 20) return '🚀 Pipeline Pro'
    if (level >= 10) return '🎯 Closer in Training'
    if (level >= 5) return '⭐ Rising Star'
    return '🏃 Sales Scout'
}

// --- Core: Award XP ---
export interface AwardResult {
    xpAwarded: number
    xpBeforeMultiplier: number
    streakMultiplier: number
    newTotalXp: number
    newLevel: number
    previousLevel: number
    leveledUp: boolean
    streakUpdated: boolean
    currentStreak: number
    title: string
    newAchievements: string[]
}

export async function awardXP(userId: string, xpActionKey: keyof Awaited<ReturnType<typeof getXPValues>>, actionType: string = 'GENERIC', entityId?: string): Promise<AwardResult> {
    // --- Anti-Spam Cooldown Check ---
    if (actionType !== 'GENERIC') {
        // OPPORTUNITY_WON is permanent per opportunity — can only earn XP once per deal
        if (actionType === 'OPPORTUNITY_WON') {
            const existing = await prisma.xPHistory.findFirst({ where: { userId, actionType, entityId } })
            if (existing) {
                console.log(`[Gamification] Blocked: User ${userId} already earned XP for ${actionType} on ${entityId}`)
                return generateZeroXpResult(userId)
            }
        } else {
            const cooldownMinutes = actionType.includes('UPDATED') ? 60 : 1 // 1 hour for updates, 1 min for all other actions
            const cutoffTime = new Date(Date.now() - cooldownMinutes * 60 * 1000)

            const recentAction = await prisma.xPHistory.findFirst({
                where: {
                    userId,
                    actionType,
                    entityId,
                    createdAt: { gte: cutoffTime }
                }
            })

            if (recentAction) {
                console.log(`[Gamification] Blocked by cooldown. User ${userId} spamming ${actionType} on ${entityId}`)
                return generateZeroXpResult(userId) // Skip awarding XP but don't crash
            }
        }
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            xp: true,
            level: true,
            currentStreak: true,
            longestStreak: true,
            lastActiveDay: true,
        }
    })

    if (!user) throw new Error('User not found')

    const xpValues = await getXPValues()
    const baseXpAmount = xpValues[xpActionKey] || 0

    // --- Streak Logic ---
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastActive = user.lastActiveDay ? new Date(user.lastActiveDay) : null
    if (lastActive) lastActive.setHours(0, 0, 0, 0)

    let { currentStreak, longestStreak } = user
    let streakUpdated = false

    if (!lastActive || lastActive.getTime() !== today.getTime()) {
        // First activity of the day
        if (lastActive) {
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            if (lastActive.getTime() === yesterday.getTime()) {
                // Consecutive day — increment streak
                currentStreak += 1
                streakUpdated = true
            } else {
                // Missed a day — reset streak
                currentStreak = 1
                streakUpdated = true
            }
        } else {
            // First ever activity
            currentStreak = 1
            streakUpdated = true
        }

        if (currentStreak > longestStreak) {
            longestStreak = currentStreak
        }
    }

    // Apply streak multiplier to XP
    const multiplier = getStreakMultiplier(currentStreak)
    const xpAmount = Math.round(baseXpAmount * multiplier)

    const previousLevel = user.level
    const newTotalXp = user.xp + xpAmount
    const newLevel = calculateLevel(newTotalXp)
    const leveledUp = newLevel > previousLevel

    // Update user and record history
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                xp: newTotalXp,
                level: newLevel,
                currentStreak,
                longestStreak,
                lastActiveDay: today,
            }
        }),
        prisma.xPHistory.create({
            data: {
                userId,
                actionType,
                entityId,
                xpAwarded: xpAmount,
            }
        })
    ])

    // --- Check Achievements ---
    const newAchievements = await checkAndUnlockAchievements(userId)

    return {
        xpAwarded: xpAmount,
        xpBeforeMultiplier: baseXpAmount,
        streakMultiplier: multiplier,
        newTotalXp,
        newLevel,
        previousLevel,
        leveledUp,
        streakUpdated,
        currentStreak,
        title: getTitleForLevel(newLevel),
        newAchievements,
    }
}

// --- Achievement Checking ---
async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
    const unlocked: string[] = []

    // Get all achievements and user's existing unlocks
    const [achievements, existingUnlocks, userStats] = await Promise.all([
        prisma.achievement.findMany(),
        prisma.userAchievement.findMany({
            where: { userId },
            select: { achievementId: true }
        }),
        getUserActivityCounts(userId),
    ])

    const unlockedIds = new Set(existingUnlocks.map(u => u.achievementId))

    const toUnlock = achievements.filter(a => {
        if (unlockedIds.has(a.id)) return false
        return (userStats[a.category] || 0) >= a.threshold
    })

    for (const a of toUnlock) {
        try {
            await prisma.userAchievement.create({ data: { userId, achievementId: a.id } })
            unlocked.push(a.name)
        } catch {
            // Duplicate — already unlocked, skip
        }
    }

    return unlocked
}

async function generateZeroXpResult(userId: string): Promise<AwardResult> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true, currentStreak: true } })
    return {
        xpAwarded: 0,
        xpBeforeMultiplier: 0,
        streakMultiplier: getStreakMultiplier(user?.currentStreak || 0),
        newTotalXp: user?.xp || 0,
        newLevel: user?.level || 1,
        previousLevel: user?.level || 1,
        leveledUp: false,
        streakUpdated: false,
        currentStreak: user?.currentStreak || 0,
        title: getTitleForLevel(user?.level || 1),
        newAchievements: [],
    }
}

async function getUserActivityCounts(userId: string): Promise<Record<string, number>> {
    const [callCount, mailCount, taskCount, conversionCount, wonCount, user] = await Promise.all([
        prisma.callAttempt.count({ where: { createdBy: userId } }),
        prisma.mailAttempt.count({ where: { createdBy: userId } }),
        prisma.task.count({ where: { ownerId: userId, completed: true } }),
        prisma.opportunity.count({ where: { ownerId: userId } }),
        prisma.opportunity.count({ where: { ownerId: userId, stage: 'Closed Won' } }),
        prisma.user.findUnique({ where: { id: userId }, select: { currentStreak: true, xp: true, level: true } }),
    ])

    return {
        calls: callCount,
        mails: mailCount,
        tasks: taskCount,
        conversions: conversionCount,
        wins: wonCount,
        streak: user?.currentStreak || 0,
        xp: user?.xp || 0,
        level: user?.level || 1,
    }
}

// --- Get Full Gamification Profile ---
export async function getGamificationProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            xp: true,
            level: true,
            currentStreak: true,
            longestStreak: true,
            lastActiveDay: true,
            achievements: {
                include: { achievement: true },
                orderBy: { unlockedAt: 'desc' }
            }
        }
    })

    if (!user) throw new Error('User not found')

    const activityCounts = await getUserActivityCounts(userId)

    // Get all achievements to show progress
    const allAchievements = await prisma.achievement.findMany({
        orderBy: [{ category: 'asc' }, { threshold: 'asc' }]
    })

    const unlockedIds = new Set(user.achievements.map(ua => ua.achievementId))

    const achievementProgress = allAchievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        threshold: a.threshold,
        currentProgress: activityCounts[a.category] || 0,
        unlocked: unlockedIds.has(a.id),
        unlockedAt: user.achievements.find(ua => ua.achievementId === a.id)?.unlockedAt || null,
        progressPercent: Math.min(100, Math.round(((activityCounts[a.category] || 0) / a.threshold) * 100)),
    }))

    return {
        xp: user.xp,
        level: user.level,
        title: getTitleForLevel(user.level),
        xpInCurrentLevel: xpProgressInLevel(user.xp),
        xpNeededForNextLevel: 100,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        streakMultiplier: getStreakMultiplier(user.currentStreak),
        achievements: achievementProgress,
        unlockedCount: user.achievements.length,
        totalAchievements: allAchievements.length,
        stats: activityCounts,
    }
}

// --- Seed Default Achievements ---
export async function seedAchievements() {
    const defaults = [
        // Calls
        { name: 'First Ring', description: 'Make your first call attempt', icon: '🔔', category: 'calls', threshold: 1 },
        { name: 'Dialer', description: 'Make 10 call attempts', icon: '📱', category: 'calls', threshold: 10 },
        { name: 'Phone Warrior', description: 'Make 50 call attempts', icon: '🗡️', category: 'calls', threshold: 50 },
        { name: 'Century Club', description: 'Make 100 call attempts', icon: '📞', category: 'calls', threshold: 100 },
        { name: 'Call Center', description: 'Make 500 call attempts', icon: '🏢', category: 'calls', threshold: 500 },

        // Mails
        { name: 'Mail Starter', description: 'Send your first mail', icon: '✉️', category: 'mails', threshold: 1 },
        { name: 'Outreach Pro', description: 'Send 25 mails', icon: '📤', category: 'mails', threshold: 25 },
        { name: 'Inbox Zero', description: 'Send 50 mails', icon: '📬', category: 'mails', threshold: 50 },
        { name: 'Email Machine', description: 'Send 200 mails', icon: '🤖', category: 'mails', threshold: 200 },

        // Tasks
        { name: 'First Task', description: 'Complete your first task', icon: '✏️', category: 'tasks', threshold: 1 },
        { name: 'Getting Things Done', description: 'Complete 10 tasks', icon: '📋', category: 'tasks', threshold: 10 },
        { name: 'Task Master', description: 'Complete 50 tasks', icon: '✅', category: 'tasks', threshold: 50 },
        { name: 'Productivity Machine', description: 'Complete 200 tasks', icon: '⚡', category: 'tasks', threshold: 200 },

        // Conversions
        { name: 'First Blood', description: 'Convert your first Lead into an Opportunity', icon: '⚔️', category: 'conversions', threshold: 1 },
        { name: 'Lead Machine', description: 'Convert 10 Leads', icon: '🏭', category: 'conversions', threshold: 10 },
        { name: 'Conversion King', description: 'Convert 25 Leads', icon: '👑', category: 'conversions', threshold: 25 },

        // Wins
        { name: 'Closer', description: 'Win your first Opportunity', icon: '🏆', category: 'wins', threshold: 1 },
        { name: 'Deal Hunter', description: 'Win 5 Opportunities', icon: '🎯', category: 'wins', threshold: 5 },
        { name: 'Sales Machine', description: 'Win 20 Opportunities', icon: '💰', category: 'wins', threshold: 20 },

        // Streaks
        { name: 'On Fire', description: 'Reach a 3-day activity streak', icon: '🔥', category: 'streak', threshold: 3 },
        { name: 'Unstoppable', description: 'Reach a 7-day activity streak', icon: '🔥', category: 'streak', threshold: 7 },
        { name: 'Iron Will', description: 'Reach a 14-day activity streak', icon: '💪', category: 'streak', threshold: 14 },
        { name: 'Legendary', description: 'Reach a 30-day activity streak', icon: '🌟', category: 'streak', threshold: 30 },

        // Level milestones
        { name: 'Level 5', description: 'Reach Level 5', icon: '⭐', category: 'level', threshold: 5 },
        { name: 'Level 10', description: 'Reach Level 10', icon: '🎯', category: 'level', threshold: 10 },
        { name: 'Level 25', description: 'Reach Level 25', icon: '🚀', category: 'level', threshold: 25 },
        { name: 'Level 50', description: 'Reach Level 50', icon: '👑', category: 'level', threshold: 50 },
    ]

    for (const a of defaults) {
        await prisma.achievement.upsert({
            where: { name: a.name },
            update: {},
            create: a,
        })
    }
}
