# CFM Business Logic - Quick Reference Index

## Document Overview
Main Analysis: `CFM_BUSINESS_LOGIC_ANALYSIS.md` (1,621 lines)

---

## Quick Navigation

### Core Features
- **[Sales Pipeline](#sales-pipeline)** - Lead creation to opportunity closure
- **[Gamification](#gamification)** - XP, levels, streaks, achievements
- **[Payroll](#payroll)** - Time tracking and salary calculation
- **[Automation](#automation)** - Lead recirculation, warnings

### Key Business Logic Files
- `lib/gamification.ts` - XP system (390 lines)
- `lib/payroll.ts` - Salary calculation (213 lines)
- `app/api/leads/route.ts` - Lead CRUD (161 lines)
- `app/api/cron/lead-maintenance/route.ts` - Auto-reclaim (183 lines)
- `app/api/admin/reports/sales/route.ts` - Analytics (454 lines)

---

## Sales Pipeline

### Lead Workflow
1. **Create**: POST `/api/leads` → Check dedup (website/email) → Assign to pool or user
2. **Engage**: Call/Email attempts → Status transitions
3. **Convert**: POST `/api/leads/[id]/convert` → Create Opportunity
4. **Close**: Update opp stage to "Closed Won" → Lead → "Active Client"

### Key Statuses
- `New` - Fresh lead
- `Called` - Connected and interested
- `Mail Sent` - Email sent
- `Lost` - Not interested
- `Won` - Old status (deprecated)
- `Converted` - Has opportunity
- `Active Client` - Deal won
- `Open Pool` - Unassigned, available to claim

### Constraints
- **Deduplication**: By website OR email (same lead cannot exist twice)
- **Claim Limit**: Default 50 active claimed leads per rep
- **Fresh Eyes**: Cannot reclaim your own previous lead
- **One Opportunity**: Only one active opp per lead

---

## Gamification

### XP Awards
| Action | XP | Cooldown | Notes |
|--------|----|-----------| -----|
| Call Attempt | 15 | 1 min | Per lead per action |
| Mail Attempt | 10 | 1 min | Per lead per action |
| Task Completed | 10 | - | One-time per completion |
| Task On-Time | 5 | - | If done before due date |
| Lead Created | 5 | - | Manual creation |
| Lead Converted | 50 | - | Per lead |
| Opportunity Won | 100 | NEVER | One-time only, permanent |
| Pool Claim | 5 | 1 min | Per lead per action |
| Task Created | 3 | - | Per task |

### Streak Multipliers
- 1-2 days: 1.0x (no bonus)
- 3+ days: 1.1x (Warming Up)
- 7+ days: 1.25x (Hot)
- 14+ days: 1.5x (On Fire)
- 30+ days: 2.0x (Legendary)

### Levels
- Each level requires 100 total XP
- Level 1 starts at 0 XP
- Level 5+: ⭐ Rising Star
- Level 10+: 🎯 Closer in Training
- Level 20+: 🚀 Pipeline Pro
- Level 30+: 💎 Deal Maker
- Level 40+: 🌟 Sales Legend
- Level 50+: 👑 Rainmaker

### Achievements (27 total)
- **Calls**: 1, 10, 50, 100, 500
- **Mails**: 1, 25, 50, 200
- **Tasks**: 1, 10, 50, 200
- **Conversions**: 1, 10, 25
- **Wins**: 1, 5, 20
- **Streaks**: 3, 7, 14, 30 days
- **Levels**: 5, 10, 25, 50

---

## Payroll

### Calculation Formula
```
Working Days = All days - Weekends - Holidays
Target Hours = Working Days * 8
Hourly Rate = Base Salary / Target Hours

Worked Hours = Actual attended + Approved Leave (8hrs/day) + Makeup (weekends)
Worked Hours = MIN(Worked Hours, Target Hours)  // Cap at target

Final Salary = (Worked Hours / 60) * Hourly Rate = Capped at Base Salary
```

### Key Rules
- **No Overtime**: Final salary never exceeds base salary
- **Holiday Credit**: Weekday holidays = 8 hours paid
- **Leave Credit**: Approved leave = 8 hours per day
- **Makeup Minutes**: Weekend work can cover absences (1 day = 480 min)
- **Projection**: If current month, project based on pace to date

### Example
```
Base: $50,000
Working Days: 20 (exc. weekends, holidays)
Attended: 18 days
Approved Leave: 2 days
Absent: 0 days (covered by makeup)
Makeup: 480 min (8 hrs)

Total = (18*8 + 2*8 + 8) * hourly_rate = Capped at $50,000
```

---

## Automation

### Lead Recirculation (Cron Job)

#### Phase 1: Lost Lead Cleanup
- Trigger: Lost status + 60+ days no activity
- Action: Move to Open Pool (ownerId = null)
- Log: Activity entry for audit

#### Phase 2: Priority-Based Reclaim
| Priority | Reclaim Window | Warning Window | Action |
|----------|---|---|---|
| High | 7 days | 5 days | Move to pool after 7 days |
| Medium | 14 days | 12 days | Move to pool after 14 days |
| Low | 21 days | 19 days | Move to pool after 21 days |

**Key**: Uses `lastMeaningfulActivityAt` (calls/emails only)
- Notes alone do NOT reset the clock
- Must be actual sales action to prevent reclaim

#### Phase 3: Warning Tasks
- Created when entering warning zone
- Title: "WARNING: Auto-Reclaim in X hours"
- Due: At reclaim cutoff date
- Owner gets notified

---

## Core API Endpoints

### Leads
- `GET /api/leads` - List with filters
- `POST /api/leads` - Create (with dedup)
- `POST /api/leads/[id]/claim` - Claim from pool
- `POST /api/leads/[id]/convert` - Convert to opportunity
- `POST /api/leads/[id]/call-attempt` - Log call
- `POST /api/leads/[id]/mail-attempt` - Log email
- `GET /api/pool` - List unassigned leads

### Opportunities
- `GET /api/opportunities` - List
- `POST /api/opportunities` - Create
- `PUT /api/opportunities/[id]` - Update (stage changes trigger XP)
- `DELETE /api/opportunities/[id]` - Soft delete

### Tasks
- `GET /api/tasks` - List with filters
- `POST /api/tasks` - Create (must link to lead)
- `PATCH /api/tasks/[id]/toggle` - Complete/uncomplete

### Admin
- `POST /api/admin/leads` - Bulk import (1000 max)
- `PUT /api/admin/reassign` - Bulk reassign (500 max)
- `GET /api/admin/payroll` - Calculate all salaries
- `GET /api/admin/dashboard` - Overview & alerts
- `GET /api/admin/reports/sales` - Detailed analytics

---

## Validation Rules

### Input Validation
- **Email**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **URL**: `/^https?:\/\/.+/`
- **Required**: website, leadId, title, dates

### Business Logic Validation
- Dedup check before lead creation
- Ownership check for all operations
- Claim limit check before claiming
- Conversion block if opp already exists
- Leave type validation against config

### State Validation
- Suspended users cannot login
- Cannot assign to admin or suspended user
- Cannot reclaim from previous owner
- Only owner or admin can modify

---

## Database Schema Summary

### Core Tables
- **User**: gamification, payroll, permissions
- **Lead**: sales prospect with tracking
- **Opportunity**: sales deal with stages
- **Task**: activity tracking
- **CallAttempt**: call logging
- **MailAttempt**: email logging
- **AttendanceRecord**: time tracking
- **LeaveRequest**: absence requests
- **StageHistory**: opportunity pipeline tracking
- **XPHistory**: gamification audit trail
- **UserAchievement**: achievement unlocks
- **Achievement**: achievement definitions
- **ActivityLog**: complete audit trail
- **SystemSetting**: configurable settings
- **SystemOption**: dropdown values

---

## Configuration Points

### XP Settings (Configurable in DB)
- `XP_CALL_ATTEMPT` → 15
- `XP_MAIL_ATTEMPT` → 10
- `XP_TASK_COMPLETED` → 10
- `XP_LEAD_CONVERTED` → 50
- `XP_OPPORTUNITY_WON` → 100
- `XP_POOL_CLAIM` → 5
- `XP_LEAD_CREATED` → 5
- `XP_TASK_CREATED` → 3

### Lead Reclaim Settings
- `RECYCLE_DAYS` → 60
- `CLAIM_LIMIT` → 50
- `RECLAIM_HIGH` → 7, `WARN_HIGH` → 5
- `RECLAIM_MEDIUM` → 14, `WARN_MEDIUM` → 12
- `RECLAIM_LOW` → 21, `WARN_LOW` → 19

---

## Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad request | "Website is required" |
| 401 | Unauthorized | "User not authenticated" |
| 403 | Forbidden | "Claim limit reached" |
| 404 | Not found | "Lead not found" |
| 409 | Conflict | "Lead already exists" |
| 429 | Rate limited | "Too many requests" |
| 500 | Server error | "Internal error" |

---

## Rate Limiting
- **Login**: 10 attempts per minute per IP
- **Lead Creation**: 30 per minute per user
- **General API**: 1000 per minute per IP

---

## Workflow Examples

### Complete Lead Lifecycle
1. Admin imports 100 leads → POST `/api/admin/leads`
2. Rep claims 5 leads → POST `/api/leads/[id]/claim` (×5)
3. Rep calls leads → POST `/api/leads/[id]/call-attempt`
   - If interested: status → "Called", XP +15
   - If not interested: status → "Lost"
4. Rep converts good lead → POST `/api/leads/[id]/convert`
   - Creates opportunity, XP +50
5. Rep updates opp stage → PUT `/api/opportunities/[id]`
   - Each stage change: XP +5
6. Rep moves to "Closed Won" → XP +100 (one-time)
   - Lead status → "Active Client"
7. Cron job recirculates lost leads after 60 days

### Task Completion & Bonus
1. Rep creates task → POST `/api/tasks` (XP +3)
2. Task due tomorrow, rep completes today → PATCH `/api/tasks/[id]/toggle`
   - XP +10 (TASK_COMPLETED)
   - XP +5 (TASK_ON_TIME_BONUS)
3. Achievements checked automatically
4. Level up if XP threshold crossed
5. Title updates if new level reached

---

## For More Details
See full document: `CFM_BUSINESS_LOGIC_ANALYSIS.md`

Quick access to sections:
- Search for "### " to find endpoint details
- Search for "| " to find tables and metrics
- Search for ```javascript to find code examples
