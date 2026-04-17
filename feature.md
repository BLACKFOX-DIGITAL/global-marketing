# System Features Overview

This document outlines the features and functionalities available to **Sales Representatives** and **Administrators** within the Global Marketing CRM.

---

## 🌐 Shared Features (All Roles)

These features are available to every authenticated user regardless of role.

- **Global Command Palette (Cmd+K):** Instantly search across leads, opportunities, and tasks from anywhere in the app via a keyboard shortcut. Results appear in a floating overlay grouped by category with keyboard navigation.
- **Notification Center:** Real-time notification bell in the header with unread count badge. Supports mark-as-read, mark-all-as-read, and clear history. Each notification deep-links to the relevant lead or task. Notification types include Success, Warning, System Warning, and Urgent.
- **Multi-Theme Support:** Switch between 4 visual themes from the sidebar: Midnight Dark, SaaS Light, Cyberpunk Neon, and Soft Nature.
- **Email Validation:** Live email validation when entering lead emails — checks format instantly, then verifies the domain server-side. Shows inline status icons (✓ valid, ⚠ unknown domain, ✗ invalid) with caching to prevent redundant API calls.

---

## 💼 Sales Representative Features

Sales Reps have access to an operational interface focused on lead progression, sales performance, gamification, and daily HR routines.

### 1. Operations & Sales Management
- **Personal Dashboard:** Gain a snapshot of personal performance metrics, current streaks, XP/level progress, and active goals.
- **Lead Management:** 
  - View and manage assigned leads.
  - Update lead statuses, track communication outcomes (`CallAttempts` and `MailAttempts`).
  - Add internal notes and manage contact information.
- **Lead Pool Exploration:** Reclaim unassigned or stale leads from the common Lead Pool to generate new opportunities.
- **Opportunity Pipeline:** 
  - Convert promising leads into opportunities.
  - Manage deal probabilities, update sales stages (e.g., "Test Job Received"), set close dates, and maintain stage histories.
- **Customer Directory:** Track and manage successfully converted and active customers.
- **Task Management:** Create, manage, and complete follow-up tasks with priorities and specific due dates. Includes a **full calendar view** displaying tasks plotted on their due dates, color-coded by priority, with month navigation and a "Today" button.

### 2. Gamification & Engagement
- **Competitive Leaderboard:** View rankings against other team members based on Deals Won, Tasks Completed, and total XP earned.
- **Achievements & Streaks:** Earn Experience Points (XP) for meaningful actions (calls, mails, tasks, conversions, pool claims), unlock achievements across 7 categories, maintain daily activity streaks with multipliers (1.1x → 2x), and progress through levels (Sales Scout → Rainmaker). Anti-spam cooldowns prevent XP farming.
- **Visual Celebrations:** Confetti animations fire on key moments — big burst on deal won, center burst on level-up, golden shower on achievement unlock, and small pop on task completion.
- **Personal Goals:** Track individual progress against assigned quotas for periods (e.g., monthly).

### 3. Human Resources (HR)
- **Attendance Tracking:** Punch in and punch out on a daily basis. Provide optional notes for late arrivals or specific work logs.
- **My Log:** Review historical personal attendance records and hours worked.
- **Leave Requests:** Submit requests for time off by specifying dates and reasons, and track approval status.

---

## 🛡️ Administrator Features

Administrators have elevated privileges with a zoomed-out perspective, focusing on global oversight, team performance tracking, financial management, and system administration.

### 1. Executive Overview & Analytics
- **Admin Dashboard:** Access high-level KPIs including Deals Closed, Total Pipeline volume, New Leads, and active workforce metrics. Includes trend analysis charts (14-day pipeline vs closed deals trends).
- **Proactive Alerts:** Receive system alerts for unassigned pool leads, highly overdue tasks, stale leads (idle >30 days), and pending leave requests from the team.
- **Advanced Analytics & Reports:** Drill down into sales conversions, revenue forecasts, and funnel stages across the entire workforce. Filter by rep, time period (Today/Week/Month/Quarter/Year), and search within rep breakdowns.

### 2. Team & Workforce Management
- **Targets & Quotas:** Define and assign company-wide or individual monthly goals (such as Deals Closed or Leads Generated). Monitor real-time progression toward these targets.
- **Global Lead Directory:** Search, overview, edit, or recover soft-deleted leads across all pools.
- **Lead Reassignment:** Transfer lead ownership across different reps (e.g., if a rep goes on leave or is handling too many clients).
- **Deletion Review:** Dedicated page to review all soft-deleted leads and opportunities. Restore records back to active status or permanently purge them with confirmation.
- **Global Activity Audit Log:** Access an unfiltered, chronological timeline of all activities taking place across the CRM (updates, deletions, stage changes) for transparency and governance.

### 3. HR & Payroll Administration
- **Workforce Attendance:** Monitor the full team's attendance status, punch times, and total active durations.
- **Leave Management:** Review, approve, or decline leave requests submitted by employees.
- **Company Holidays:** Create and manage company holidays. Weekday holidays automatically grant 8-hour paid credits in payroll calculations.
- **Payroll System:** Salary calculations based on hourly rates derived from base salary, accounting for attendance hours, approved leave days (8hr credit each), company holidays (8hr credit each), and weekend makeup hours. Includes salary caps and projected salary views.

### 4. System Settings & Governance
- **Configurable Taxonomy System:** Customize lead statuses, industries, positions, opportunity stages, task priorities, and leave types — all managed from a single settings panel with color coding and ordering.
- **User Governance:** Create accounts, manage roles (Administrator / Sales Rep), set base salaries, reset passwords, or suspend accounts. Suspending a user automatically returns their active leads to the pool.
- **Lead Reassignment Rules:** Configure auto-reclaim timers per priority level (High/Medium/Low warning and reclaim days), lost lead cooldown period, and maximum active leads per rep.
- **Gamification Configuration:** Tune XP point values for every action type (calls, mails, tasks, conversions, deal wins, pool claims) from the settings panel.
- **Database Backup & Restore:** Export the entire database as a portable JSON file. Restore from a backup file (danger zone — wipes current data with confirmation).
- **Manual Maintenance Runner:** On-demand trigger for the lead reclaim/recirculation job, showing live results (warnings issued, leads reclaimed, leads recirculated).

### 5. Automated Background Jobs
- **Lead Maintenance (Daily Cron):** Automated priority-based lead lifecycle — issues stale warnings, final warnings, then auto-reclaims inactive leads back to the pool. Recirculates "Lost" leads after a configurable cooldown period.
- **Attendance Auto-Punchout (Daily Cron):** Automatically closes forgotten attendance sessions at midnight to prevent data corruption.
