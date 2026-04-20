# Security Implementation Report
### Antigravity CRM — Web Application Security

---

## 1. Introduction

Security is a fundamental concern in any web-based Customer Relationship Management (CRM) system, given the sensitive nature of customer data, employee records, and business intelligence it contains. This report outlines the security measures implemented in the Antigravity CRM application, a full-stack Next.js web application. The system serves two distinct user roles — Administrator and Sales Representative — and exposes a REST API consumed by the frontend. The security architecture addresses authentication, authorization, data integrity, transport security, and abuse prevention.

---

## 2. Authentication

### 2.1 JSON Web Tokens (JWT)

The application employs a stateless authentication mechanism based on JSON Web Tokens (JWT), implemented using the `jsonwebtoken` library. Upon successful login, the server signs a token containing the user's ID, email, and role using a secret key (`JWT_SECRET`) sourced from environment variables. Tokens are configured with a seven-day expiration window to balance usability with security.

### 2.2 Secure Cookie Storage

Rather than storing tokens in browser `localStorage` — which is vulnerable to Cross-Site Scripting (XSS) attacks — the JWT is stored in an **httpOnly** cookie. This flag prevents JavaScript from accessing the cookie entirely. Additionally, the `SameSite=lax` attribute is applied to mitigate Cross-Site Request Forgery (CSRF) attacks by restricting cross-origin cookie transmission. In production environments, the `Secure` flag is enforced to ensure the cookie is only transmitted over HTTPS.

### 2.3 Live Token Validation

On every authenticated request, the server not only verifies the JWT signature but also queries the database to confirm the user account still exists and is in an active state. This ensures that suspended or deleted users are rejected immediately, even if their token has not yet expired — closing a common gap in purely stateless JWT implementations.

### 2.4 Password Security

User passwords are hashed using **bcryptjs** with a cost factor (salt rounds) of 12, which is above the commonly recommended minimum of 10. This makes brute-force and rainbow table attacks computationally expensive. The application enforces a password policy at registration and change: a minimum length of eight characters, with at least one uppercase letter, one lowercase letter, and one numeric digit. Passwords are never returned in any API response — they are explicitly stripped before data is serialised and sent to the client.

---

## 3. Authorisation

### 3.1 Role-Based Access Control (RBAC)

The system implements a two-tier role-based access control model. Every API route begins by calling a `getCurrentUser()` helper, which validates the session and returns the authenticated user object. If no valid session is found, the server responds with HTTP 401 (Unauthorised). If the user's role does not meet the route's requirement, the server responds with HTTP 403 (Forbidden). Helper functions `isAdmin()` and `isManager()` abstract role-checking logic and are applied consistently across more than thirty API endpoints.

### 3.2 Data Isolation for Sales Representatives

Sales Representative accounts operate under strict data isolation. API queries are scoped to the authenticated user's own records — they cannot access leads, attendance logs, or performance data belonging to other representatives. This is enforced at the database query level, not merely the UI level, preventing horizontal privilege escalation.

### 3.3 Cron Job Authentication

Scheduled background tasks (cron jobs) are protected with a separate Bearer token (`CRON_SECRET`), distinct from user JWTs. This prevents unauthorised triggering of server-side automation endpoints.

---

## 4. Input Validation and Sanitisation

### 4.1 Custom Sanitisation Library

A dedicated sanitisation module (`lib/sanitize.ts`) is applied to user-supplied input before it is persisted to the database. The sanitiser strips HTML tags, `<script>` blocks, inline event handlers (e.g., `onload`, `onclick`), and `javascript:` URI schemes. This provides defence-in-depth against stored Cross-Site Scripting (XSS) attacks, complementing the browser-level protections provided by security headers.

### 4.2 Input Validation

All authentication endpoints validate the format and content of submitted fields: email addresses are checked against a standard format, passwords are validated against the policy rules, and user roles are checked against an allowlist of valid values. Invalid input is rejected with a descriptive error response before any database interaction occurs.

### 4.3 Pagination Limits

All list endpoints enforce a maximum page size of 100 records per request. This prevents denial-of-service scenarios where an authenticated user could request excessively large data dumps, protecting both database and server resources.

---

## 5. Rate Limiting

A custom in-memory rate limiting module (`lib/rateLimit.ts`) is applied to the login endpoint to mitigate brute-force credential attacks. A maximum of ten login attempts per IP address per minute is enforced. Requests exceeding this threshold are rejected with HTTP 429 (Too Many Requests). The client's IP address is extracted with awareness of reverse proxy headers (`X-Forwarded-For`), ensuring accurate attribution in load-balanced and proxied environments. The in-memory store is cleaned up every five minutes to prevent unbounded memory growth.

---

## 6. HTTP Security Headers

The application sets a comprehensive suite of HTTP security headers via the Next.js configuration (`next.config.ts`), applied globally to all responses:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframe embedding |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS for one year across all subdomains |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter for older browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage on cross-origin requests |
| `Permissions-Policy` | camera, microphone, geolocation disabled | Disables unnecessary browser APIs |
| `Content-Security-Policy` | Strict `default-src`, `script-src`, `frame-ancestors 'none'` | Restricts resource loading origins |

---

## 7. Environment and Secrets Management

Sensitive configuration values — including `JWT_SECRET`, `DATABASE_URL`, and `CRON_SECRET` — are managed exclusively through environment variables and are never hardcoded in source code. The application validates the presence of required secrets at startup and will refuse to run if they are absent. In production, cookie security is tightened automatically based on the `NODE_ENV` value.

---

## 8. Known Limitations and Future Considerations

While the implemented measures provide a robust security baseline, the following areas represent opportunities for further hardening:

- **CSRF Protection:** The application relies on `SameSite` cookies rather than explicit CSRF tokens. While this is generally sufficient for same-origin SPAs, explicit token-based CSRF protection would add an additional layer of defence.
- **Two-Factor Authentication (2FA):** No multi-factor authentication is currently implemented. Adding TOTP-based 2FA would significantly reduce the risk of account compromise via stolen credentials.
- **Token Rotation:** The system uses a single long-lived JWT with no refresh token rotation. Implementing short-lived access tokens with rotating refresh tokens would reduce the window of exposure in the event of token theft.
- **Audit Logging:** Currently, there is no dedicated audit trail for sensitive administrative actions (e.g., user creation, salary edits). An immutable audit log would improve accountability and forensic capability.

---

## 9. Conclusion

The Antigravity CRM applies a layered security approach — often referred to as "defence in depth" — combining secure authentication, granular authorisation, input sanitisation, rate limiting, and a strong HTTP security header policy. The architecture follows established best practices for web application security, aligned with OWASP guidelines. The identified gaps are low-risk in the current operational context but should be addressed as the application scales toward a broader user base or handles more sensitive data.
