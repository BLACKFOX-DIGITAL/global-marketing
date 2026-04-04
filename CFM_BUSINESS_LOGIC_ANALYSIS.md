# CFM (CRM + Gamification + HR) Platform - Complete Business Logic Analysis

**Generated:** 2024
**Analysis Scope:** Complete codebase examination of /lib directory, all API endpoints, database schema, and core business processes

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Core Business Entities](#core-business-entities)
3. [API Endpoints & Business Logic](#api-endpoints--business-logic)
4. [Business Rules & Constraints](#business-rules--constraints)
5. [Calculations & Algorithms](#calculations--algorithms)
6. [State Machines & Workflows](#state-machines--workflows)
7. [Validation Logic](#validation-logic)
8. [Data Dependencies & Flow](#data-dependencies--flow)
9. [System Configuration](#system-configuration)

---

## Overview & Architecture

The CFM platform is a Sales CRM integrated with gamification mechanics and HR management. It tracks sales activities (leads, opportunities, tasks), manages team performance through XP/leveling systems, and handles payroll calculations based on actual work hours.

### Core Components:
- **Sales Management:** Leads → Opportunities → Closed Won/Lost
- **Engagement Tracking:** Call & Mail Attempts with outcome tracking
- **Gamification:** XP system, streaks, achievements, levels, titles
- **Team Management:** User roles, goals, leave requests, attendance
- **HR/Payroll:** Time tracking, salary calculations, holidays, leave management
- **Admin Oversight:** Dashboard analytics, reporting, lead reassignment

---

## Core Business Entities

### 1. LEAD (Sales Prospect)
**File:** `/prisma/schema.prisma` (Lines 40-89)

#### Fields & Business Meaning:
- `id` - Unique identifier
- `name` - Company name or prospect name
- `company` - Company name
- `email` - Contact email (used for deduplication)
- `phone` - Contact phone
- `website` - Company website (used for deduplication)
- `country` - Geographic location
- `status` - Current state (New, Called, Mail Sent, Lost, Won, Converted, Active Client, Open Pool)
- `priority` - High/Medium/Low (affects auto-reclaim windows)
- `industry` - Business vertical
- `notes` - Freeform notes
- `ownerId` - Sales rep owner (null = in open pool)
- `callCount` - Total calls made
- `mailCount` - Total emails sent
- `lastCallOutcome` - Result of last call (no_answer, voicemail, connected_interested, connected_not_interested, call_back_later)
- `lastMailOutcome` - Result of last email (sent, follow_up, response_interested, response_not_interested)
- `lastActivityAt` - Timestamp of any activity (call, email, task, note)
- `lastMeaningfulActivityAt` - Timestamp of REAL sales actions only (calls/emails, NOT notes)
- `previousOwnerId` - Former owner (prevents reclaiming by same person)
- `isClaimedFromPool` - Boolean flag if claimed from unassigned pool
- `isDeleted` - Soft delete flag
- `deletedAt` - Deletion timestamp
- `deletedBy` - User who deleted

**Key Business Rules:**
- Leads are deduplicated by `website` OR `email`
- Default status on creation: "New"
- Status transitions triggered by call/email outcomes:
  - `connected_interested` → Status becomes "Called"
  - `connected_not_interested` → Status becomes "Lost"
  - `sent` or `follow_up` email → Status becomes "Mail Sent"
  - `response_not_interested` email → Status becomes "Lost"
- Leads can be converted to Opportunities (status → "Converted")
- When opportunity won → Lead status → "Active Client"
- Leads without owners can be claimed from pool (if under claim limit)
- Cannot reclaim a lead from previous owner ("Fresh Eyes" rule)
- Auto-recirculation after 60+ days of inactivity with Lost status

---

### 2. OPPORTUNITY (Sales Deal)
**File:** `/prisma/schema.prisma` (Lines 130-159)

#### Fields & Business Meaning:
- `id` - Unique identifier
- `title` - Deal name (usually derived from lead)
- `company` - Company name
- `stage` - Pipeline stage (Test Job Received, negotiating, closing, Closed Won, Closed Lost, etc.)
- `probability` - Win probability percentage (0-100, defaults to 20%)
- `closeDate` - Expected close date
- `notes` - Deal details
- `region` - Geographic region
- `ownerId` - Sales rep owner
- `leadId` - Link to source lead
- `createdAt` - Creation timestamp
- `updatedAt` - Last modification
- `isDeleted` - Soft delete flag
- `deletedAt` - Deletion timestamp
- `deletedBy` - User who deleted

**Key Business Rules:**
- Created when lead is converted
- Initial stage set to first configured stage (default: "Test Job Received")
- Initial probability: 20%
- Stage transitions tracked in `StageHistory`
- When stage changed to "Closed Won":
  - Linked lead status → "Active Client"
  - Award XP: `OPPORTUNITY_WON` (100 XP, one-time per opportunity)
- When opportunity deleted:
  - Linked lead status → "Lost"
  - Marked as soft-deleted for audit trail

---

### 3. USER (Sales Rep / Admin)
**File:** `/prisma/schema.prisma` (Lines 10-38)

#### Fields & Business Meaning:
- `id` - Unique identifier
- `name` - Full name
- `email` - Unique email
- `password` - Bcrypt hash
- `role` - "Administrator", "Sales Rep", etc.
- `xp` - Total experience points
- `level` - Current level (calculated from XP)
- `currentStreak` - Current consecutive activity days
- `longestStreak` - Longest streak ever achieved
- `lastActiveDay` - Last day activity recorded
- `baseSalary` - Monthly base salary for payroll
- `isSuspended` - Account deactivation flag
- `resendSenderEmail` - Email service integration
- `createdAt`, `updatedAt` - Timestamps

**Key Business Rules:**
- Suspended users cannot log in or be assigned leads
- Admins cannot be assigned leads in bulk reassignment
- Sales reps can only see their own leads/tasks unless admin
- Salary calculated based on attendance and leave (see Payroll section)

---

### 4. TASK
**File:** `/prisma/schema.prisma` (Lines 224-247)

#### Fields & Business Meaning:
- `id` - Unique identifier
- `title` - Task description
- `description` - Detailed notes
- `taskType` - Type (Follow-up, Call, Email, System Warning, etc.)
- `priority` - High/Medium/Low
- `status` - Pending/Completed/Overdue
- `dueDate` - When task is due
- `recurrence` - Recurrence pattern (None, Daily, Weekly, etc.)
- `completed` - Boolean completion flag
- `completedAt` - When marked complete
- `ownerId` - Assigned to sales rep
- `leadId` - Related lead
- `opportunityId` - Related opportunity

**Key Business Rules:**
- Every task must be linked to a lead
- Sales reps can only create tasks on their own leads
- Completion triggers XP reward:
  - `TASK_COMPLETED`: 10 XP
  - `TASK_ON_TIME_BONUS`: 5 XP (if completed before dueDate)
- Tasks older than 7 days are hidden from "All" view (completed tasks only)
- Auto-created follow-up tasks when call outcome is "call_back_later" with dueDate
- System automatically creates warning tasks for leads at auto-reclaim risk

---

### 5. CALL ATTEMPT & MAIL ATTEMPT
**File:** `/prisma/schema.prisma` (Lines 91-116)

#### Call Attempt:
- `outcome` - no_answer, voicemail, connected_interested, connected_not_interested, call_back_later
- Triggers lead status changes and auto-task creation

#### Mail Attempt:
- `outcome` - sent, follow_up, response_interested, response_not_interested
- Tracks delivery status from email service

---

### 6. ATTENDANCE RECORD
**File:** `/prisma/schema.prisma` (Lines 249-258)

#### Fields:
- `punchIn` - Clock in time
- `punchOut` - Clock out time (null if still clocked in)
- `duration` - Minutes worked (calculated as punchOut - punchIn)
- `notes` - Optional notes

**Key Business Rules:**
- Punch in/out is atomic (prevents double-clock from race conditions)
- Duration calculated in minutes
- Used in payroll calculations for salary determination

---

### 7. LEAVE REQUEST
**File:** `/prisma/schema.prisma` (Lines 260-270)

#### Fields:
- `userId` - Employee requesting leave
- `type` - Leave type (configured in system settings)
- `startDate` - First day of leave
- `endDate` - Last day of leave
- `reason` - Optional reason
- `status` - Pending/Approved/Rejected

**Key Business Rules:**
- Validated against configured leave types
- End date must be >= start date
- Approved leaves count as worked days in payroll (480 minutes = 8 hours per day)
- No overtime for approved leave days

---

### 8. XP HISTORY
**File:** `/prisma/schema.prisma` (Lines 314-324)

#### Fields:
- `userId` - Who earned the XP
- `actionType` - Type of action (LEAD_CREATED, CALL_ATTEMPT, MAIL_ATTEMPT, etc.)
- `entityId` - Reference to lead/opportunity/task
- `xpAwarded` - XP amount after streak multiplier
- `createdAt` - When earned

**Key Business Rules:**
- Anti-spam: 1-minute cooldown between same actions on same entity (except OPPORTUNITY_WON)
- OPPORTUNITY_WON: Permanent per opportunity (can only earn once ever)
- Updates: 1-hour cooldown between updates on same entity
- All XP includes streak multiplier

---

### 9. ACHIEVEMENT & USER ACHIEVEMENT
**File:** `/prisma/schema.prisma` (Lines 292-312)

#### Achievement:
- `name` - Badge name (unique)
- `description` - What it requires
- `icon` - Emoji representation
- `category` - calls, mails, tasks, conversions, wins, streak, level
- `threshold` - Number required to unlock

**Key Business Rules:**
- 27 default achievements seeded
- Automatically unlocked when user meets threshold in category
- Used for milestones and progression tracking

---

## API Endpoints & Business Logic

### AUTHENTICATION

#### 1. POST `/api/auth/login`
**File:** `/app/api/auth/login/route.ts` (Lines 1-39)

**Business Logic:**
- Rate limit: 10 attempts per IP per minute
- Validates email/password against bcrypt hash
- Returns 403 if account suspended
- Issues JWT token (expires 7 days)
- Sets httpOnly secure cookie

**Validations:**
- Email/password required
- Bcrypt password verification
- Suspended account check

---

### LEADS MANAGEMENT

#### 2. GET `/api/leads`
**File:** `/app/api/leads/route.ts` (Lines 11-88)

**Business Logic:**
- Returns paginated list of leads
- Non-managers see only their own leads
- Managers see all leads
- Supports search by name, email, company
- Supports multi-status filtering
- Default ordering: newest first

**Parameters:**
- `search` - Text search across name/email/company
- `status` - Single or CSV of statuses
- `exclude` - Exclude certain statuses
- `page` - Pagination (default 1)
- `limit` - Per-page limit (max 100, default 10)

---

#### 3. POST `/api/leads`
**File:** `/app/api/leads/route.ts` (Lines 90-161)

**Business Logic:**
- Create new lead with auto-deduplication
- Rate limit: 30 creates per minute per user
- XP Award: `LEAD_CREATED` (5 XP)
- Assigns to user unless body specifies different owner
- Creates contacts if provided

**Validations:**
- Website required
- Deduplication: Check OR(website, email) for existing leads
- Sanitize all text fields
- Contacts: First contact marked as primary

**XP Awards:**
- Base: 5 XP
- Applied with streak multiplier

---

#### 4. POST `/api/leads/[id]/claim`
**File:** `/app/api/leads/[id]/claim/route.ts` (Lines 1-75)

**Business Logic:**
- Claim unassigned lead from pool
- Enforces claim limit (configurable, default 50)
- Prevents "Fresh Eyes" - cannot reclaim own previous lead
- Uses transaction to prevent race conditions
- Sets `isClaimedFromPool = true`
- Resets lead status to "New"
- XP Award: `POOL_CLAIM` (5 XP)

**Constraints:**
- Only leads with `ownerId = null` can be claimed
- `previousOwnerId` check prevents reclaim from same user
- Claim count includes only:
  - `isClaimedFromPool = true`
  - Active statuses (excludes Lost, Won, Converted, Active Client)

**Error Cases:**
- 403 if claim limit reached
- 400 if lead already claimed
- 403 if "Fresh Eyes" rule violated

---

#### 5. POST `/api/leads/[id]/convert`
**File:** `/app/api/leads/[id]/convert/route.ts` (Lines 1-70)

**Business Logic:**
- Convert lead to opportunity
- Only lead owner or admin can convert
- Prevents duplicate conversion (checks for existing active opportunity)
- Creates opportunity with:
  - Title: "{lead.company} - Opportunity"
  - Stage: First configured stage or "Test Job Received"
  - Probability: 20%
  - Owner: Lead's owner
- Creates stage history record
- Sets lead status to "Converted"
- XP Award: `LEAD_CONVERTED` (50 XP)

**Constraints:**
- Only one active opportunity per lead
- Lead ownership required (or admin)

---

#### 6. POST `/api/leads/[id]/call-attempt`
**File:** `/app/api/leads/[id]/call-attempt/route.ts` (Lines 1-128)

**Business Logic:**
- Log call attempt against lead
- Increments `callCount`
- Updates `lastCallOutcome` and `lastActivityAt`
- Updates `lastMeaningfulActivityAt` (resets auto-reclaim timer)
- Status transitions based on outcome:
  - `connected_interested` → "Called"
  - `connected_not_interested` → "Lost"
- Auto-creates follow-up task if outcome = `call_back_later` with valid dueDate
- Logs activity entry
- XP Award: `CALL_ATTEMPT` (15 XP)

**Outcomes:**
- `no_answer` - No status change
- `voicemail` - No status change, but records attempt
- `connected_interested` - Status → "Called"
- `connected_not_interested` - Status → "Lost"
- `call_back_later` - Creates follow-up task with auto-assigned dueDate

---

#### 7. POST `/api/leads/[id]/mail-attempt`
**File:** `/app/api/leads/[id]/mail-attempt/route.ts` (Lines 1-100)

**Business Logic:**
- Log email/mail attempt against lead
- Increments `mailCount`
- Updates `lastMailOutcome` and `lastActivityAt`
- Updates `lastMeaningfulActivityAt`
- Status transitions based on outcome:
  - `sent` or `follow_up` → "Mail Sent"
  - `response_interested` → "Mail Sent"
  - `response_not_interested` → "Lost"
- Tracks delivery status from email service
- XP Award: `MAIL_ATTEMPT` (10 XP)

**Outcomes:**
- `sent` - Email sent
- `follow_up` - Follow-up email sent
- `response_interested` - Got interested response
- `response_not_interested` - Got rejection

---

#### 8. GET `/api/pool`
**File:** `/app/api/pool/route.ts` (Lines 1-56)

**Business Logic:**
- List all unassigned leads in open pool
- Only non-deleted leads with `ownerId = null`
- Sorted by `lastActivityAt` (oldest first - most stale leads visible)
- Supports search and status filtering
- Paginated

---

### OPPORTUNITIES MANAGEMENT

#### 9. GET `/api/opportunities`
**File:** `/app/api/opportunities/route.ts` (Lines 7-43)

**Business Logic:**
- Returns paginated opportunities
- Non-managers see only their opportunities
- Managers see all
- Optional stage filter
- Optional search (title/company)
- Includes owner, lead info, stage history

---

#### 10. POST `/api/opportunities`
**File:** `/app/api/opportunities/route.ts` (Lines 45-81)

**Business Logic:**
- Create new opportunity
- Only admins can assign to different owner
- Creates initial stage history record
- Links to lead if provided

**Defaults:**
- Stage: "Test Job Received"
- Probability: 20%

---

#### 11. PUT `/api/opportunities/[id]`
**File:** `/app/api/opportunities/[id]/route.ts` (Lines 30-117)

**Business Logic:**
- Update opportunity details
- Only owner or admin can update
- Stage change handling:
  - Creates stage history record
  - Logs activity with old→new stage
  - If stage = "Closed Won":
    - Linked lead status → "Active Client"
    - XP Award: `OPPORTUNITY_WON` (100 XP, one-time)
    - Logs activity for lead
  - Otherwise:
    - XP Award: `OPPORTUNITY_UPDATED` (5 XP)
- Prevents nulling `leadId` on partial updates

**Constraints:**
- Admin-only reassignment
- Stage history creation on change

---

#### 12. DELETE `/api/opportunities/[id]`
**File:** `/app/api/opportunities/[id]/route.ts` (Lines 119-158)

**Business Logic:**
- Soft delete opportunity
- Sets linked lead status to "Lost"
- Marks as deleted with timestamp and deleter ID
- Not truly removed from database (audit trail)

---

### TASKS MANAGEMENT

#### 13. GET `/api/tasks`
**File:** `/app/api/tasks/route.ts` (Lines 6-97)

**Business Logic:**
- Get tasks with advanced filtering
- Non-managers see only their tasks
- Status filters:
  - `Pending` - Not completed, due in future
  - `Completed` - Completed in last 7 days
  - `Overdue` - Not completed, due date in past
  - Default/All - Not completed OR completed in last 7 days
- Supports priority filter (High/Medium/Low)
- Supports lead filter
- Pagination
- Includes counts for all tabs

**Ordering:** Pending first, then by due date, then by creation

---

#### 14. POST `/api/tasks`
**File:** `/app/api/tasks/route.ts` (Lines 99-149)

**Business Logic:**
- Create task (must be linked to lead)
- Sales reps can only link to their own leads
- Admins can assign to any lead or user
- Updates lead's `lastActivityAt`
- XP Award: `TASK_CREATED` (3 XP)

**Validations:**
- `leadId` required
- `title` required and non-empty
- User ownership check (sales reps)

---

#### 15. PATCH `/api/tasks/[id]/toggle`
**File:** `/app/api/tasks/[id]/toggle/route.ts` (Lines 1-49)

**Business Logic:**
- Toggle task completion status
- Only owner or admin can toggle
- When completing:
  - Sets `completed = true`, `completedAt = now`
  - Updates lead's `lastActivityAt`
  - XP Award: `TASK_COMPLETED` (10 XP)
  - **Bonus XP:** If completed before/on dueDate:
    - Award: `TASK_ON_TIME_BONUS` (5 XP)
- When uncompleting:
  - Sets `completed = false`, `completedAt = null`
  - No XP awarded
  - No bonus XP considered

---

### ATTENDANCE & TIME TRACKING

#### 16. POST `/api/attendance/punch`
**File:** `/app/api/attendance/punch/route.ts` (Lines 1-35)

**Business Logic:**
- Clock in/out toggle
- Transaction prevents race conditions
- If open punch-in exists:
  - Punch out: Calculate duration in minutes
  - Sets `punchOut = now`, `duration = minutes`
- If no open punch-in:
  - Punch in: Create new record with `punchIn = now`, `punchOut = null`
- Returns action type and record

---

### LEAVE MANAGEMENT

#### 17. GET `/api/leave`
**File:** `/app/api/leave/route.ts` (Lines 5-25)

**Business Logic:**
- Get leave requests
- Admins see all; employees see own
- Includes next 5 holidays
- Returns user's manager status

---

#### 18. POST `/api/leave`
**File:** `/app/api/leave/route.ts` (Lines 27-69)

**Business Logic:**
- Create new leave request
- Validates leave type against configured system options
- Validates date range (endDate >= startDate)
- Default status: "Pending"

**Validations:**
- Valid leave type
- Valid date format
- End >= start

---

### GAMIFICATION

#### 19. GET `/api/gamification`
**File:** `/app/api/gamification/route.ts`

**Business Logic:**
- Returns user's full gamification profile including:
  - Current XP, Level, Streak
  - All achievements with progress
  - Stats (calls, mails, tasks, wins, etc.)

---

#### 20. GET `/api/leaderboard`
**File:** `/app/api/leaderboard/route.ts` (Lines 1-140)

**Business Logic:**
- Period-aware ranking of sales reps
- Period options: week, month (default), all
- Ranked by XP earned in selected period
- Includes per-user metrics:
  - Total level/title/streak
  - Leads created/claimed
  - Opportunities/closures
  - Win rate
  - Tasks completed
  - Hours worked
  - Badge count

**Ranking Algorithm:**
- Sort by `periodXp` (descending)
- Rank assigned by position

---

### ADMIN ENDPOINTS

#### 21. GET/PUT `/api/admin/reassign`
**File:** `/app/api/admin/reassign/route.ts` (Lines 1-69)

**GET Business Logic:**
- Returns all active leads and all users for reassignment

**PUT Business Logic:**
- Bulk reassign leads to new owner
- Validates new owner exists and is not:
  - Administrator
  - Suspended
- Updates up to 500 leads per request
- Only leads that are not deleted

**Constraints:**
- Max 500 leads per request
- Cannot assign to admin or suspended user

---

#### 22. POST/GET `/api/admin/leads`
**File:** `/app/api/admin/leads/route.ts` (Lines 1-151)

**POST Business Logic (Bulk Import):**
- Import up to 1000 leads
- Validates email format and website URL
- Sanitizes all fields
- Allows optional assignment to specific user
- Returns success/failed counts with errors

**GET Business Logic:**
- Full lead database view for admins
- Filters by search, country, status, owner
- Supports sorting (name, company, status, updatedAt, owner, country)
- Export mode returns up to 10,000 records
- Includes stats: total, unassigned, new this month, status breakdown
- Sales rep list, countries list

**Validations:**
- Email format validation
- Website URL format validation
- Max 1000 leads per import

---

#### 23. GET `/api/admin/payroll`
**File:** `/app/api/admin/payroll/route.ts` (Lines 1-33)

**Business Logic:**
- Calculate monthly salary for all active users
- Uses date parameter (defaults to current month)
- Returns salary report for each user (see Payroll Calculation section)

---

#### 24. GET `/api/admin/dashboard`
**File:** `/app/api/admin/dashboard/route.ts` (Lines 1-151)

**Business Logic:**
- Comprehensive admin dashboard with:
  - User count, lead/opportunity totals
  - Stage breakdown
  - Recent leads
  - Monthly vs last month trends
  - Global goals (DEALS, LEADS, TEST_JOBS)
  - Leaderboard
  - Alerts (pool leads, overdue tasks, pending leave, stale leads)
  - 14-day daily trends

**Calculations:**
- Trend percentages: `((current - previous) / previous) * 100`
- Goals: Sum of user goals vs actual achievement

---

#### 25. GET `/api/admin/deletions`
**File:** `/app/api/admin/deletions/route.ts` (Lines 1-49)

**Business Logic:**
- Review soft-deleted leads and opportunities
- Unified view of deletion queue
- Shows deleter and deletion timestamp
- Sorted by newest first

---

#### 26. GET `/api/admin/reports/sales`
**File:** `/app/api/admin/reports/sales/route.ts` (Lines 1-454)

**Business Logic:**
- Comprehensive sales reporting for admin
- Period-aware: today, yesterday, week, last_week, month, last_month, quarter, year
- Per-rep stats:
  - Leads (created, claimed)
  - Opportunities (created, closed won)
  - Tasks (completed, on-time rate)
  - Calls/emails
  - Hours worked
  - Activity logs
- Global stats and aggregates
- Lead distribution and aging analysis
- Pipeline health metrics
- Task overview
- Inactivity alerts (color-coded)
- Goal tracking alerts

**Metrics:**
- Lead aging: fresh (0-3 days), active (3-7 days), stale (7-14 days), at-risk (14+ days)
- Stuck opportunities: No stage change for 14+ days
- Task completion rate: on-time completions / total
- Win rate: closed won / total opportunities

---

### DASHBOARD & STATS

#### 27. GET `/api/dashboard/stats`
**File:** `/app/api/dashboard/stats/route.ts` (Lines 1-87)

**Business Logic:**
- Personal dashboard for sales rep
- Returns today's key metrics
- Includes:
  - Total leads
  - Tasks due today
  - Closed won this month
  - Recent leads (last 5)
  - Today's tasks
  - Pipeline by stage
  - Overdue tasks
  - Upcoming tasks (next 7 days)
  - Goals and progress
  - Gamification profile
  - Holidays

---

### MAINTENANCE & CRON

#### 28. GET `/api/cron/lead-maintenance`
**File:** `/app/api/cron/lead-maintenance/route.ts` (Lines 1-183)

**Business Logic:**
This is the core lead lifecycle automation engine.

**Phase 1: Recirculation (60+ days Lost)**
- Find Lost leads with no activity 60+ days
- Move to pool: `ownerId = null`, `status = "Open Pool"`
- Save previous owner
- Log recirculation activity

**Phase 2: Priority-Based Reclaim (Stale without meaningful activity)**
- For each priority level, uses different windows:

| Priority | Warn Window | Reclaim Window |
|----------|-------------|----------------|
| High     | 5 days     | 7 days        |
| Medium   | 12 days    | 14 days       |
| Low      | 19 days    | 21 days       |

- **lastMeaningfulActivityAt** drives this (calls/emails only)
- If no meaningful activity for reclaim window:
  - Move to pool
  - Log reclaim activity
- Within warn window but before reclaim:
  - Create system warning task if not exists
  - Task due in `(reclaim - warn)` days

**Phase 3: Warning Tasks**
- Auto-created for leads in warning zone
- Title: `WARNING: Auto-Reclaim in X hours`
- High priority
- Owner receives notification

**Constraints:**
- All windows are configurable system settings
- RECYCLE_DAYS (default 60), WARN_HIGH/MEDIUM/LOW, RECLAIM_HIGH/MEDIUM/LOW
- Only affects assigned leads (not in pool)
- Skips Lost, Won, Converted, Active Client statuses

---

## Business Rules & Constraints

### Lead Management Rules

| Rule | Details | File | Lines |
|------|---------|------|-------|
| **Deduplication** | Leads deduplicated by website OR email | `/api/leads/route.ts` | 112-124 |
| **Pool Claim Limit** | Max configurable leads from pool per user (default 50) | `/api/leads/[id]/claim/route.ts` | 14-29 |
| **Fresh Eyes** | Cannot reclaim own previous lead | `/api/leads/[id]/claim/route.ts` | 39-41 |
| **Status on Create** | Always "New" | `/api/leads/route.ts` | 135 |
| **Conversion** | Only one active opportunity per lead | `/api/leads/[id]/convert/route.ts` | 26-31 |
| **Owner Restriction** | Sales reps can only create tasks on their leads | `/api/tasks/route.ts` | 113-118 |
| **Ownership Visibility** | Non-managers see only own leads/opportunities/tasks | Multiple | Multiple |

### XP & Gamification Rules

| Rule | Details | File | Lines |
|------|---------|------|-------|
| **Base XP Amounts** | Configurable in system settings | `/lib/gamification.ts` | 3-23 |
| **Cooldown (1 min)** | Non-OPPORTUNITY_WON actions | `/lib/gamification.ts` | 87-103 |
| **Cooldown (1 hour)** | UPDATE actions on same entity | `/lib/gamification.ts` | 87 |
| **OPPORTUNITY_WON** | Permanent per opportunity, one-time award | `/lib/gamification.ts` | 80-85 |
| **Streak Multiplier** | Applied to all XP | `/lib/gamification.ts` | 27-33 |
| **Daily Streak Reset** | Checked at first activity each day | `/lib/gamification.ts` | 132-156 |

### Payroll Rules

| Rule | Details | File | Lines |
|------|---------|------|-------|
| **Target Days** | Working days + weekday holidays | `/lib/payroll.ts` | 160-162 |
| **Absent Coverage** | Makeup minutes cover absent days | `/lib/payroll.ts` | 154-156 |
| **No Overtime Cap** | Salary capped at base (no overtime pay) | `/lib/payroll.ts` | 165-167 |
| **Approved Leave** | Counts as 8 hours (480 min) per day | `/lib/payroll.ts` | 141-142 |
| **Holiday Treatment** | Paid vacation, 480 min credited | `/lib/payroll.ts` | 119 |
| **Makeup Minutes** | Weekend work can cover absences | `/lib/payroll.ts` | 111-112 |

### Authentication & Access Rules

| Rule | Details | File | Lines |
|------|---------|------|-------|
| **Login Rate Limit** | 10 attempts per IP per minute | `/api/auth/login/route.ts` | 9-13 |
| **Token Expiry** | 7 days | `/lib/auth.ts` | 23 |
| **Suspended Check** | Checked on login and getCurrentUser | `/api/auth/login/route.ts` | 24-25 |
| **Admin Only** | Reassignment, bulk import, settings | Multiple | Multiple |
| **Manager Override** | Admins see all data | Multiple | Multiple |

---

## Calculations & Algorithms

### 1. XP & Level System

**File:** `/lib/gamification.ts`

#### XP Base Values (Configurable):
```
CALL_ATTEMPT: 15 XP
MAIL_ATTEMPT: 10 XP
TASK_COMPLETED: 10 XP
LEAD_CONVERTED: 50 XP
OPPORTUNITY_WON: 100 XP (one-time)
POOL_CLAIM: 5 XP
LEAD_CREATED: 5 XP
TASK_CREATED: 3 XP
TASK_ON_TIME_BONUS: 5 XP
LEAD_UPDATED: 3 XP
OPPORTUNITY_UPDATED: 5 XP
```

#### Streak Multiplier (Lines 27-33):
```javascript
function getStreakMultiplier(streak: number): number {
    if (streak >= 30) return 2.0    // Legendary
    if (streak >= 14) return 1.5    // On Fire
    if (streak >= 7) return 1.25    // Hot
    if (streak >= 3) return 1.1     // Warming Up
    return 1.0                       // No bonus
}
```

#### Final XP Calculation (Line 160):
```
xpAmount = Math.round(baseXP * streakMultiplier)
```

#### Level Calculation (Line 39):
```javascript
function calculateLevel(totalXp: number): number {
    return Math.floor(totalXp / 100) + 1
}
```

**Level progression:** Each level requires 100 additional XP
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 200 XP
- etc.

#### Streak Logic (Lines 122-156):
- Check if activity occurred today (compare dateOnly)
- If not today:
  - If yesterday: increment streak
  - Else: reset to 1
- Update longestStreak if exceeded
- Set lastActiveDay = today

#### Title Assignment (Lines 51-59):
```
Level 50+: 👑 Rainmaker
Level 40+: 🌟 Sales Legend
Level 30+: 💎 Deal Maker
Level 20+: 🚀 Pipeline Pro
Level 10+: 🎯 Closer in Training
Level 5+: ⭐ Rising Star
Level 1+: 🏃 Sales Scout
```

#### Achievements (Lines 339-390):
27 default achievements across categories:
- **Calls:** First Ring, Dialer, Phone Warrior, Century Club, Call Center (1, 10, 50, 100, 500)
- **Mails:** Mail Starter, Outreach Pro, Inbox Zero, Email Machine (1, 25, 50, 200)
- **Tasks:** First Task, Getting Things Done, Task Master, Productivity Machine (1, 10, 50, 200)
- **Conversions:** First Blood, Lead Machine, Conversion King (1, 10, 25)
- **Wins:** Closer, Deal Hunter, Sales Machine (1, 5, 20)
- **Streaks:** On Fire, Unstoppable, Iron Will, Legendary (3, 7, 14, 30 days)
- **Levels:** Level 5, 10, 25, 50

---

### 2. Payroll Calculation

**File:** `/lib/payroll.ts` (Lines 29-212)

#### Key Parameters:
- Base Salary (from User)
- Working Days in Month (excluding weekends and holidays)
- Attended Days
- Approved Leave Days
- Absent Days
- Makeup Minutes (weekend work)
- Total Minutes Worked

#### Calculation Flow:

```javascript
// 1. Identify working days (exclude weekends and holidays)
workingDaysCount = allDaysInMonth.filter(d => !isWeekend(d) && !isHoliday(d)).length

// 2. Count weekday holidays (paid vacation days)
weekdayHolidaysCount = holidays.filter(d => !isWeekend(d)).length

// 3. Calculate target
totalTargetDays = workingDaysCount + weekdayHolidaysCount
targetHoursPerMonth = totalTargetDays * 8
targetMinutesPerMonth = targetHoursPerMonth * 60

// 4. Process attendance
For each attendance record:
    if (isWeekend && !isHoliday):
        makeupMinutes += duration
    else if (!isHoliday):
        totalMinutesWorked += duration

// 5. Add holiday credits
totalMinutesWorked += (weekdayHolidaysCount * 480)

// 6. Count worked days
For each working day:
    if (hasAttendance):
        attendedDaysCount++
    else if (hasApprovedLeave):
        approvedLeaveDaysCount++
        totalMinutesWorked += 480  // Credit 8 hours
    else:
        absentDaysCount++

// 7. Apply makeup minutes
totalMinutesWorked += makeupMinutes
coveredAbsentDays = min(absentDays, floor(makeupMinutes / 480))
absentDaysCount = max(0, absentDaysCount - coveredAbsentDays)

// 8. Cap at target (no overtime)
if (totalMinutesWorked > targetMinutesPerMonth):
    totalMinutesWorked = targetMinutesPerMonth

// 9. Calculate rate and salary
hourlyRate = baseSalary / targetHoursPerMonth
finalSalary = (totalMinutesWorked / 60) * hourlyRate

// 10. Project if current month
if (isCurrentMonth):
    passedWorkingDays = workingDays.filter(d <= now).length
    passedHolidays = holidays.filter(d <= now).length
    passedTargetDays = passedWorkingDays + passedHolidays
    paceMultiplier = totalMinutesWorked / (passedTargetDays * 480)
    projectedMinutes = paceMultiplier * targetMinutesPerMonth
    if (projectedMinutes > targetMinutesPerMonth):
        projectedMinutes = targetMinutesPerMonth
    projectedSalary = (projectedMinutes / 60) * hourlyRate
```

#### Example Payroll:
```
Base Salary: 50,000
Working Days: 20
Weekday Holidays: 1
Target Days: 21 (20 + 1)
Target Hours: 168 (21 * 8)
Target Minutes: 10,080

Attended: 18 days = 14,400 min
Leave: 2 days = 960 min
Absent: 1 day = 0 min (can be covered by makeup)
Makeup (weekend): 480 min

Total: 14,400 + 960 + 480 = 15,840 min

Hourly Rate: 50,000 / 168 = 297.62
Final Salary: (14,400 / 60) * 297.62 = 71,427.14 (CAPPED at 50,000)
Actually: (10,080 / 60) * 297.62 = 50,000
```

---

### 3. Lead Reclaim Windows

**File:** `/app/api/cron/lead-maintenance/route.ts` (Lines 89-167)

#### Priority-Based Windows:

| Priority | Warn Days | Reclaim Days | Action |
|----------|-----------|--------------|--------|
| High     | 5         | 7            | Warn at 5 days, reclaim at 7 |
| Medium   | 12        | 14           | Warn at 12 days, reclaim at 14 |
| Low      | 19        | 21           | Warn at 19 days, reclaim at 21 |

**Key:** Uses `lastMeaningfulActivityAt` (calls/emails only)

#### Algorithm:
```javascript
for each priority:
    reclaimCutoff = now - reclaimDays
    warnCutoff = now - warnDays
    
    // Find stale leads
    staleLeads = leads where:
        priority == this priority
        status NOT IN [Lost, Won, Converted, Active Client, Open Pool]
        lastMeaningfulActivityAt < reclaimCutoff
        OR (lastMeaningfulActivityAt is null AND lastActivityAt < reclaimCutoff)
    
    // Reclaim all stale leads
    For each staleLeads:
        move to pool: ownerId = null, status = Open Pool
        log reclaim activity
    
    // Warn about upcoming reclaim
    warningLeads = leads where:
        priority == this priority
        status NOT IN [Lost, Won, Converted, Active Client, Open Pool]
        lastMeaningfulActivityAt BETWEEN (reclaimCutoff AND warnCutoff)
        OR (lastMeaningfulActivityAt is null AND lastActivityAt BETWEEN)
        AND no existing warning task exists
    
    For each warningLeads:
        create system task:
            title = "WARNING: Auto-Reclaim in X hours"
            dueDate = now + (reclaimDays - warnDays)
            ownerId = lead owner
```

---

### 4. Reporting Calculations

**File:** `/app/api/admin/reports/sales/route.ts`

#### Lead Aging (Lines 275-318):
```javascript
const now = new Date()
For each lead:
    lastActivity = lead.lastActivityAt || lead.createdAt
    daysOld = differenceInDays(now, lastActivity)
    
    if (daysOld <= 3): category = 'fresh'
    else if (daysOld <= 7): category = 'active'
    else if (daysOld <= 14): category = 'stale'
    else: category = 'atRisk'
```

#### Win Rate (Lines 101, 119):
```javascript
winRate = (closedWon / totalOpportunities) * 100
```

#### Task Completion Rate (Lines 189):
```javascript
taskCompletionRate = (onTimeCompleted / totalCompleted) * 100
```
Where: `onTimeCompleted = completedAt <= dueDate`

#### Stuck Opportunities (Lines 201-204):
```javascript
stuckOpp = stage NOT IN [Closed Won, Closed Lost]
           AND updatedAt > 14 days ago
```

---

## State Machines & Workflows

### 1. Lead Lifecycle

```
CREATE
    ↓
NEW (status)
    ↓ [Call/Email Activity]
    ├→ CALLED (if connected_interested)
    ├→ LOST (if connected_not_interested OR response_not_interested)
    ├→ MAIL SENT (if sent/follow_up)
    ├→ OPEN POOL (if recirculated from auto-reclaim)
    ↓
    [Convert to Opportunity]
    ↓
CONVERTED (status)
    ↓ [Opportunity Workflow]
    ↓
    [Opportunity Wins]
    ↓
ACTIVE CLIENT (status)
```

#### Triggers:

| Event | Condition | New Status | Side Effects |
|-------|-----------|------------|--------------|
| Call Attempt | outcome = connected_interested | Called | lastActivityAt updated |
| Call Attempt | outcome = connected_not_interested | Lost | lastActivityAt updated |
| Mail Attempt | outcome = sent OR follow_up | Mail Sent | lastActivityAt updated |
| Mail Attempt | outcome = response_not_interested | Lost | lastActivityAt updated |
| Manual Convert | User action | Converted | Opportunity created |
| Opp Won | stage = Closed Won | Active Client | XP awarded |
| Auto-Reclaim | 60+ days no activity | Open Pool | previousOwnerId saved |
| Auto-Recirculation | Stale + priority window | Open Pool | previousOwnerId saved |

---

### 2. Opportunity Lifecycle

```
CREATE (from Lead)
    ↓
INITIAL_STAGE (e.g., "Test Job Received", probability 20%)
    ↓ [User updates stage]
    ├→ NEGOTIATING_STAGE
    ├→ CLOSING_STAGE
    ├→ ...
    ↓
CLOSED_WON
    ├→ XP Award: OPPORTUNITY_WON (100 XP)
    ├→ Linked Lead → ACTIVE CLIENT
    ├→ Stage History recorded
    ↓
(END)

OR

CLOSED_LOST
    ↓
(END)

OR

DELETE (Soft Delete)
    ├→ isDeleted = true
    ├→ deletedAt = now
    ├→ deletedBy = userId
    ├→ Linked Lead → LOST
    ↓
(AUDIT_QUEUE)
```

#### Stage Tracking:
- Each stage change creates `StageHistory` record
- Enables pipeline velocity analysis
- Supports opportunity aging reports

---

### 3. Task Lifecycle

```
CREATE (linked to Lead)
    ↓
PENDING (status, completed = false)
    ↓ [User completes]
    ├→ Check if dueDate
    ├→ Award XP: TASK_COMPLETED (10 XP)
    ├→ If completedAt <= dueDate:
    │   └→ Award XP: TASK_ON_TIME_BONUS (5 XP)
    ↓
COMPLETED (status, completed = true, completedAt = now)
    ↓ [Hidden after 7 days]
    ↓
(ARCHIVE)

OR

OVERDUE (status when dueDate < now && completed = false)
    ↓ [User completes or past]
    ↓ (Same as PENDING completion)
```

---

### 4. User Streak Lifecycle

```
NO_ACTIVITY
    ↓
FIRST_ACTIVITY_TODAY (currentStreak = 1)
    ↓ [Next day activity]
    ├→ Check if yesterday was last active
    ├→ If yes: currentStreak++, update longestStreak if needed
    ├→ If no: currentStreak = 1 (reset)
    ↓
(Repeat daily)

STREAK_3+ (Warming Up multiplier 1.1x)
STREAK_7+ (Hot multiplier 1.25x)
STREAK_14+ (On Fire multiplier 1.5x)
STREAK_30+ (Legendary multiplier 2.0x)
```

---

### 5. Gamification & Achievement Progression

```
USER_CREATED
    ↓
LEVEL 1 (0 XP)
    ↓ [Earn XP through actions]
    ├→ Award XP with streak multiplier
    ├→ Update totalXp, level
    ├→ Track action in XPHistory
    ├→ Check achievements
    │   └→ If threshold met: Create UserAchievement
    ↓
LEVEL N (N*100 XP)
    ↓ [Title changes at milestone levels]
    ├→ Level 5+: ⭐ Rising Star
    ├→ Level 10+: 🎯 Closer in Training
    ├→ Level 20+: 🚀 Pipeline Pro
    ├→ Level 30+: 💎 Deal Maker
    ├→ Level 40+: 🌟 Sales Legend
    ├→ Level 50+: 👑 Rainmaker
    ↓
(Infinite progression)
```

---

## Validation Logic

### Input Validation

#### Email Validation
**Pattern:** `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
**Used in:** Bulk lead import
**File:** `/app/api/admin/leads/route.ts` (Line 8)

#### URL Validation (Website)
**Pattern:** `/^https?:\/\/.+/`
**Used in:** Bulk lead import
**File:** `/app/api/admin/leads/route.ts` (Line 9)

#### Required Fields

| Endpoint | Field | Error |
|----------|-------|-------|
| POST /leads | website | "Website is required" |
| POST /leads | name (sanitized) | - |
| POST /tasks | leadId | "leadId is required" |
| POST /tasks | title | "Task title is required" |
| POST /leave | startDate, endDate | "Invalid date format" |
| POST /leave | type | Validated against configured options |

#### Business Logic Validation

| Rule | File | Lines | Error |
|------|------|-------|-------|
| Dedup by website/email | `/api/leads/route.ts` | 116-124 | "Lead already exists" |
| Lead ownership for tasks | `/api/tasks/route.ts` | 113-118 | "Forbidden" |
| Opportunity ownership | `/api/opportunities/[id]/route.ts` | 41-42 | "Forbidden" |
| Claim limit reached | `/api/leads/[id]/claim/route.ts` | 25-28 | "Limit reached" |
| Fresh Eyes rule | `/api/leads/[id]/claim/route.ts` | 39-41 | "Fresh eyes only" |
| Leave date range | `/api/leave/route.ts` | 52-54 | "End before start" |
| Leave type | `/api/leave/route.ts` | 40-43 | "Invalid type" |

### State Validation

#### Opportunity Conversion
- Cannot convert if active opportunity exists
- File: `/api/leads/[id]/convert/route.ts` (Lines 26-31)

#### User Suspension
- Suspended users cannot login
- File: `/api/auth/login/route.ts` (Line 24-25)

#### Owner Assignment
- Cannot assign to Administrator
- Cannot assign to suspended user
- File: `/api/admin/reassign/route.ts` (Lines 45-54)

---

## Data Dependencies & Flow

### Lead → Opportunity → Revenue Flow

```
Lead
├── Created: POST /api/leads
├── Fields: name, company, email, website, priority, industry, contacts
├── Deduped by: website OR email
├── Owner: userId (null = pool)
├── Links:
│   ├── contacts (Contact [])
│   ├── callAttempts (CallAttempt [])
│   ├── mailAttempts (MailAttempt [])
│   ├── tasks (Task [])
│   ├── opportunities (Opportunity [])
│   └── activityLogs (ActivityLog [])
│
├── Status Progression:
│   ├── New → Called/Lost/Mail Sent (via call/email)
│   ├── New → Converted (manual conversion)
│   ├── Converted → Active Client (when opp won)
│   └── Any → Open Pool (auto-recirculation)
│
├── Activity Tracking:
│   ├── callAttempts → Updates: status, lastCallOutcome
│   ├── mailAttempts → Updates: status, lastMailOutcome
│   ├── tasks → Updates: lastActivityAt
│   └── stageHistory (via linked opportunity)
│
└── Auto-Actions:
    ├── Convert: Create Opportunity
    ├── Call_back_later: Create follow-up Task
    ├── Stale: Auto-recirculate to pool
    └── Warning zone: Create warning Task
```

### Task Completion Impact

```
Task.toggle()
├── Checks: ownership
├── Updates:
│   ├── Task: completed, completedAt, status
│   ├── Lead: lastActivityAt (if linked)
│   └── User: xp, level, streak, lastActiveDay
├── Validates: dueDate for on-time bonus
├── XP Awards:
│   ├── TASK_COMPLETED: 10 XP
│   └── TASK_ON_TIME_BONUS: 5 XP (if on time)
├── Checks achievements: Task category
└── Creates: UserAchievement records (if threshold met)
```

### Call Attempt Impact

```
CallAttempt.create()
├── Checks: lead ownership
├── Creates: CallAttempt record
├── Updates Lead:
│   ├── callCount++
│   ├── lastCallOutcome
│   ├── lastActivityAt
│   ├── lastMeaningfulActivityAt
│   └── status (based on outcome)
├── Creates: ActivityLog entry
├── Conditional Task Creation:
│   └── If outcome = call_back_later + valid dueDate
│       └── Create Task with auto-assigned due date
├── Awards XP:
│   └── CALL_ATTEMPT: 15 XP (with streak multiplier)
└── Updates: User level, streak, achievements
```

### Opportunity Won Impact

```
Opportunity.stage = "Closed Won"
├── Checks: ownership/admin
├── Updates Opportunity:
│   ├── stage
│   ├── updatedAt
│   └── Creates: StageHistory
├── Updates Linked Lead:
│   ├── status → "Active Client"
│   └── Creates: ActivityLog for lead
├── Awards XP (ONCE per opportunity):
│   ├── OPPORTUNITY_WON: 100 XP
│   ├── Applied with streak multiplier
│   ├── Stored in: XPHistory with actionType=OPPORTUNITY_WON
│   └── Prevents: Duplicate awards via cooldown check
└── Updates User:
    ├── xp+
    ├── level (if XP crosses threshold)
    ├── streak (if first activity today)
    └── achievements (if threshold met)
```

### Payroll Calculation Dependencies

```
SalaryReport = calculateMonthlySalary(userId, date)
├── Fetches:
│   ├── User: baseSalary
│   ├── AttendanceRecords: for month (punchIn, punchOut, duration)
│   ├── LeaveRequests: Approved leaves for month
│   └── Holidays: for month
├── Calculates:
│   ├── workingDaysCount (exclude weekends + holidays)
│   ├── attendedDaysCount (has attendance record)
│   ├── approvedLeaveDaysCount
│   ├── absentDaysCount
│   ├── totalMinutesWorked (with caps)
│   ├── makeupMinutes (weekend work)
│   ├── hourlyRate = baseSalary / (workingDays * 8)
│   ├── finalSalary (capped at baseSalary)
│   └── projectedSalary (if current month)
├── Applies:
│   ├── Holiday credit: +480 min per weekday holiday
│   ├── Approved leave credit: +480 min per day
│   ├── Makeup coverage: min(absent, makeup/480)
│   └── Overtime cap: max 100% of target salary
└── Returns: SalaryReport with all metrics
```

---

## System Configuration

### Configurable Settings

**Table:** `SystemSetting`
**Type:** Key-value pairs

#### XP Configuration
```
XP_CALL_ATTEMPT: 15 (default)
XP_MAIL_ATTEMPT: 10 (default)
XP_TASK_COMPLETED: 10 (default)
XP_LEAD_CONVERTED: 50 (default)
XP_OPPORTUNITY_WON: 100 (default)
XP_POOL_CLAIM: 5 (default)
XP_LEAD_CREATED: 5 (default)
XP_TASK_CREATED: 3 (default)
```

#### Lead Reclaim Configuration
```
RECYCLE_DAYS: 60 (default) - Days before lost leads recirculate
CLAIM_LIMIT: 50 (default) - Max active pool leads per rep
RECLAIM_HIGH: 7 (default) - Days before high-priority reclaim
WARN_HIGH: 5 (default) - Days before high-priority warning
RECLAIM_MEDIUM: 14 (default) - Days before medium-priority reclaim
WARN_MEDIUM: 12 (default) - Days before medium-priority warning
RECLAIM_LOW: 21 (default) - Days before low-priority reclaim
WARN_LOW: 19 (default) - Days before low-priority warning
```

#### Leave Configuration
```
LEAVE_TYPE: (multi-valued setting)
Example values: Sick, Vacation, Personal, Compassionate
```

### System Options

**Table:** `SystemOption`
**Type:** Categorized dropdown values with ordering

#### LEAD_STATUS (Category)
```
New
Called
Mail Sent
Lost
Won
Converted
Active Client
Open Pool
```

#### OPPORTUNITY_STAGE (Category)
```
Test Job Received (order 1)
Qualification (order 2)
Proposal (order 3)
Negotiation (order 4)
Closing (order 5)
Closed Won (order 6)
Closed Lost (order 7)
```

#### LEAD_POSITION (Category)
```
(User-configurable for contacts)
CEO
CTO
VP Sales
etc.
```

---

## Error Handling

### HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| 400 | Bad request, missing fields | "Website is required" |
| 401 | Not authenticated or suspended | "Unauthorized" |
| 403 | Permission denied or resource conflict | "Forbidden", "Can't reclaim own lead" |
| 404 | Resource not found | "Lead not found" |
| 409 | Conflict (duplicate, already exists) | "Lead already exists", "Already converted" |
| 429 | Rate limited | "Too many requests" |
| 500 | Server error | "Internal Server Error" |

### Rate Limiting

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| Login | 10 attempts | 1 minute | IP |
| Lead creation | 30 | 1 minute | User |
| General API | 1000 | 1 minute | IP |

---

## Integration Points

### External Services

#### Email Service (Resend)
- **Used for:** Mail attempts tracking
- **Integration:** `resendId` stored in MailAttempt
- **Tracking:** `deliveryStatus` field

#### Database
- **Type:** SQLite
- **Provider:** Prisma ORM

### Authentication
- **Method:** JWT tokens
- **Cookie:** httpOnly, secure in production, 7-day expiry
- **Validation:** Checked on every API call

---

## Summary: Key Business Logic Files

| Component | File(s) | Lines | Responsibility |
|-----------|---------|-------|-----------------|
| XP/Gamification | `/lib/gamification.ts` | 390 | Level, streaks, achievements, XP calculation |
| Payroll | `/lib/payroll.ts` | 213 | Salary calculation, attendance-based pay |
| Activity Logging | `/lib/activity.ts` | 63 | Audit trail, notifications |
| Authentication | `/lib/auth.ts` | 97 | JWT, cookies, role checking |
| Leads API | `/api/leads/route.ts` | 161 | CRUD, dedup, creation |
| Lead Claim | `/api/leads/[id]/claim/route.ts` | 75 | Pool claiming, limit enforcement |
| Lead Convert | `/api/leads/[id]/convert/route.ts` | 70 | Lead→Opportunity |
| Calls | `/api/leads/[id]/call-attempt/route.ts` | 128 | Call logging, status changes |
| Emails | `/api/leads/[id]/mail-attempt/route.ts` | 100 | Mail logging, status changes |
| Opportunities | `/api/opportunities/route.ts` | 81 | Opportunity CRUD |
| Opp Update | `/api/opportunities/[id]/route.ts` | 158 | Stage changes, lead updates, XP |
| Tasks | `/api/tasks/route.ts` | 149 | Task CRUD, completion tracking |
| Task Toggle | `/api/tasks/[id]/toggle/route.ts` | 49 | Completion, on-time bonus |
| Attendance | `/api/attendance/punch/route.ts` | 35 | Clock in/out, duration |
| Leave | `/api/leave/route.ts` | 69 | Leave request, type validation |
| Admin Payroll | `/api/admin/payroll/route.ts` | 33 | Batch salary calculation |
| Lead Reclaim Cron | `/api/cron/lead-maintenance/route.ts` | 183 | Auto-recirculation, warnings |
| Bulk Reassign | `/api/admin/reassign/route.ts` | 69 | Lead reassignment, validation |
| Bulk Import | `/api/admin/leads/route.ts` | 151 | Lead import, dedup check |
| Admin Dashboard | `/api/admin/dashboard/route.ts` | 151 | Admin overview, alerts, trends |
| Sales Reports | `/api/admin/reports/sales/route.ts` | 454 | Comprehensive rep analytics |
| Leaderboard | `/api/leaderboard/route.ts` | 140 | Period-aware ranking |

---

## Conclusion

The CFM platform implements a sophisticated CRM with integrated gamification and HR management:

1. **Sales Pipeline:** Leads are tracked from creation through pool management, claiming, conversion, and closure
2. **Activity Engagement:** Every sales action (call, email, task) is tracked, logged, and rewarded
3. **Gamification:** XP system with streaks, levels, titles, and achievements drives engagement
4. **Automated Lifecycle:** Cron jobs automatically recirculate stale leads, issue warnings, and manage pool flow
5. **Team Management:** Roles, goals, leave, and attendance are managed centrally
6. **Fair Compensation:** Payroll calculated based on actual worked hours with no overtime

All business logic is centralized in `/lib` utilities and API routes, with comprehensive validation and state management throughout.

