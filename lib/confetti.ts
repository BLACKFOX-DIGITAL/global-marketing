import confetti from 'canvas-confetti'

// 🎉 Big celebration — Lead Conversion, Deal Won
export function celebrateBig() {
    const duration = 2000
    const end = Date.now() + duration

    const frame = () => {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981'],
        })
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981'],
        })

        if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
}

// 🚀 Level up celebration — bursts from center
export function celebrateLevelUp() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'],
        startVelocity: 30,
        gravity: 0.8,
    })

    // Second burst after short delay
    setTimeout(() => {
        confetti({
            particleCount: 60,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#10b981', '#06b6d4', '#f59e0b'],
            startVelocity: 25,
        })
    }, 300)
}

// ✅ Small pop — Task completed
export function celebrateSmall() {
    confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#6366f1'],
        startVelocity: 20,
        gravity: 1.2,
        ticks: 100,
    })
}

// 🏅 Achievement unlocked — golden shower
export function celebrateAchievement() {
    confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'],
        startVelocity: 25,
        gravity: 0.6,
    })
}

// Utility: fire confetti based on gamification result
export function handleGamificationResult(result: {
    leveledUp?: boolean
    newAchievements?: string[]
    xpAwarded?: number
}, actionType: 'task' | 'call' | 'mail' | 'convert' | 'won' | 'claim' = 'task') {
    if (!result) return

    // Big actions get big celebrations
    if (actionType === 'won') {
        celebrateBig()
        return
    }

    if (actionType === 'convert') {
        celebrateBig()
        return
    }

    // Level up always gets a celebration
    if (result.leveledUp) {
        celebrateLevelUp()
        return
    }

    // New achievements get golden confetti
    if (result.newAchievements && result.newAchievements.length > 0) {
        celebrateAchievement()
        return
    }

    // Task completion gets a small pop
    if (actionType === 'task') {
        celebrateSmall()
    }
}
