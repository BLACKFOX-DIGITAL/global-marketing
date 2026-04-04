import { prisma } from './prisma'
import { 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    isWeekend, 
    format, 
    isSameDay,
    startOfDay,
    endOfDay
} from 'date-fns'

export interface SalaryReport {
    userId: string
    userName: string
    baseSalary: number
    workingDaysInMonth: number
    attendedDays: number
    approvedLeaveDays: number
    absentDays: number
    makeupMinutes: number
    coveredAbsentDays: number
    totalMinutesWorked: number
    hourlyRate: number
    finalSalary: number
    projectedSalary: number
}

export async function calculateMonthlySalary(userId: string, date: Date, prefetchedHolidays?: { date: Date }[]): Promise<SalaryReport> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            attendance: {
                where: {
                    punchIn: {
                        gte: startOfMonth(date),
                        lte: endOfMonth(date)
                    }
                }
            },
            leaveRequests: {
                where: {
                    status: 'Approved',
                    OR: [
                        // Leave starts within the month
                        {
                            startDate: {
                                gte: startOfMonth(date),
                                lte: endOfMonth(date)
                            }
                        },
                        // Leave ends within the month
                        {
                            endDate: {
                                gte: startOfMonth(date),
                                lte: endOfMonth(date)
                            }
                        },
                        // Leave fully spans the entire month (e.g. March 25 → May 5)
                        {
                            startDate: { lte: startOfMonth(date) },
                            endDate:   { gte: endOfMonth(date) }
                        }
                    ]
                }
            }
        }
    })

    if (!user) throw new Error('User not found')

    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const holidays = prefetchedHolidays ?? await prisma.holiday.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } }
    })

    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    // Define working days (excluding weekends and holidays)
    const workingDays = allDays.filter(day => {
        const isNotWeekend = !isWeekend(day)
        const isNotHoliday = !holidays.some(h => isSameDay(new Date(h.date), day))
        return isNotWeekend && isNotHoliday
    })
    const workingDaysCount = workingDays.length

    // Count weekday holidays (which are paid vacations)
    const weekdayHolidaysCount = holidays.filter(h => !isWeekend(new Date(h.date))).length

    let attendedDaysCount = 0
    let approvedLeaveDaysCount = 0
    let absentDaysCount = 0
    let totalMinutesWorked = 0
    let makeupMinutes = 0

    // Sum up actual minutes worked from attendance records, excluding holidays
    // (holidays are credited a flat 480 min below — actual hours worked that day must not stack on top)
    // Weekend records are tracked separately as makeup minutes
    for (const record of user.attendance) {
        const punchDate = new Date(record.punchIn)
        const isOnHoliday = holidays.some(h => isSameDay(new Date(h.date), punchDate))
        if (isOnHoliday) continue

        if (isWeekend(punchDate)) {
            makeupMinutes += (record.duration || 0)
        } else {
            totalMinutesWorked += (record.duration || 0)
        }
    }

    // Credit 8 hours for each weekday holiday (paid day off)
    totalMinutesWorked += (weekdayHolidaysCount * 480)

    for (const day of workingDays) {
        // Check if user attended on this day
        const hasAttendance = user.attendance.some(record =>
            isSameDay(new Date(record.punchIn), day)
        )

        if (hasAttendance) {
            attendedDaysCount++
            continue
        }

        // Check if user has an approved leave for this day
        const hasApprovedLeave = user.leaveRequests.some(leave => {
            const start = startOfDay(new Date(leave.startDate))
            const end = endOfDay(new Date(leave.endDate))
            return day >= start && day <= end
        })

        if (hasApprovedLeave) {
            approvedLeaveDaysCount++
            // Add 8 hours (480 mins) for every approved leave day on a working day
            totalMinutesWorked += 480
            continue
        }

        // If neither, they are absent
        absentDaysCount++
    }

    // Add makeup minutes to the salary calculation (capped later at target)
    totalMinutesWorked += makeupMinutes

    // How many absent days are fully covered by weekend makeup time
    const coveredAbsentDays = Math.min(absentDaysCount, Math.floor(makeupMinutes / 480))
    // Adjust reported absent days to reflect makeup — salary already accounts for the hours
    absentDaysCount = Math.max(0, absentDaysCount - coveredAbsentDays)

    // Calculation based on Hourly Rate
    // Target Days = Actual working days + Weekday Holidays
    const totalTargetDays = workingDaysCount + weekdayHolidaysCount
    const targetHoursPerMonth = totalTargetDays * 8
    const targetMinutesPerMonth = targetHoursPerMonth * 60

    // Strict Monthly Cap: No Overtime Paid Over the Base Salary Target
    if (totalMinutesWorked > targetMinutesPerMonth) {
        totalMinutesWorked = targetMinutesPerMonth
    }

    const hourlyRate = (user.baseSalary > 0 && targetHoursPerMonth > 0) 
        ? user.baseSalary / targetHoursPerMonth 
        : 0
    
    // So the final salary CANNOT exceed Base Salary
    const finalSalary = (totalMinutesWorked / 60) * hourlyRate

    // Calculate Projected Salary based on current pace if it's the current month
    let projectedSalary = finalSalary
    const now = new Date()
    const isCurrentMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()

    if (isCurrentMonth) {
        const passedWorkingDays = workingDays.filter(d => d <= now).length
        const passedHolidays = holidays.filter(h => !isWeekend(new Date(h.date)) && new Date(h.date) <= now).length
        const passedTargetDays = passedWorkingDays + passedHolidays
        
        if (passedTargetDays > 0) {
            const passedTargetMinutes = passedTargetDays * 480 // 8 hours per day
            const paceMultiplier = totalMinutesWorked / passedTargetMinutes
            let projectedMinutes = paceMultiplier * targetMinutesPerMonth
            
            if (projectedMinutes > targetMinutesPerMonth) {
                projectedMinutes = targetMinutesPerMonth
            }
            projectedSalary = (projectedMinutes / 60) * hourlyRate
        }
    }

    return {
        userId: user.id,
        userName: user.name,
        baseSalary: user.baseSalary,
        workingDaysInMonth: workingDaysCount,
        attendedDays: attendedDaysCount,
        approvedLeaveDays: approvedLeaveDaysCount,
        absentDays: absentDaysCount,
        makeupMinutes,
        coveredAbsentDays,
        totalMinutesWorked,
        hourlyRate: Math.round(hourlyRate * 100) / 100,
        finalSalary: Math.round(finalSalary * 100) / 100,
        projectedSalary: Math.round(projectedSalary * 100) / 100
    }
}
