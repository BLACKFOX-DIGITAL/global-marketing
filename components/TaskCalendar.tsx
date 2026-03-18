'use client'
import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface Task {
    id: string
    title: string
    dueDate: string | null
    completed: boolean
    priority: string
}

export default function TaskCalendar({
    tasks,
    priorities,
    onDateClick,
    onTaskClick
}: {
    tasks: Task[],
    priorities: Array<{ value: string; color: string | null }>,
    onDateClick?: (date: Date) => void,
    onTaskClick?: (task: Task) => void
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    const getPriorityColor = (value: string) => {
        return priorities.find(p => p.value === value)?.color || '#94a3b8'
    }

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CalendarIcon size={16} color="var(--accent-primary)" />
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{format(currentMonth, 'MMMM yyyy')}</h3>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={prevMonth} className="btn-secondary" style={{ padding: '4px 6px' }}><ChevronLeft size={14} /></button>
                    <button onClick={() => setCurrentMonth(new Date())} className="btn-secondary" style={{ fontSize: 11, padding: '0 10px' }}>Today</button>
                    <button onClick={nextMonth} className="btn-secondary" style={{ padding: '4px 6px' }}><ChevronRight size={14} /></button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--border)', gap: '1px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ padding: '8px 4px', background: 'var(--bg-card)', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {day}
                    </div>
                ))}

                {calendarDays.map((day, i) => {
                    const dayTasks = tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day))
                    const isToday = isSameDay(day, new Date())
                    const isCurrentMonth = isSameMonth(day, monthStart)

                    return (
                        <div
                            key={i}
                            onClick={() => onDateClick?.(day)}
                            style={{
                                minHeight: 90,
                                background: isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)',
                                padding: 6,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 3,
                                opacity: isCurrentMonth ? 1 : 0.4,
                                cursor: 'cell',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => { if (isCurrentMonth) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                            onMouseLeave={e => { if (isCurrentMonth) e.currentTarget.style.background = 'var(--bg-card)' }}
                        >
                            <div style={{
                                display: 'flex', justifyContent: 'center', alignItems: 'center', width: 20, height: 20,
                                borderRadius: '50%', fontSize: 11, fontWeight: 600,
                                background: isToday ? 'var(--accent-primary)' : 'transparent',
                                color: isToday ? 'white' : 'var(--text-secondary)',
                                marginBottom: 2
                            }}>
                                {format(day, 'd')}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, overflowY: 'auto' }}>
                                {dayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTaskClick?.(task);
                                        }}
                                        style={{
                                            fontSize: 9, padding: '3px 6px', borderRadius: 4,
                                            background: `${getPriorityColor(task.priority)}12`,
                                            borderLeft: `2.5px solid ${getPriorityColor(task.priority)}`,
                                            color: 'var(--text-primary)', fontWeight: 500,
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            opacity: task.completed ? 0.6 : 1,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                                    >
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
