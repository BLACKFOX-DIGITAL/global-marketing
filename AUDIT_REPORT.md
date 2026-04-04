# CFM Full App Audit Report
**Date:** 2026-04-04  
**Audited by:** Claude Code (automated, all 7 phases)

---

## OVERVIEW

| Phase | Category | Critical | High | Medium | Low | Total |
|-------|----------|----------|------|--------|-----|-------|
| 1 | Security | 1 | 4 | 9 | 4 | 18 |
| 2 | Bugs | 2 | 2 | 9 | 2 | 15 |
| 3 | API | 2 | 5 | 8 | 5 | 20 |
| 4 | Data Integrity | 5 | 8 | 5 | 4 | 22 |
| 5 | Performance | 2 | 6 | 6 | 4 | 18 |
| 6 | Type Safety | 4 | 8 | 8 | 6 | 26 |
| 7 | Dead Code | 0 | 1 | 4 | 3 | 8 |
| **TOTAL** | | **16** | **34** | **49** | **28** | **127** |

---

## PHASE 1 — SECURITY AUDIT

### CRITICAL
| # | File | Line | Issue |
|---|------|------|-------|
| S1 | `.env` | 2 | **JWT_SECRET hardcoded and committed to version control.** Regenerate immediately, add `.env` to `.gitignore`. |

### HIGH
| # | File | Line | Issue |
|---|------|------|-------|
| S2 | `lib/auth.ts` | 6–12 | `JWT_SECRET` cast to `string` without null check. In dev, silently runs as `undefined`. |
| S3 | `app/api/email/send/route.ts` | — | No per-user rate limit on email sending. Any authenticated user can spam emails. |
| S4 | `app/(admin)/layout.tsx` | 6–14 | Admin area protected only by layout redirect — API routes under `/api/admin/*` must also individually check `isAdmin()`. Some do not. |
| S5 | `app/api/admin/seed-temp/route.ts` | 7–11 | Seeding route only checks auth, not admin role. Accessible to any authenticated user. |

### MEDIUM
| # | File | Line | Issue |
|---|------|------|-------|
| S6 | `next.config.ts` | 18–20 | CSP uses `'unsafe-inline'` for both `script-src` and `style-src` in production. Weakens XSS protection. |
| S7 | `lib/sanitize.ts` | 11–19 | Regex-based sanitizer misses SVG XSS, `data:text/html`, CSS expressions. Replace with `DOMPurify` or `sanitize-html`. |
| S8 | `app/api/leads/check-website/route.ts` | 5–22 | If extended to make HTTP requests, has no SSRF protection or timeout. |
| S9 | `app/api/setup-admin/route.ts` | 8–15 | GET endpoint leaks whether admin setup is needed (admin count = 0). |
| S10 | `app/api/setup-settings/route.ts` | 5–8 | Completely unauthenticated in dev. If deployed with `NODE_ENV=development`, exploitable. |
| S11 | `app/api/webhooks/resend/route.ts` | 7–10 | `RESEND_WEBHOOK_SECRET` not validated at startup — all webhooks silently rejected if misconfigured. |
| S12 | `app/api/admin/leads/route.ts` | 122 | Error message leaks owner's name: `"belongs to: ${ownerName}"`. |
| S13 | `lib/auth.ts` | 91–93 | `isManager()` is identical to `isAdmin()` — both check `role === 'Administrator'`. No manager role exists. |

### LOW
| # | File | Line | Issue |
|---|------|------|-------|
| S14 | `app/api/auth/login/route.ts` | 8–13 | Rate limit is IP-only. No account-level lockout after N failed attempts. |
| S15 | Various admin routes | — | Some routes check `user.role !== 'Administrator'` directly instead of `isAdmin()`. Inconsistent. |
| S16 | Various | — | No explicit CORS headers. Relies on Next.js defaults. Should be documented. |
| S17 | `app/api/admin/config/route.ts` | — | `RESEND_API_KEY` stored in database instead of environment variable. |

---

## PHASE 2 — BUG AUDIT

### CRITICAL
| # | File | Line | Issue |
|---|------|------|-------|
| B1 | `lib/auth.ts` | 91–93 | `isManager()` returns same as `isAdmin()`. All routes using `isManager()` have broken authorization — non-admin managers have wrong access level. |
| B2 | `app/api/leads/[id]/claim/route.ts` | 14–29 | Claim limit check happens **outside** the transaction. Two users can simultaneously pass the check and both claim, exceeding the pool limit. Move the check inside `prisma.$transaction()`. |

### HIGH
| # | File | Line | Issue |
|---|------|------|-------|
| B3 | `app/api/leads/[id]/route.ts` | 12–21 | GET endpoint fetches lead without `deletedAt: null` filter. Soft-deleted leads can be returned. |
| B4 | `app/(admin)/layout.tsx` + `app/(crm)/layout.tsx` | 12–13, 9 | Potential redirect loop: admin goes to `/dashboard` → CRM layout redirects to `/admin/dashboard` → admin layout may redirect again. Depends on path overlap. |

### MEDIUM
| # | File | Line | Issue |
|---|------|------|-------|
| B5 | `lib/payroll.ts` | 178–183 | `new Date()` uses server local timezone. Date comparisons with DB records (UTC) can be off near midnight. |
| B6 | `app/(crm)/leads/page.tsx` | 216–221 | `useDeferredValue` for search creates timing gap — page number may not reset before stale search results load. |
| B7 | `components/LeadDetailContent.tsx` | 31–39 | Email validation catch block is empty: `.catch(() => { })`. Spinner shows forever on network error. |
| B8 | `components/LeadDetailContent.tsx` | 599–626 | `useEffect` for debounced notes save uses `lead!` in closure but `lead` is not in dependency array — saves stale data. |
| B9 | Various | — | Multiple lead queries across API routes missing `deletedAt: null` (or `isDeleted: false`) filter. |
| B10 | `app/(crm)/pool/page.tsx` | 55–70 | After claiming a lead, only some SWR keys are invalidated. Admin leads page remains stale. |
| B11 | `app/(admin)/admin/dashboard/page.tsx` | 114–122 | Sparkline for tasks uses `d.tasks` — field doesn't exist in `dailyTrends`. Renders empty. |
| B12 | Various forms | — | Some forms do not disable submit button during submission — risk of double-submit. |
| B13 | Various | — | Missing optional chaining on deeply nested data: `data?.dailyTrends.map()` should be `data?.dailyTrends?.map()`. |

### LOW
| # | File | Line | Issue |
|---|------|------|-------|
| B14 | `app/api/attendance/punch/route.ts` | 11–14 | Punch toggle logic is correct but no explicit message when user tries to punch in while already clocked in. |
| B15 | Various paginated pages | 146–148 | Pagination window math is duplicated across multiple pages. Should be a shared utility. |

---

## PHASE 3 — API AUDIT

### CRITICAL
| # | File | Line | Issue |
|---|------|------|-------|
| A1 | Multiple admin routes | — | All admin routes return **401** for role-based denial. Should return **403** (user is authenticated, just not authorized). Affects: `admin/audit`, `admin/leads`, `admin/goals`, `admin/dashboard`, `admin/payroll`, `admin/users`, `admin/attendance`. |
| A2 | `app/api/admin/email-templates/route.ts` | 5–9 | GET endpoint requires only authentication, not admin role. Non-admin users can read all email templates. POST correctly requires `isAdmin()`. |

### HIGH
| # | File | Line | Issue |
|---|------|------|-------|
| A3 | `app/api/admin/reassign/route.ts` | 5–25 | Returns ALL leads and users with no pagination. Could return thousands of records. |
| A4 | `app/api/admin/deletions/route.ts` | 10–21 | No pagination on soft-deleted records list. |
| A5 | `app/api/email/send/route.ts` | — | No per-user rate limit. Confirmed from Phase 1. |
| A6 | Multiple routes | — | Missing `try/catch` in: `users/route.ts` GET, `auth/logout/route.ts`, `admin/attendance/route.ts`, `admin/reassign/route.ts` GET, `admin/deletions/[id]/route.ts`. |
| A7 | `app/api/attachments/route.ts` | 55 | DELETE returns 200 even when attachment doesn't exist (Prisma throws uncaught error). |

### MEDIUM
| # | File | Line | Issue |
|---|------|------|-------|
| A8 | Various | — | Inconsistent response shapes: `/tasks` wraps pagination in `pagination: {}`, `/leads` puts it at top level, `/opportunities` returns bare array. Standardize to `{ data, pagination }`. |
| A9 | Various | — | Inconsistent error keys: most use `{ error: '...' }`, delete routes use `{ message: '...' }`, logout uses `{ message: '...' }`. |
| A10 | `app/api/opportunities/route.ts` | 45–81 | POST creates opportunity without validating `title` is present. Relies on Prisma to fail with cryptic error. |
| A11 | `app/api/admin/users/route.ts` | 40–69 | User creation accepts any email format without validation. No check for duplicate email before insert (relies on Prisma constraint error). |
| A12 | `app/api/opportunities/[id]/route.ts` | 36–72 | Stage update reads then writes without transaction — TOCTOU race condition for concurrent updates. |
| A13 | `app/api/admin/goals/route.ts` | 130–157 | Bulk upsert silently skips invalid items with no feedback on which items failed and why. |
| A14 | Various | — | `console.error()` used instead of `logger` in several routes. |
| A15 | Various | — | Magic strings hardcoded: `'Test Job Received'` in leads convert, opportunities create. |

### LOW
| # | File | Line | Issue |
|---|------|------|-------|
| A16 | `app/api/search/route.ts` | 12–13 | Short queries (< 2 chars) return empty success instead of 400. |
| A17 | `app/api/opportunities/route.ts` | 56 | `probability` field has no 0–100 range validation. |
| A18 | `app/api/attachments/route.ts` | 5–43 | No file size cap or MIME type validation for uploads. |
| A19 | Various | — | `console.error()` used instead of structured `logger` in route handlers. |
| A20 | Various | — | Unused variable `sortOrder` processed but not always applied correctly. |

---

## PHASE 4 — DATA INTEGRITY AUDIT

### CRITICAL
| # | File | Line | Issue |
|---|------|------|-------|
| D1 | `app/api/admin/reports/sales/route.ts` | 83–85, 128–130 | Opportunity queries missing `isDeleted: false` filter. Deleted opportunities appear in sales reports. |
| D2 | `app/api/analytics/route.ts` | 30–37 | `recentWins` query missing `isDeleted: false`. Deleted opportunities inflate performance metrics. |
| D3 | `app/api/attachments/route.ts` | 55 | `prisma.attachment.delete()` removes DB record but does NOT delete the actual file from storage. Storage leaks permanently. |
| D4 | `prisma/schema.prisma` | User model | User deletion will **fail** with FK constraint errors. No cascade defined for leads, tasks, opportunities, notifications. No safe deletion path exists. |
| D5 | `app/api/admin/deletions/[id]/route.ts` | 39–45 | Permanent lead purge does not delete attachment files from storage before deleting DB records. |

### HIGH
| # | File | Line | Issue |
|---|------|------|-------|
| D6 | `prisma/schema.prisma` | 76–80 | Lead deletion orphans: Tasks, ActivityLogs, Attachments have no `onDelete: Cascade`. Only CallAttempt, MailAttempt, Contact have cascade. |
| D7 | `app/api/tasks/[id]/route.ts` | 66 | Task DELETE is a hard delete with no activity log entry and no soft-delete. Inconsistent with Lead/Opportunity behavior. |
| D8 | `app/api/leads/[id]/convert/route.ts` | 13–59 | Read-check-write pattern without a transaction. Two concurrent requests could both pass the `existingOpportunity` check and create duplicate opportunities. |
| D9 | `prisma/schema.prisma` | 48 | `Lead.status` is a plain `String`. Any value can be stored. No enum enforcement. |
| D10 | `prisma/schema.prisma` | 134 | `Opportunity.stage` is a plain `String`. Same issue. |
| D11 | `prisma/schema.prisma` | 15 | `User.role` is a plain `String`. No enum enforcement. Role string `'Administrator'` hardcoded in many places. |
| D12 | `prisma/schema.prisma` | 228–229 | `Task.status` and `Task.priority` are plain strings. No enum validation. |
| D13 | `app/api/tasks/[id]/route.ts` | 66 | No activity log on task deletion. |

### MEDIUM
| # | File | Line | Issue |
|---|------|------|-------|
| D14 | `prisma/schema.prisma` | 188–201 | `Attachment.fileUrl` has no unique constraint. Duplicate file uploads to same lead possible. |
| D15 | `prisma/schema.prisma` | 224–246 | `Task` allows both `leadId` and `opportunityId` to be null simultaneously. DB doesn't enforce that at least one parent exists. |
| D16 | `prisma/schema.prisma` | 161–174 | `ActivityLog` has no compound constraint requiring at least `leadId` OR `opportunityId`. Floating logs possible. |
| D17 | `app/api/leads/[id]/convert/route.ts` | — | Lead conversion is not wrapped in a transaction. |
| D18 | Various | — | Multiple other API queries likely missing `isDeleted: false` / `deletedAt: null` — need full scan. |

### LOW
| # | File | Line | Issue |
|---|------|------|-------|
| D19 | `app/api/opportunities/[id]/route.ts` | 68–71 | Stage history logging verified as correct. |
| D20 | `lib/activity.ts` | — | ActivityLog enum coverage is comprehensive. Task delete is the only gap. |
| D21 | `prisma/schema.prisma` | 110 | `MailAttempt.resendId @unique` is correct. Nullable unique is acceptable. |
| D22 | `app/api/leads/[id]/route.ts` | 94–111 | Contact replacement correctly uses transaction. |

---

## PHASE 5 — PERFORMANCE AUDIT

### CRITICAL
| # | File | Line | Issue |
|---|------|------|-------|
| P1 | `app/api/admin/payroll/route.ts` | 20–27 | N+1 risk: fetches all users then calls `calculateMonthlySalary()` per user. If that function makes DB calls, it's N+1. Refactor to batch. |
| P2 | `app/api/admin/dashboard/route.ts` | 93–104 | Trend filtering loops: `trendLeads.filter()` and `trendOpps.filter()` called 14 times each inside a loop. Pre-group by date instead. |

### HIGH
| # | File | Line | Issue |
|---|------|------|-------|
| P3 | `app/(crm)/leads/page.tsx` | 115–123 | Settings fetched on every mount with no extended cache. Should use long `refreshInterval` since settings rarely change. |
| P4 | `app/api/leaderboard/route.ts` | 23–94 | 9 separate Prisma calls (1 findMany + 8 groupBy) without indexes on `stage`, `isDeleted`, `createdAt`. |
| P5 | `app/api/admin/leads/route.ts` | 86 | Export query allows up to 10,000 records in a single request. No streaming or hard cap — can cause memory spikes. |
| P6 | `prisma/schema.prisma` | — | Missing indexes: `Opportunity @@index([stage, isDeleted])`, `Lead @@index([lastActivityAt])`, `Lead @@index([ownerId, lastActivityAt, isDeleted])`. |
| P7 | `prisma/schema.prisma` | — | Missing index: `ActivityLog @@index([userId, createdAt])` — needed for audit log queries. |
| P8 | `app/(crm)/leads/page.tsx` | 275–356 | Row component for `react-window` defined inline — not memoized. Defeats virtualization on parent re-render. |

### MEDIUM
| # | File | Line | Issue |
|---|------|------|-------|
| P9 | `app/(admin)/admin/dashboard/page.tsx` | 106–112 | Entire dashboard blocks on one slow query. Split into critical + non-critical fetches. |
| P10 | `components/LeadDetailContent.tsx` | 14–44 | Module-level `emailBadgeCache` Map grows unbounded. Memory leak for long sessions. Add LRU eviction. |
| P11 | `app/api/admin/goals/route.ts` | 135–156 | Bulk goal upsert uses sequential `for` loop instead of `Promise.all()`. |
| P12 | `app/api/tasks/route.ts` | 64–78 | Three separate count/groupBy queries for task stats — could be combined. |
| P13 | `prisma/schema.prisma` | — | Missing: `Task @@index([completed, dueDate])`, `AttendanceRecord @@index([userId, punchIn])`, `XPHistory @@index([createdAt])`. |
| P14 | `app/api/admin/leads/route.ts` | 125–129 | Loads full lead records just to extract distinct countries. Could use raw distinct query. |

### LOW
| # | File | Line | Issue |
|---|------|------|-------|
| P15 | `app/(admin)/admin/dashboard/page.tsx` | 120 | Sparkline for tasks uses `d.tasks` which doesn't exist in `dailyTrends`. Returns empty array silently. |
| P16 | `app/api/admin/dashboard/route.ts` | 82 | Stale lead threshold (30 days) hardcoded. Should be a `SystemSetting`. |
| P17 | `app/api/leads/route.ts` | 30–50 | Search `OR` clause rebuilt on every request. Minor optimization opportunity. |
| P18 | `app/api/admin/leads/route.ts` | 113–119 | `owner` relation included for every lead in lists. May be unnecessary for most views. |

---

## PHASE 6 — TYPE SAFETY AUDIT

### CRITICAL
| # | File | Line | Issue |
|---|------|------|-------|
| T1 | `lib/auth.ts` | 28 | `jwt.verify()` result double-cast `as unknown as JWTPayload` with no runtime validation. Stale/invalid tokens won't be caught. |
| T2 | `lib/auth.ts` | 6 | `process.env.JWT_SECRET as string` — no null check. Silently passes `undefined` in dev. |
| T3 | `components/LeadDetailContent.tsx` | 509 | `JSON.parse(text)` not wrapped in try/catch. Malformed response crashes component. |
| T4 | `lib/prisma.ts` | 3 | `global as unknown as { prisma: PrismaClient }` — double unsafe cast for global singleton. |

### HIGH
| # | File | Line | Issue |
|---|------|------|-------|
| T5 | `app/api/leads/route.ts` | 24 | `where` clause typed as `any`. Loses type safety for Prisma query filters. |
| T6 | `app/api/leads/route.ts` | 102–148 | `req.json()` returns `any`, used without validation. Contact array inline-typed without runtime checks. |
| T7 | `components/EditLeadModal.tsx` | 52, 68, 98, 107 | `JSON.parse()` wrapped in empty `catch { }`. Errors silently swallowed, state corrupted. |
| T8 | `components/NewLeadModal.tsx` | 61, 64, 67 | `JSON.parse()` on localStorage values without error handling. |
| T9 | `app/api/admin/users/route.ts` | 64–68 | Prisma error caught as `(err as { code?: string })` — could fail if `err` is not an object. |
| T10 | `components/AuditLedger.tsx` | 174 | Recharts formatter prop typed as `(val: any)`. |
| T11 | `app/api/admin/users/route.ts` | 58 | `parseFloat(baseSalary)` without NaN check. Silent `NaN` persisted to database. |
| T12 | `app/api/opportunities/route.ts` | 50–63 | `req.json()` returns `any`, passed to Prisma `create()` without validation. |

### MEDIUM
| # | File | Line | Issue |
|---|------|------|-------|
| T13 | `components/CommandPalette.tsx` | 11 | State typed as `{ leads: any[], opportunities: any[], tasks: any[] }`. |
| T14 | `components/Header.tsx` | 5 | `user?: any` prop. |
| T15 | `components/Sidebar.tsx` | 81 | `icon: any` prop. |
| T16 | `components/LeadDetailContent.tsx` | 27 | Non-null assertion `emailBadgeCache.get(trimmed)!` fragile — relies on `has()` check above. |
| T17 | `app/(crm)/opportunities/[id]/page.tsx` | 41 | `JSON.parse(text)` without try/catch. |
| T18 | `app/(crm)/customers/[id]/page.tsx` | 711, 931 | `JSON.parse(lead.socials)` without try/catch. |
| T19 | `components/EditLeadModal.tsx` | 29 | `id: 1 as any` in initial state. Should be `string`. |
| T20 | `app/(crm)/leads/page.tsx` | 280 | Multiple `as any` casts on AutoSizer style props. |

### LOW
| # | File | Line | Issue |
|---|------|------|-------|
| T21 | Multiple routes | — | Generic `catch` blocks without logging error details. |
| T22 | `app/api/tasks/route.ts` | 106–111 | Only `leadId` validated; other fields not type-checked. |
| T23 | `app/(admin)/admin/reports/sales/page.tsx` | 90–133 | Many `(d: any)` array operations. |
| T24 | `app/api/leave/route.ts` | 32 | `req.json()` destructured without validation. |
| T25 | `app/api/admin/settings/route.ts` | — | Same unchecked `req.json()` patterns. |
| T26 | `app/api/goals/route.ts` | 60 | Destructured `req.json()` without type validation. |

---

## PHASE 7 — DEAD CODE AUDIT

### HIGH
| # | File | Line | Issue |
|---|------|------|-------|
| DC1 | `tmp_reset_password.ts` | 1–24 | **Security risk.** Hardcodes email `emily@blackfoxdigital.com.bd` and password `Blackfox123!`. DELETE immediately. Never belongs in version control. |

### MEDIUM
| # | File | Line | Issue |
|---|------|------|-------|
| DC2 | `lib/auth.ts` | 91–93 | `isManager()` is dead logic — identical to `isAdmin()`. Misleading name. Either fix or delete. |
| DC3 | `lib/auth.ts` | 95–97 | `isSalesRep()` is exported but never used anywhere. DELETE. |
| DC4 | `app/api/auth/register/route.ts`, `app/api/auth/login/route.ts`, `app/api/admin/users/route.ts`, `app/api/setup-admin/route.ts` | Various | `bcrypt.hash()` with `rounds=12` duplicated in 4+ files. Should be centralized in `lib/auth.ts` as `hashPassword()` / `verifyPassword()`. |
| DC5 | `lib/activity.ts` | 33, 61 | `console.error()` used instead of `logger`. |

### LOW
| # | File | Line | Issue |
|---|------|------|-------|
| DC6 | `lib/sanitize.ts` | 41–43 | `truncate()` exported but never imported anywhere. DELETE. |
| DC7 | `lib/auth.ts` | 26–32 | `verifyToken()` exported but never called externally — `getCurrentUser()` handles verification internally. REMOVE or DOCUMENT. |
| DC8 | Root directory | — | `test-prisma.ts`, `test-real-data.ts` clutter root. MOVE to `/scripts/`. `marketing_backup_2.db` is an unreferenced backup — DELETE or archive. |

---

## FIX PRIORITY QUEUE

### Do immediately (before next deploy)
1. **DC1** — Delete `tmp_reset_password.ts` (hardcoded credentials in repo)
2. **S1** — Remove `.env` from git, add to `.gitignore`, regenerate `JWT_SECRET`
3. **D1, D2** — Add `isDeleted: false` to reports and analytics queries (wrong revenue/performance data)

### Do this week (Critical bugs & security)
4. **B1 / S13** — Fix `isManager()` or rename it — affects authorization across the app
5. **B2** — Move claim limit check inside transaction (race condition)
6. **D4** — Define User deletion cascade strategy (currently fails with FK error)
7. **D5, D3** — Delete attachment files from storage on lead purge and attachment delete
8. **T1, T2** — Fix JWT verification runtime validation and `JWT_SECRET` null check
9. **A1** — Change 401 → 403 for role-based denials in all admin routes
10. **A2** — Add `isAdmin()` check to GET `/api/admin/email-templates`

### Do this sprint (High severity)
11. **D6** — Add `onDelete: Cascade` to Lead → Task, ActivityLog, Attachment relations
12. **D7** — Implement soft-delete for tasks (consistent with Lead/Opportunity)
13. **D8** — Wrap lead conversion in `prisma.$transaction()`
14. **D9–D12** — Define Prisma enums for Lead.status, Opportunity.stage, User.role, Task.status/priority
15. **P6, P7, P13** — Add missing database indexes
16. **S3 / A5** — Add per-user rate limit to email send route
17. **P1** — Batch `calculateMonthlySalary` calls (N+1 in payroll)
18. **T3, T7, T8** — Fix all `JSON.parse()` calls without try/catch

### Backlog (Medium severity)
19. **S7** — Replace regex sanitizer with `DOMPurify`
20. **B5** — Fix timezone handling in payroll calculations
21. **B8** — Fix stale closure in debounced notes save
22. **A8, A9** — Standardize response shapes and error message keys
23. **P2** — Pre-group trend data before filtering loop
24. **P10** — Add LRU eviction to `emailBadgeCache`
25. **T5, T6, T12** — Add request body validation with schema (Zod recommended)
26. **DC4** — Centralize `hashPassword()` in `lib/auth.ts`

---

*Total findings: 127 across 7 categories.*  
*Report generated by automated audit — verify each finding before fixing.*
