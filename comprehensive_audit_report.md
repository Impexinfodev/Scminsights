# SCM Insights — Comprehensive Audit Report
**Audit Date:** 2026-03-13
**Auditor Role:** Principal Software Auditor
**Scope:** Full codebase — Backend (Flask/Python) + Frontend (Next.js/React)
**Based on:** architecture_context.md + direct source file review

---

## DIMENSION 1 — SECURITY

---

### SEC-01 · CRITICAL · A01 Broken Access Control — Payment Verify Endpoint: User Can Activate Any License Type
**File:** `Backend/controllers/payment_controller.py` — Line 173
**Issue:**
```python
license_type = (data.get("license_type") or data.get("LicenseType") or "").strip()
```
The `verify_payment` endpoint accepts `license_type` from the **client POST body** with no server-side validation that it matches the `license_type` stored in the `PaymentTransaction` row for that `order_id`. An authenticated user who obtains a valid `order_id` for a cheap plan can submit a POST body claiming a premium `license_type` at verification time — the backend will assign the premium license after signature verification passes.

**Why it is a problem:**
A user could pay for a low-cost plan, then modify the `license_type` field in the POST body at `/api/payment/verify` to claim an expensive plan (e.g., pay for DIRECTORY at ₹4,999, submit `license_type=BUNDLE` worth more). Revenue fraud with zero cryptographic barrier — the HMAC signature only covers the order/payment IDs, not the license type.

**Severity:** CRITICAL
**Category:** Security — A01 Broken Access Control / Business Logic Fraud

---

### SEC-02 · CRITICAL · A01 Broken Access Control — Admin Delete User Has No Self-Deletion Guard
**File:** `Backend/controllers/admin_controller.py` — Lines 178–188
**Issue:**
```python
@admin_bp.route("/user", methods=["DELETE"])
@require_auth
@require_admin
def delete_user():
    user_id = request.args.get("EmailId", "").strip()
    ...
    admin_repo.delete_user(user_id)
```
There is no check preventing an admin from deleting their own account. Contrast this with the role-update endpoint (line 164) which explicitly blocks self-modification. If an admin deletes themselves, the admin panel becomes inaccessible without direct DB intervention.

**Why it is a problem:**
Accidental self-deletion by the only admin locks the system permanently. Combined with the potential for a compromised admin account or confused deputy, this is a data integrity risk.

**Severity:** CRITICAL
**Category:** Security — A01 Broken Access Control

---

### SEC-03 · HIGH · A07 Auth Failures — Session Token Not Invalidated Across All Clients on Password Reset
**File:** `Backend/controllers/auth_controller.py` — Lines 169–190; `Backend/modules/repositories/User/postgres_user_repository.py` — Lines 258–270
**Issue:**
`reset_password` calls `user_repo.update_password()` and `user_repo.delete_reset_token()` but does **not** call `delete_session()` or purge all active sessions from the `Session` table for that user. Sessions are keyed by `(UserId, ClientId)` — only a single session per client_id is maintained, but nothing clears existing sessions on password change.

**Why it is a problem:**
If a user's account is compromised and the attacker creates a session, the user resets their password but the attacker's session token remains valid for up to 1 hour post-reset. OWASP mandates session invalidation on credential change.

**Severity:** HIGH
**Category:** Security — A07 Authentication Failures

---

### SEC-04 · HIGH · A07 Auth Failures — No Account Lockout After Failed Login Attempts
**File:** `Backend/controllers/auth_controller.py` — Lines 16–60
**Issue:**
The login endpoint is rate-limited to 10/minute, but there is no **account lockout** after N failed password attempts. The rate limit is per-IP (flask-limiter default), not per-email. An attacker using distributed IPs can perform a slow-rate credential stuffing attack against any specific account with no per-account lockout.

**Why it is a problem:**
Credential stuffing attacks are the primary vector for account takeover. Rate limiting 10/min per-IP does not protect accounts from distributed brute-force across multiple IPs, VPNs, or proxy rotation.

**Severity:** HIGH
**Category:** Security — A07 Authentication Failures / A04 Insecure Design

---

### SEC-05 · HIGH · A02 Cryptographic Failures — Activation and Reset Tokens Are UUIDs (Insufficient Entropy for Security Tokens)
**File:** `Backend/modules/repositories/User/postgres_user_repository.py` — Lines 166, 264
**Issue:**
```python
activation_code = str(uuid.uuid4())  # line 166
reset_token = str(uuid.uuid4())       # line 264
```
`uuid.uuid4()` uses Python's `random` module or OS random, but the resulting tokens are 128-bit UUIDs. While uuid4 uses `os.urandom()` in CPython ≥3.x, the token format is predictable in structure (version bits, variant bits) and may be enumerable by an attacker with DB read access or timing-based oracle. Industry standard is `secrets.token_urlsafe(32)` (256-bit cryptographically secure).

**Why it is a problem:**
If an attacker can enumerate or predict token patterns, they can activate accounts without clicking email links or reset passwords for victim accounts. Low individual probability but zero defense in depth.

**Severity:** HIGH
**Category:** Security — A02 Cryptographic Failures

---

### SEC-06 · HIGH · A05 Security Misconfiguration — CORS Origins Empty When `CORS_ORIGINS` Env Var Not Set
**File:** `Backend/config.py` — Lines 86–88
```python
CORS_ORIGINS = get_env_list("CORS_ORIGINS", )
```
**Issue:**
`get_env_list` with no default value returns `[]` if `CORS_ORIGINS` is not set. In `app.py` line 68, `origins: CORS_ORIGINS` is passed to flask-cors. When `CORS_ORIGINS` is an empty list, flask-cors may behave unexpectedly — it could disable CORS entirely (blocking frontend) or in some versions default to `*` (allowing all origins). The CSRF check at line 130 (`if origin and origin in CORS_ORIGINS`) would always fail, blocking all POST requests.

**Why it is a problem:**
Missing env var in deployment silently breaks all authenticated API calls or exposes the API to all origins depending on flask-cors version behavior. No startup validation fails on this.

**Severity:** HIGH
**Category:** Security — A05 Security Misconfiguration

---

### SEC-07 · HIGH · A03 Injection — SQL Built with f-string Interpolation in User Repository
**File:** `Backend/modules/repositories/User/postgres_user_repository.py` — Line 321
```python
cursor.execute(f"UPDATE UserProfile SET {', '.join(fields)} WHERE UserId = %s", values)
```
**Issue:**
The `fields` list is built from hardcoded strings (`"Name = %s"`, `"CompanyName = %s"`, etc.) via if-conditions — so in this specific function, the SQL fragments are not user-controlled. However, the pattern of f-string SQL construction is dangerous: any future contributor adding a field from user input will introduce SQL injection without realizing the existing pattern is already unsafe by convention.

**Note:** In `trade_repository.py` lines 127, 133, 143, 154, the `{where}` clause and `{order_col}` are interpolated via f-string — `where` is built from hardcoded conditions but `order_col` is derived from `_sort_col_sql()` which whitelists values (safe). However this pattern is one variable rename away from injection.

**Why it is a problem:**
F-string SQL construction is an anti-pattern that creates high injection risk for future modifications. Even if currently safe, code reviewers and new contributors will replicate the pattern with user inputs.

**Severity:** HIGH
**Category:** Security — A03 Injection

---

### SEC-08 · HIGH · A09 Logging Failures — Activation URL (Containing Token) Logged to Console/File
**File:** `Backend/controllers/auth_controller.py` — Line 64 (app.py CORS log), implicitly via werkzeug
**Issue:**
More critically, in `email_service.py` line 42:
```python
logger.error("[EmailService] Failed to send email: %s", e)
```
The SMTP exception `e` may contain the email body in some SMTP library error messages, which includes the full `activation_url` containing the security token. Additionally, werkzeug in DEBUG mode logs full request bodies which may include tokens sent via POST body.

**File:** `Backend/services/email_service.py` — Line 42
Additionally, in `app.py` line 64:
```python
logger.info("CORS Origins: %s", CORS_ORIGINS)
```
The config includes no sanitization of logged values. If CORS_ORIGINS were to contain a secret (misconfiguration), it would be logged at INFO level.

**Why it is a problem:**
Security tokens in log files extend the attack surface. Log files are often less protected than the application database.

**Severity:** HIGH
**Category:** Security — A09 Logging Failures

---

### SEC-09 · HIGH · XSS — Admin Contact Reply Body Rendered as Unescaped HTML in Email
**File:** `Backend/services/email_service.py` — Line 121
```python
{body.replace(chr(10), "<br>") if body else ""}
```
**Issue:**
The admin-supplied `body` from `POST /api/admin/contacts/<id>/reply` is embedded directly into an HTML email template without any HTML escaping. An admin can inject arbitrary HTML/JavaScript into the email sent to the contact form submitter.

**Why it is a problem:**
While the attacker must be an authenticated admin, this enables stored XSS in outbound emails. A compromised admin account can send phishing HTML emails to users from the platform's own email address (admin@impexinfo.com), massively undermining user trust and potentially violating CAN-SPAM/email laws.

**Severity:** HIGH
**Category:** Security — XSS / A03 Injection

---

### SEC-10 · HIGH · A05 Security Misconfiguration — CSP `unsafe-inline` in Production
**File:** `Frontend/next.config.ts` — Lines 23–25 (inferred from agent summary, line numbers approximate)
**Issue:**
Content-Security-Policy in production sets `script-src: 'self' 'unsafe-inline'` to accommodate Razorpay's embedded checkout script. `unsafe-inline` disables the primary XSS protection that CSP provides.

**Why it is a problem:**
`unsafe-inline` in `script-src` completely bypasses CSP's XSS protection. Any stored or reflected XSS vulnerability (even minor) can execute arbitrary JavaScript. A nonce-based or hash-based approach would allow Razorpay while keeping protection.

**Severity:** HIGH
**Category:** Security — A05 Security Misconfiguration

---

### SEC-11 · HIGH · A04 Insecure Design — Payment Webhook Accepts Any `license_type` from `PaymentTransaction` Row Without Expiry/Idempotency Check
**File:** `Backend/controllers/payment_controller.py` — Lines 244–257
**Issue:**
The webhook handler assigns a license by reading `txn["LicenseType"]` from the transaction row (good), but there is no check that the transaction's `CreatedAt` is recent. A replayed Razorpay webhook event for an old `order_id` (if one exists in DB with status != "captured") would re-assign the license. Combined with manual DB manipulation of status back to "created", a replay would re-extend a license indefinitely.

**Why it is a problem:**
Webhook replay attacks are a known Razorpay attack vector. While the HMAC verification prevents signature forgery, there is no timestamp validation window on the webhook body (Razorpay includes `created_at` in the event payload which is ignored here).

**Severity:** HIGH
**Category:** Security — A04 Insecure Design / A08 Integrity Failures

---

### SEC-12 · MEDIUM · A05 Security Misconfiguration — `FLASK_DEBUG` Guard Is Weak; Debug Mode Exposes Interactive Debugger
**File:** `Backend/app.py` — Lines 202–203
```python
if debug_mode:
    app.run(debug=True, host=host, port=port)
```
**Issue:**
`debug_mode` is derived from `flask_env == "development"` (line 194) ignoring the `FLASK_DEBUG` env var. Werkzeug's interactive debugger when `debug=True` allows **arbitrary Python code execution** via the browser debug console if `DEBUGGER_PIN` is weak or disabled.

**Why it is a problem:**
If the FLASK_ENV is accidentally set to "development" in production (misconfig), the interactive debugger becomes publicly accessible, enabling full RCE on the server.

**Severity:** MEDIUM
**Category:** Security — A05 Security Misconfiguration

---

### SEC-13 · MEDIUM · A04 Insecure Design — Password Reset Token in URL Query Parameter (Email Links)
**File:** `Backend/controllers/auth_controller.py` — Line 162; `Backend/controllers/auth_controller.py` — Line 145
```python
reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
activation_url = f"{FRONTEND_URL}/account-activate?token={activation_code}"
```
**Issue:**
Security-sensitive tokens are embedded as URL query parameters in emailed links. URLs with query strings appear in:
- Browser history
- Server-side access logs (referrer headers when navigating away)
- Email server access logs
- Analytics/tracking pixels that may be embedded in email clients
- Proxy/CDN logs

**Why it is a problem:**
Token leakage via referrer or log access allows account takeover without interacting with the email. The comment in the code acknowledges this (line 116) but still sends tokens in URLs.

**Severity:** MEDIUM
**Category:** Security — A04 Insecure Design

---

### SEC-14 · MEDIUM · A01 Broken Access Control — `user_id` Used as Both Primary Key and Email Address
**File:** `Backend/controllers/auth_controller.py` — Line 96; `Backend/modules/repositories/User/postgres_user_repository.py` — Line 151
```python
"user_id": email,   # user_id IS the email
```
**Issue:**
`UserId` in `UserProfile` is set equal to the user's email address. Admin endpoints accept `EmailId` param and pass it as `user_id`. This conflation means:
- Password change leaks nothing additionally (email-as-id is visible)
- But a user who changes their email (if such a feature is added later) would break their own identity
- More critically: the `user_id` is exposed in the JWT/session response at login (line 44: `"user_id": user_id`) — it reveals the user's email directly in API responses

**Why it is a problem:**
Using PII (email) as the primary key and exposing it as `user_id` in API responses violates data minimization principles (DPDP Act §3) and makes the key immutable. Any code that receives `user_id` now also receives the user's email.

**Severity:** MEDIUM
**Category:** Security — A01 / Privacy / DPDP Act Compliance

---

### SEC-15 · MEDIUM · A09 Logging — Request-Level Logging Has No Correlation ID
**File:** `Backend/app.py` — All logging throughout
**Issue:**
No request correlation/trace ID is injected into log messages. Log entries from concurrent requests interleave without any way to trace a single request's lifecycle (auth → controller → repository → response).

**Why it is a problem:**
In production incident investigation, it is impossible to reconstruct the exact sequence of operations for a given user's failing request when multiple concurrent requests are logged simultaneously.

**Severity:** MEDIUM
**Category:** Security — A09 Logging Failures / Observability

---

### SEC-16 · MEDIUM · A06 Vulnerable Components — Razorpay Dependency Version Unpinned
**File:** `Backend/requirements.txt`
**Issue:**
`requirements.txt` does not use pinned exact versions (e.g., `razorpay==1.3.0`). Unpinned dependencies mean `pip install` in a fresh deployment may pull a newer version with breaking changes or a patched (silently) security issue.

**Why it is a problem:**
Supply chain attacks (A06) target unpinned package versions. A compromised PyPI package for `razorpay` or `bcrypt` with a minor version bump would be automatically installed.

**Severity:** MEDIUM
**Category:** Security — A06 Vulnerable Components

---

### SEC-17 · LOW · A08 Integrity Failures — No `Subresource-Integrity` (SRI) on Razorpay Script
**File:** `Frontend/next.config.ts` — CSP config
**Issue:**
Razorpay checkout script (`https://checkout.razorpay.com/v1/checkout.js`) is loaded via CSP allowlist but without SRI hashes. If Razorpay's CDN is compromised, the modified script executes with full trust in the payment flow.

**Severity:** LOW
**Category:** Security — A08 Integrity Failures

---

### SEC-18 · LOW · Sensitive Data in Login Response (Country List)
**File:** `Backend/controllers/auth_controller.py` — Line 48
```python
"countries": COUNTRY_NAMES,
```
**Issue:**
The login response includes the full `COUNTRY_NAMES` list (200+ entries). This is a large static payload (~5–10KB) sent on every login. While not a security vulnerability per se, it leaks the shape of internal data structures and unnecessarily inflates auth response payloads.

**Severity:** LOW
**Category:** Security — Information Disclosure

---

## DIMENSION 2 — ARCHITECTURE & PERFORMANCE

---

### ARCH-01 · HIGH · N+1 Query Pattern — `get_user_with_license_check` Calls `get_user_by_id` Which Opens a New Connection
**File:** `Backend/modules/repositories/User/postgres_user_repository.py` — Lines 134–136
```python
@with_connection(commit=True)
def get_user_with_license_check(self, cursor, user_id):
    return self.get_user_by_id(user_id)  # opens ANOTHER connection from pool
```
**Issue:**
`get_user_with_license_check` is decorated with `@with_connection` (opens a DB connection), but immediately calls `self.get_user_by_id(user_id)` — which is also decorated with `@with_connection` (opens a SECOND DB connection from pool). This is a nested connection pattern that wastes pool connections and bypasses the outer cursor.

**Why it is a problem:**
Under load, login requests consume 2 pool connections each (min_size=1, max_size=10 on the user pool). With 5 concurrent logins, all 10 pool connections are consumed, causing connection pool exhaustion and request queuing.

**Severity:** HIGH
**Category:** Architecture — N+1 / Connection Pool Exhaustion

---

### ARCH-02 · HIGH · HS Code Endpoint Loads Entire Dataset Into Python Memory on Every Request
**File:** `Backend/controllers/user_controller.py` — Lines 152–193
**Issue:**
```python
gst_codes = get_gst_hsn_codes()  # loads full dataset
items = []
for code, obj in gst_codes.items():
    items.append({...})
# Then filters, sorts, and paginates in Python
```
Every call to `/hscodes-descriptions` loads the **entire** HS code dataset into a Python list, applies filtering/sorting in memory, then returns a paginated slice. This happens per-request with no caching.

**Why it is a problem:**
If `get_gst_hsn_codes()` returns tens of thousands of records, each API call allocates large amounts of heap memory, runs O(n) iteration, and holds memory until GC. Under moderate load this causes GC pressure, high response latency, and potential OOM. No caching between requests exists.

**Severity:** HIGH
**Category:** Performance — Missing Caching / O(n) per request

---

### ARCH-03 · HIGH · Two Separate Connection Pools for Same Database
**File:** `Backend/repositories/trade_repository.py` — Lines 33–47 (`_pool` global); `Backend/modules/repositories/User/postgres_user_repository.py` — Lines 87–92 (pool in constructor)
**Issue:**
The trade repository maintains its own global `_pool` (min=1, max=10). The user and admin repositories each create their own `ConnectionPool` via the constructor. All three pools connect to the same PostgreSQL database. Total maximum connections: 30+ from a single app instance.

**Why it is a problem:**
PostgreSQL has a global connection limit (default 100). With 3 pools of 10 connections each, a single app instance consumes 30 connections. Multiple app instances behind a load balancer will exhaust the DB connection limit. PgBouncer or a single shared pool is the standard pattern.

**Severity:** HIGH
**Category:** Architecture — Connection Pool Design

---

### ARCH-04 · MEDIUM · Export Endpoints Load Up to 10,000 Rows Into Memory
**File:** `Backend/controllers/admin_controller.py` — Lines 73–78 and 561–569
```python
users, _ = admin_repo.get_all_users(..., page=1, page_size=10000, ...)
rows, _ = admin_repo.get_transactions(..., page=1, page_size=10000, ...)
```
**Issue:**
CSV export endpoints hard-cap at 10,000 rows loaded entirely into a Python `io.StringIO` buffer in memory before streaming the response.

**Why it is a problem:**
At scale, exporting 10,000 users or transactions consumes significant memory. The response is not streamed — the full buffer is built before sending. This blocks the response thread and risks OOM under concurrent export requests.

**Severity:** MEDIUM
**Category:** Performance — Unbounded Memory / Missing Streaming

---

### ARCH-05 · MEDIUM · Trade Repository Statement Timeout Only on `get_top_traders`
**File:** `Backend/repositories/trade_repository.py` — Line 124
```python
cur.execute("SET statement_timeout = 15000")  # only in get_top_traders
```
**Issue:**
`get_summary_stats` (line 215) and `get_available_years` (line 191) run against `trade_company_report` (potentially massive table) with **no statement timeout**. A slow query or table lock can hang indefinitely.

**Why it is a problem:**
A single long-running summary stats query can hold a DB connection from the pool indefinitely, causing pool exhaustion for other requests.

**Severity:** MEDIUM
**Category:** Reliability — Missing Timeout

---

### ARCH-06 · MEDIUM · No Caching on Repeated Expensive Queries (License Info, Plans)
**File:** `Backend/controllers/user_controller.py` — Line 96 (`get_license_by_user_id` on every authenticated request); `Backend/controllers/public_controller.py` (plans endpoint)
**Issue:**
License info is fetched from DB on every request to every authenticated endpoint (login, profile, license info, trade, directory). Plans list is fetched from DB on every `/api/plans` request. Neither is cached.

**Why it is a problem:**
License info changes rarely (only on payment). Fetching it on every request adds a DB round-trip to every authenticated API call. Without Redis or in-memory caching, this scales linearly with request volume.

**Severity:** MEDIUM
**Category:** Performance — Missing Caching

---

### ARCH-07 · MEDIUM · `create_user` Deletes Then Re-Inserts (Non-Atomic Race Condition)
**File:** `Backend/modules/repositories/User/postgres_user_repository.py` — Lines 139–165
```python
cursor.execute("DELETE FROM UserProfile WHERE UserId = %s", (user_data["user_id"],))
cursor.execute("INSERT INTO UserProfile ...", (...))
```
**Issue:**
The signup flow first DELETEs any existing `UserProfile` row with the same `user_id` (which equals email), then INSERTs a new row. While this runs in a single DB transaction (because `@with_connection(commit=True)` wraps both), there is a race condition window where two simultaneous signup requests for the same email could both pass the `user_exists` check (line 92 of auth_controller.py), then race to DELETE+INSERT, with the second DELETE wiping the first user's activation token.

**Why it is a problem:**
Two concurrent signups with the same email result in only one activation token surviving — the other user never receives a valid activation link. The `user_exists` check and the `create_user` call are not atomic (no DB-level unique constraint enforcement at application layer).

**Severity:** MEDIUM
**Category:** Architecture — Race Condition

---

### ARCH-08 · LOW · Startup Runs `apply_payment_transaction_alters()` on Every Request in create-order
**File:** `Backend/controllers/payment_controller.py` — Line 133
```python
admin_repo.apply_payment_transaction_alters()
admin_repo.insert_payment_transaction(...)
```
**Issue:**
`apply_payment_transaction_alters()` (ALTER TABLE DDL statements) is called inside the payment create-order request handler, not just at startup. This runs schema migration SQL on every payment creation.

**Why it is a problem:**
DDL statements (`ALTER TABLE IF NOT EXISTS ADD COLUMN`) acquire table locks in PostgreSQL. While `IF NOT EXISTS` makes them no-ops after first run, they still acquire and release locks on every payment order creation, adding unnecessary latency and lock contention.

**Severity:** LOW
**Category:** Architecture — DDL in Hot Path

---

## DIMENSION 3 — RELIABILITY & RESILIENCE

---

### REL-01 · HIGH · Email Sending Is Synchronous and Blocks the Request Thread
**File:** `Backend/services/email_service.py` — Lines 34–39; called from `auth_controller.py` lines 107, 146, 163
**Issue:**
```python
with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
    server.starttls()
    server.login(...)
    server.sendmail(...)
```
Email is sent synchronously in the request handler. Gmail SMTP introduces network latency (50–500ms) on every signup, activation resend, and password reset. There is no timeout set on the SMTP connection.

**Why it is a problem:**
If Gmail SMTP is slow or unavailable, the user's HTTP request hangs for the TCP timeout duration (OS default: 75+ seconds). This blocks a Flask worker thread for the entire duration, degrading throughput under load. No async queue, no timeout.

**Severity:** HIGH
**Category:** Reliability — Synchronous Blocking I/O / Missing Timeout

---

### REL-02 · HIGH · No Retry Logic on Razorpay API Calls
**File:** `Backend/services/payment_service.py` — `create_order()` method
**Issue:**
Razorpay order creation is a single HTTP call with no retry logic. If Razorpay returns a transient 5xx or network timeout, the error immediately propagates to the user as a 503.

**Why it is a problem:**
Transient payment gateway errors cause immediate checkout failures for users. A simple exponential backoff retry (2–3 attempts) would recover from transient failures without impacting UX.

**Severity:** HIGH
**Category:** Reliability — No Retry Logic

---

### REL-03 · HIGH · No SMTP Connection Timeout — Potential for Request Hanging Indefinitely
**File:** `Backend/services/email_service.py` — Line 34
```python
with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
```
**Issue:**
`smtplib.SMTP()` is called without a `timeout` parameter. Python's default is to use the OS socket timeout, which can be minutes. Combined with REL-01, a single stuck SMTP connection can hang a Flask worker indefinitely.

**Severity:** HIGH
**Category:** Reliability — Missing Timeout

---

### REL-04 · MEDIUM · No Graceful Shutdown Handling
**File:** `Backend/app.py` — Lines 192–210
**Issue:**
The application has no `SIGTERM`/`SIGINT` signal handler to gracefully drain in-flight requests and close DB connection pools before shutdown. `psycopg_pool.ConnectionPool` connections are dropped abruptly.

**Why it is a problem:**
In containerized/cloud environments (Kubernetes, EC2 Auto Scaling), pods/instances are terminated with SIGTERM. Abrupt shutdown leaves in-flight payment transactions in an inconsistent state and leaves PostgreSQL connections orphaned (server-side until TCP timeout).

**Severity:** MEDIUM
**Category:** Reliability — Missing Graceful Shutdown

---

### REL-05 · MEDIUM · No Circuit Breaker on External Services (Razorpay, SMTP)
**File:** `Backend/services/payment_service.py`, `Backend/services/email_service.py`
**Issue:**
No circuit breaker pattern. If Razorpay is down for 10 minutes, every payment attempt creates a hanging request that ties up Flask workers for the full timeout duration, potentially DoS-ing the application for all users.

**Severity:** MEDIUM
**Category:** Reliability — No Circuit Breaker

---

### REL-06 · MEDIUM · Cleanup Job (`cleanup_expired_data.py`) Has No Health Check Integration
**File:** `Backend/tools/cleanup_expired_data.py` (referenced, not read)
**Issue:**
Account deletions scheduled 30 days out (DPDP §12) are executed by a weekly cleanup job. If this job fails silently (cron job not running, script error), accounts scheduled for deletion are never deleted — violating the DPDP erasure timeline.

**Why it is a problem:**
Regulatory non-compliance: DPDP Act §12 requires timely erasure. Silent cleanup failures leave PII in the database past the agreed deletion date, creating legal exposure.

**Severity:** MEDIUM
**Category:** Reliability / Compliance — DPDP Act §12

---

## DIMENSION 4 — MULTI-TENANCY & DATA ISOLATION

**This is a single-tenant SaaS application.** All users share the same database schema with no tenant isolation layer. The system is designed for a single operator (Aashita Technosoft) serving multiple end users. Multi-tenancy isolation checks do not apply.

However, the following user-isolation finding is noted:

### MT-01 · HIGH · Plan Enforcement Is Client-Side Enforceable — HS Code Pagination Cap Bypassable
**File:** `Backend/controllers/user_controller.py` — Lines 156–159
```python
page_size = min(page_size, 200)
if hscode_access == "limited":
    page_size = min(page_size, max(1, hscode_rows_per_search))
```
**Issue:**
The HS code endpoint caps `page_size` for "limited" plan users but returns `total` count unrestricted — a limited user can discover the total dataset size. More critically, a user with a "limited" plan who makes multiple paginated requests can exhaust all rows by iterating pages. There is no session-level or daily row-count enforcement — only per-request page_size capping.

**Why it is a problem:**
A TRIAL plan user can retrieve the entire HS code dataset by making multiple requests with small page sizes (e.g., 500 requests × 5 rows = full dataset). The rate limit (200/min global) is the only throttle, and it's per-IP.

**Severity:** HIGH
**Category:** Architecture — Business Logic / Plan Enforcement

---

## DIMENSION 5 — CODE QUALITY

---

### CQ-01 · MEDIUM · `get_user_with_license_check` Is a No-Op Wrapper
**File:** `Backend/modules/repositories/User/postgres_user_repository.py` — Lines 134–136
```python
@with_connection(commit=True)
def get_user_with_license_check(self, cursor, user_id):
    return self.get_user_by_id(user_id)
```
**Issue:**
This function does nothing different from `get_user_by_id`. It opens a DB connection (`commit=True`), ignores the `cursor`, and calls another DB method. It is called in `auth_controller.py` line 38 during login.

**Why it is a problem:**
Dead logic in a security-sensitive code path (login) that wastes a DB connection and misleads contributors into thinking license validation occurs here. Violates single responsibility.

**Severity:** MEDIUM
**Category:** Code Quality — Dead Code / Misleading Abstraction

---

### CQ-02 · MEDIUM · Magic Strings for License Access Levels Used Throughout Codebase
**File:** `Backend/modules/repositories/User/postgres_user_repository.py` — Lines 29, 47, 55, 63, 70; `Backend/controllers/user_controller.py` — Line 142; `Backend/controllers/sims_data_controller.py`
**Issue:**
Access levels `"full"`, `"limited"`, `"none"`, `"custom"` are hardcoded strings repeated across 5+ files. License types `"TRIAL"`, `"USER"`, `"ADMIN"` are similarly scattered.

**Why it is a problem:**
A typo in any one occurrence silently grants or denies access. No central definition means adding a new access level requires finding all occurrences manually.

**Severity:** MEDIUM
**Category:** Code Quality — Magic Strings / DRY Violation

---

### CQ-03 · MEDIUM · `update_license` Calls `create_license` (Upsert Pattern Hidden)
**File:** `Backend/controllers/admin_controller.py` — Lines 365–382
```python
@admin_bp.route("/license", methods=["PUT"])
def update_license():
    ...
    admin_repo.create_license(license_type, payload)  # calls CREATE, not UPDATE
```
**Issue:**
The PUT endpoint for license update calls `admin_repo.create_license()`. The name implies creation semantics. The actual repo method likely does an UPSERT, but the naming mismatch makes the code hard to reason about and audit.

**Severity:** MEDIUM
**Category:** Code Quality — Misleading Naming / Hidden Semantics

---

### CQ-04 · MEDIUM · `_normalize_license_payload` and `_normalize_license_for_api` Are Parallel Normalizers with Inconsistent Keys
**File:** `Backend/controllers/admin_controller.py` — Lines 306–341; `Backend/modules/repositories/User/postgres_user_repository.py` — Lines 22–78
**Issue:**
Two separate normalization functions for license data exist — one in the admin controller (for writing) and one in the user repository (for reading). They use different key names and have overlapping but divergent logic.

**Why it is a problem:**
Data shape inconsistency between what is stored and what is served. A change to the storage format in one normalizer may not be reflected in the read normalizer, causing silent data shape mismatches in API responses.

**Severity:** MEDIUM
**Category:** Code Quality — DRY Violation / Parallel Logic

---

### CQ-05 · LOW · Functions Exceeding 50 Lines

| File | Function | Approximate Lines |
|---|---|---|
| `Backend/modules/repositories/User/postgres_user_repository.py` | `_normalize_license_for_api` | ~78 lines (1–78) |
| `Backend/controllers/user_controller.py` | `get_hscodes_descriptions` | ~80 lines (125–205) |
| `Backend/controllers/admin_controller.py` | `_normalize_license_payload` | ~36 lines (306–341) |
| `Backend/controllers/admin_controller.py` | `update_payment_gateway_config` | ~45 lines (616–661) |
| `Backend/services/email_service.py` | `send_activation_email` | ~38 lines (45–83) |

**Severity:** LOW
**Category:** Code Quality

---

### CQ-06 · LOW · `get_contacts` in Admin Controller Uses `int()` Without Try/Except
**File:** `Backend/controllers/admin_controller.py` — Lines 403–404
```python
page = max(1, int(request.args.get("page", 1)))
page_size = max(1, min(100, int(request.args.get("page_size", 50))))
```
**Issue:**
`int()` on query params will raise `ValueError` if a non-integer string is passed (e.g., `?page=abc`). Contrast with `get_transactions` at line 498 which uses `type=int` (Flask's safe coercion). This inconsistency means `/api/admin/contacts?page=abc` returns a 500 Internal Server Error instead of a 400.

**Severity:** LOW
**Category:** Code Quality — Inconsistent Input Validation

---

### CQ-07 · LOW · `resend_activation` Reveals Whether an Email Exists in the System
**File:** `Backend/controllers/auth_controller.py` — Lines 139–143
```python
user = user_repo.get_user_by_email(email)
if not user:
    return jsonify({"error": "User not found. Please sign up first."}), 404
```
**Issue:**
The resend-activation endpoint explicitly returns 404 with "User not found" for unregistered emails. This is a user enumeration vulnerability — an attacker can enumerate registered emails by calling this endpoint.

**Note:** `forgot_password` (line 160) correctly uses a constant-time response regardless of email existence. `resend_activation` does not follow the same pattern.

**Severity:** LOW (though related to privacy)
**Category:** Code Quality / Security — User Enumeration

---

## DIMENSION 6 — OBSERVABILITY & LOGGING

---

### OBS-01 · HIGH · No Audit Log for Critical Admin Actions
**File:** `Backend/controllers/admin_controller.py` — delete_user (line 181), update_user_role (line 150), assign_license (line 466), clear_test_transactions (line 531), update_payment_gateway_config (line 616)
**Issue:**
Destructive and sensitive admin actions (user deletion, role changes, license assignment, payment config changes) have no structured audit log. Only `clear_test_transactions` logs a count (line 540). None log WHO performed the action (admin's user_id) or WHAT changed (before/after state).

**Why it is a problem:**
In a financial platform, admin audit trails are mandatory for:
- Incident investigation (who deleted a paying user?)
- Regulatory compliance (payment processor audits)
- Insider threat detection

**Severity:** HIGH
**Category:** Observability — Missing Audit Log

---

### OBS-02 · HIGH · No Audit Log for Payment Events
**File:** `Backend/controllers/payment_controller.py` — All payment endpoints
**Issue:**
Payment creation, verification, webhook processing, and license assignment are logged only at `logger.error` level on failure, and `logger.info` on webhook success (line 255). There is no structured audit trail of all payment events with user_id, amount, license_type, timestamp.

**Why it is a problem:**
Without a structured payment audit log, reconciling payments with Razorpay dashboard is manual. Failed payment investigations require reading raw log files. GST compliance requires payment records to be traceable.

**Severity:** HIGH
**Category:** Observability — Missing Payment Audit Log

---

### OBS-03 · MEDIUM · Errors Logged Only with Type Name, Not Full Traceback
**File:** `Backend/controllers/user_controller.py` — Lines 51, 86, 108 (pattern repeated throughout)
```python
logger.error("get_profile failed: %s", type(e).__name__, exc_info=False)
```
**Issue:**
`exc_info=False` suppresses the stack trace. Only the exception type name is logged. This pattern appears in 10+ locations across controllers.

**Why it is a problem:**
When `get_profile failed: OperationalError` appears in logs, there is no stack trace to identify which DB query failed, which line threw the exception, or why. Debugging requires reproducing the issue.

**Severity:** MEDIUM
**Category:** Observability — Insufficient Error Context

---

### OBS-04 · MEDIUM · No Structured JSON Logging
**File:** `Backend/app.py` — Lines 19–21
```python
fmt = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s", ...)
```
**Issue:**
Plain text log format. In cloud environments (CloudWatch, Stackdriver, Datadog), JSON-structured logs enable filtering, querying, and alerting on specific fields (user_id, status_code, duration_ms).

**Severity:** MEDIUM
**Category:** Observability — Log Format

---

### OBS-05 · LOW · No Request Timing / Duration Logging
**File:** `Backend/app.py` — `after_request` hooks
**Issue:**
No `after_request` hook logs request duration. Slow requests are invisible without APM tooling.

**Severity:** LOW
**Category:** Observability

---

## DIMENSION 7 — FRONTEND & UX

---

### FE-01 · MEDIUM · Auth State Stored in `localStorage` — XSS Risk
**File:** `Frontend/lib/store/authSlice.ts` — Lines 47–77
**Issue:**
Session token and full user data are stored in `localStorage` (not `sessionStorage` or httponly cookies). `localStorage` is accessible to any JavaScript on the page, including third-party scripts. The backend also sets httponly cookies — so the token exists in both places, but the Redux/localStorage path is the primary path used for headers in API calls.

**Why it is a problem:**
Any XSS vulnerability (including via a compromised npm dependency) can steal the `session_token` from localStorage. HttpOnly cookies are immune to JavaScript access. The dual storage approach means XSS stealing localStorage compromises the session completely.

**Severity:** MEDIUM
**Category:** Frontend Security — XSS / A02

---

### FE-02 · MEDIUM · No Server-Side Route Protection — Protection Is Entirely Client-Side
**File:** `Frontend/hooks/useUser.ts` (entire file); No `Frontend/middleware.ts` found
**Issue:**
Route protection for authenticated pages (`/profile`, `/checkout`, `/admin/*`) is implemented entirely via `useUser()` React hook (client-side redirect after page loads). There is no `middleware.ts` performing server-side redirect before the page renders.

**Why it is a problem:**
Server components render before client JavaScript runs. Protected page content (admin layout, user data shapes) is visible in the initial HTML response before the client-side redirect fires. Search engine crawlers and HTTP clients receive the page skeleton of "protected" pages.

**Severity:** MEDIUM
**Category:** Frontend — Security / Architecture

---

### FE-03 · MEDIUM · Invoice PDF Generated In-Browser — No Server-Side Record
**File:** `Frontend/app/profile/page.tsx` — Lines 45–179 (inferred from agent summary)
**Issue:**
GST tax invoices are generated client-side using browser print/PDF APIs. There is no server-generated, signed PDF stored on the backend or S3. The invoice number (used for GST purposes) is generated/formatted client-side.

**Why it is a problem:**
- GST compliance: Tax invoices must be reproducible from server records. Client-generated PDFs can be tampered with by the user (print the page, modify DOM, print again).
- Audit trail: No server-side record of issued invoices exists.
- User support: If user loses the PDF, there is no way to re-issue the invoice from the server.

**Severity:** MEDIUM
**Category:** Frontend — Compliance / Architecture

---

### FE-04 · LOW · `useUser` Hook Flicker — Page Content Visible Before Redirect
**File:** `Frontend/hooks/useUser.ts`
**Issue:**
Between page load and the `useUser` hook completing session validation + redirect, the protected page renders briefly with empty/default state. This causes a visible "flash" of the authenticated layout before redirecting unauthenticated users to `/login`.

**Severity:** LOW
**Category:** Frontend UX

---

### FE-05 · LOW · Admin Role Check Is Client-Side String Comparison
**File:** `Frontend/app/admin/page.tsx` — Line 74 (approximate)
```typescript
isAdmin = user?.user_details?.Role === "ADMIN"
```
**Issue:**
Admin access on the frontend is determined by checking the `Role` field stored in Redux state (originally from login response). Backend correctly enforces `@require_admin` on all admin API endpoints — so this is defense-in-depth, but the client-side role is trusted from localStorage which could be tampered with in DevTools.

**Why it is a problem:**
localStorage tampering allows non-admin users to see the admin UI shell (though backend calls will fail with 403). This could reveal admin UI structure to unauthorized users.

**Severity:** LOW
**Category:** Frontend — Security (Defense in Depth Gap)

---

## DIMENSION 8 — INTERNATIONALIZATION (i18n)

### i18n-01 · MEDIUM · All User-Facing Strings Hardcoded in English
**Issue:** No i18n framework (i18next, react-intl, next-intl) present. All UI strings are hardcoded English. Given the target market is India (DPDP Act, GST, Indian phone codes), Indian regional languages (Hindi, Tamil, etc.) are not supported.

**Severity:** MEDIUM
**Category:** i18n

### i18n-02 · LOW · Currency Formatting
**File:** `Frontend/lib/currency.ts`
**Issue:** Custom currency formatting utility exists but it is unclear if it uses the `Intl.NumberFormat` API. If using manual string formatting, it may not correctly handle Indian number formatting (lakh/crore system) or locale-specific separators.

**Severity:** LOW
**Category:** i18n

### i18n-03 · LOW · No RTL Support
**Issue:** No RTL CSS or layout support. Not critical for primary India market but limits expansion to Gulf markets (Arabic-language users common in Indian trade business context).

**Severity:** LOW
**Category:** i18n

---

## DIMENSION 9 — TESTING COVERAGE

### TEST-01 · CRITICAL · Zero Test Files Present in Entire Codebase
**Issue:**
No test files were found anywhere in `Backend/` or `Frontend/`. No unit tests, no integration tests, no end-to-end tests. No test runner configuration (`pytest.ini`, `jest.config.*`, `vitest.config.*`) exists.

**Critical untested paths include:**
- Payment flow: `create_order → verify_payment → assign_license`
- Authentication: login, signup, password reset, session expiry
- Admin operations: user deletion, role assignment, license management
- DPDP Act compliance: data export, account deletion scheduling
- Plan enforcement: access level gating for trade/directory data

**Why it is a problem:**
A payment platform with zero test coverage has no regression safety net. Any code change risks breaking the checkout flow silently. The DPDP Act compliance code (account deletion) cannot be verified to work correctly without tests.

**Severity:** CRITICAL
**Category:** Testing — Complete Absence

---

## DIMENSION 10 — SEO & ACCESSIBILITY

### SEO-01 · LOW · JSON-LD on Homepage Includes Hardcoded Statistics (Legal Risk)
**File:** `Frontend/app/HomePageClient.tsx` — Lines 524–545 (approximate)
**Issue:**
Homepage contains hardcoded testimonials attributed to named individuals and hardcoded statistics (e.g., user counts, data volume claims). These statistics are not derived from live data.

**Why it is a problem:**
Under ASCI (Advertising Standards Council of India) Code of Practice §4, claims must be verifiable. Fake testimonials violate the Consumer Protection Act 2019. Google may demote pages with misleading structured data.

**Severity:** MEDIUM (Legal/Compliance risk, SEO impact)
**Category:** SEO — Compliance / Misleading Content

### SEO-02 · LOW · Robots.txt Disallows `/checkout` — Correct
**File:** `Frontend/app/robots.ts` — confirmed disallowed
**Status:** PASS — correctly implemented.

### ACC-01 · MEDIUM · No Keyboard Navigation Audit Possible Without Running Application
**Issue:**
From static code review, custom interactive components (Framer Motion animated cards, dropdown modals) have no visible `onKeyDown` handlers or `tabIndex` management. Keyboard navigation accessibility (WCAG 2.2 SC 2.1.1) cannot be confirmed without runtime testing.

**Severity:** MEDIUM
**Category:** Accessibility — WCAG 2.2

### ACC-02 · LOW · No `aria-live` Regions for Dynamic Status Messages
**File:** Frontend forms (login, signup, checkout)
**Issue:**
Error and success toast messages are rendered conditionally in JSX but likely have no `aria-live="polite"` attribute, meaning screen readers do not announce them to visually impaired users.

**Severity:** LOW
**Category:** Accessibility — WCAG 2.2 SC 4.1.3

---

## GRADE SUMMARY TABLE

| Dimension | Grade | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Security | D+ | 2 | 9 | 4 | 3 |
| Architecture/Performance | C | 0 | 3 | 4 | 1 |
| Reliability | C | 0 | 3 | 3 | 0 |
| Multi-tenancy | N/A (Single-tenant) | — | 1 (data isolation) | — | — |
| Code Quality | C+ | 0 | 0 | 4 | 3 |
| Observability | D+ | 0 | 2 | 3 | 2 |
| Frontend/UX | C+ | 0 | 0 | 3 | 2 |
| i18n | C | 0 | 0 | 1 | 2 |
| Testing | F | 1 | 0 | 0 | 0 |
| SEO/Accessibility | B- | 0 | 0 | 2 | 2 |

**Overall System Grade: C− (functional but carrying significant security and reliability debt)**

---

## TOP 15 PRIORITY FIX LIST (ranked by risk impact)

| # | Severity | Location | Issue |
|---|---|---|---|
| 1 | CRITICAL | `Backend/controllers/payment_controller.py:173` | Verify endpoint accepts client-supplied `license_type` — user can upgrade plan by modifying POST body |
| 2 | CRITICAL | (Entire codebase) | Zero test coverage on payment, auth, and DPDP paths |
| 3 | CRITICAL | `Backend/controllers/admin_controller.py:181` | Admin can delete their own account — no self-deletion guard |
| 4 | HIGH | `Backend/controllers/auth_controller.py:169` | Password reset does not invalidate existing sessions |
| 5 | HIGH | `Backend/services/email_service.py:121` | Admin reply body rendered as raw HTML in email — stored XSS via admin account |
| 6 | HIGH | `Backend/controllers/auth_controller.py:16` | No per-account lockout after failed login attempts — distributed brute force possible |
| 7 | HIGH | `Backend/modules/repositories/User/postgres_user_repository.py:134` | N+1 DB connections on login — `get_user_with_license_check` opens nested pool connection |
| 8 | HIGH | `Backend/controllers/admin_controller.py:all` | No audit log for admin actions (user deletion, role changes, payment config, license assignment) |
| 9 | HIGH | `Backend/services/email_service.py:34` | Synchronous SMTP with no timeout — blocks Flask worker for SMTP duration |
| 10 | HIGH | `Backend/controllers/user_controller.py:152` | HS code endpoint loads entire dataset into memory per request — no caching |
| 11 | HIGH | `Frontend/lib/store/authSlice.ts:47` | Session token stored in `localStorage` — accessible to XSS |
| 12 | HIGH | `Backend/config.py:86` | `CORS_ORIGINS` env var not set = empty list — silent misconfiguration breaks all POST requests |
| 13 | HIGH | `Backend/controllers/payment_controller.py:215` | Webhook has no timestamp validation window — replay attack possible on old orders |
| 14 | HIGH | `Backend/repositories/trade_repository.py:46` | Three separate connection pools to same DB — risks exhausting PostgreSQL connection limit |
| 15 | MEDIUM | `Frontend/app/profile/page.tsx:45` | GST invoices generated client-side only — tamperable, not reproducible from server |

---

*End of comprehensive_audit_report.md*
*Total findings: 3 CRITICAL, 18 HIGH, 21 MEDIUM, 13 LOW*
