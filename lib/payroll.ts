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
    deduction: number
    finalSalary: number
}

export async function calculateMonthlySalary(userId: string, date: Date): Promise<SalaryReport> {
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
                        {
                            startDate: {
                                gte: startOfMonth(date),
                                lte: endOfMonth(date)
                            }
                        },
                        {
                            endDate: {
                                gte: startOfMonth(date),
                                lte: endOfMonth(date)
                            }
                        }
                    ]
                }
            }
        }
    })

    if (!user) throw new Error('User not found')

    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: monthStart,
                lte: monthEnd
            }
        }
    })

    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    // Define working days (excluding weekends and holidays)
    const workingDays = allDays.filter(day => {
        const isNotWeekend = !isWeekend(day)
        const isNotHoliday = !holidays.some(h => isSameDay(new Date(h.date), day))
        return isNotWeekend && isNotHoliday
    })
    const workingDaysCount = workingDays.length

    let attendedDaysCount = 0
    let approvedLeaveDaysCount = 0
    let absentDaysCount = 0

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
            continue
        }

        // If neither, they are absent
        absentDaysCount++
    }

    const dailyRate = user.baseSalary > 0 ? user.baseSalary / workingDaysCount : 0
    const deduction = dailyRate * absentDaysCount
    const finalSalary = Math.max(0, user.baseSalary - deduction)

    return {
        userId: user.id,
        userName: user.name,
        baseSalary: user.baseSalary,
        workingDaysInMonth: workingDaysCount,
        attendedDays: attendedDaysCount,
        approvedLeaveDays: approvedLeaveDaysCount,
        absentDays: absentDaysCount,
        deduction: Math.round(deduction * 100) / 100,
        finalSalary: Math.round(finalSalary * 100) / 100
    }
}
