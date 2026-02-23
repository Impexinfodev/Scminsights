# SCM INSIGHTS — Global Supply Chain Buyers & Suppliers Platform

## Exhaustive Codebase Audit Report

**Scope:** Backend (Flask + PostgreSQL), Frontend (Next.js/TypeScript).  
**Goal:** Scale globally and rank as a top-performing global supply chain buyers/suppliers data platform.

---

## FIXES APPLIED (Audit Remediation)

All issues below have been addressed in the codebase:

| # | Category | Fix |
|---|----------|-----|
| 1 | **DB indexes** | `postgres_models.py`: added `SESSION_INDEX_STATEMENTS` (idx_session_expiration). `postgres_admin_repo.py`: runs session indexes on create_tables. `scripts/indexes_trade_company_report.sql`: added for trade_company_report. |
| 2 | **SQL injection** | `tools/create_db.py`: dbname validated with `^[a-z0-9_]+$`; CREATE DATABASE uses `psycopg.sql.Identifier`. |
| 3 | **Admin pagination** | `postgres_admin_repo.py`: `get_all_users(page, page_size)` uses LIMIT/OFFSET and COUNT; returns `(list, total)`. Added `get_users_overview_counts()`. `admin_controller.py`: uses new pagination and overview counts. |
| 4 | **Statement timeout** | `trade_repository.py`: `SET statement_timeout = 15000` before get_top_traders queries. |
| 5 | **Logging (no PII)** | `contact_controller.py`, `user_controller.py`, `sims_data_controller.py`: replaced `print(e)` with `logger.error(..., type(e).__name__, exc_info=False)`. |
| 6 | **Rate-limiting** | `requirements.txt`: added flask-limiter. `extensions.py`: Limiter with get_remote_address. `app.py`: limiter.init_app; /login 10/min, /signup and /forgot-password 5/min. `trade_controller.py`: /top 60/min. |
| 7 | **Security headers** | `app.py`: @app.after_request sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security (production). |
| 8 | **Secure cookies** | `auth_controller.py`: set_cookie(..., secure=FLASK_ENV==production). |
| 9 | **CSRF mitigation** | `app.py`: before_request requires X-Requested-With or X-Client for POST/PUT/DELETE/PATCH on /login, /signup, /api/auth/*, /api/contact. Frontend: signup, forgot-password, contact, reset-password, account-activate send headers. |
| 10 | **Login backend URL** | `login/page.tsx`: guard when NEXT_PUBLIC_BACKEND_URL missing; show toast and return before request. |
| 11 | **Login a11y** | `login/page.tsx`: id/htmlFor on email and password; aria-invalid, aria-describedby, role="alert" on errors; aria-busy on submit; submit disabled when isLoading. |
| 12 | **Race condition (buyer/supplier)** | `BuyerPageClient.tsx` and `SupplierPageClient.tsx`: AbortController cancels previous fetch when filters/page change; ignore AbortError; only setIsLoading(false) when !signal.aborted. |
| 13 | **Bundle optimization** | `next.config.ts`: experimental.optimizePackageImports for @hugeicons/react and @hugeicons/core-free-icons. |

---

## 1. ARCHITECTURE & GLOBAL SCALE (Flask + PostgreSQL)

### 1.1 PostgreSQL — Missing indexes & collection scans

| File Path                                                   | Line Number | Severity   | Issue                                                                                                                                                                                                                                                       | Exact Code Fix                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Backend/modules/db/postgres_models.py`                     | (after 37)  | **High**   | Session lookups by `SessionKey` and by `ExpirationTime` have no index; high-read auth flow can cause full table scans.                                                                                                                                      | Add index statements and run them in migrations or init: `CREATE INDEX IF NOT EXISTS idx_session_session_key ON Session (SessionKey);` and `CREATE INDEX IF NOT EXISTS idx_session_expiration ON Session (ExpirationTime);`                                                                     |
| `Backend/modules/db/postgres_models.py`                     | (after 19)  | **Medium** | `UserProfile` lookups by `EmailId` (login) rely on UNIQUE only; no index on `(UserId, ClientId)` for Session. Session has UNIQUE(UserId, ClientId) which creates an index—SessionKey is PK. Add explicit index for `Session(SessionKey)` if not PK-indexed. | Ensure EmailId has index: `CREATE UNIQUE INDEX IF NOT EXISTS idx_userprofile_email ON UserProfile (LOWER(EmailId));` (or rely on UNIQUE). For Session, PK on SessionKey is sufficient; add `CREATE INDEX IF NOT EXISTS idx_session_expiration ON Session (ExpirationTime);` for expiry cleanup. |
| `Backend/repositories/trade_repository.py`                  | N/A         | **High**   | Table `trade_company_report` is queried by `(trade_type, hs_code, year, country)` but has no indexes defined in this repo (external table). Without indexes, buyer/supplier list and aggregations will do full scans.                                       | Document and add in DB: `CREATE INDEX IF NOT EXISTS idx_trade_type_hs_year ON trade_company_report (trade_type, hs_code, year);` and `CREATE INDEX IF NOT EXISTS idx_trade_country ON trade_company_report (LOWER(data_country));` (adjust to actual schema).                                   |
| `Backend/modules/repositories/Admin/postgres_admin_repo.py` | 183–191     | **High**   | `get_all_users()` loads **all** users into memory then slices in Python; no LIMIT/OFFSET. At scale this blocks the event loop and can OOM.                                                                                                                  | Use LIMIT/OFFSET in SQL and return total via COUNT. See fix below.                                                                                                                                                                                                                              |

**Code fix — `Backend/modules/repositories/Admin/postgres_admin_repo.py` (get_all_users):**

```python
@with_connection(commit=False)
def get_all_users(self, cursor, sort_order="asc", search_term=None, page=1, page_size=50):
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    offset = (page - 1) * page_size
    order = "ASC" if str(sort_order).lower() == "asc" else "DESC"
    where = ""
    params = []
    if search_term and search_term.strip():
        term = f"%{search_term.strip()}%"
        where = " WHERE (LOWER(EmailId) LIKE LOWER(%s) OR LOWER(Name) LIKE LOWER(%s) OR LOWER(CompanyName) LIKE LOWER(%s))"
        params = [term, term, term]
    count_sql = f"SELECT COUNT(*) FROM UserProfile {where}"
    cursor.execute(count_sql, tuple(params) if params else None)
    total = (cursor.fetchone() or [0])[0]
    cursor.execute(
        f"""
        SELECT UserId, LicenseType, EmailId, Name, CompanyName, PhoneNumberCountryCode, PhoneNumber,
               gst, activationStatus, LogOnTimeStamp
        FROM UserProfile
        {where}
        ORDER BY UserId {order}
        LIMIT %s OFFSET %s
        """,
        (tuple(params) + (page_size, offset)) if params else (page_size, offset),
    )
    rows = cursor.fetchall() or []
    return [
        {
            "UserId": r[0], "LicenseType": r[1], "EmailId": r[2], "Name": r[3],
            "Company": r[4], "PhoneStd": r[5], "Phone": r[6], "Gst": r[7],
            "ActivationStatus": r[8], "CreatedAt": r[9], "RecordsConsumed": 0,
        }
        for r in rows
    ], total
```

Then in `Backend/controllers/admin_controller.py` (e.g. lines 22–34), call `get_all_users(..., page=page, page_size=page_size)` and use the returned `total` instead of `len(users)`.

---

### 1.2 SQL injection and dynamic SQL

| File Path                                                   | Line Number      | Severity     | Issue                                                                                                                                                                          | Exact Code Fix                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Backend/tools/create_db.py`                                | 33               | **Critical** | `cur.execute(f'CREATE DATABASE "{dbname}"')` — if `dbname` were ever user-controlled, this could be SQL injection. Here it comes from env; still unsafe if env is compromised. | Use identifier quoting: `from psycopg.sql import Identifier; cur.execute(sql.SQL("CREATE DATABASE {}").format(Identifier(dbname)))` or keep env-only and validate `dbname` with a strict allow-list (e.g. `^[a-z0-9_]+$`). |
| `Backend/modules/repositories/Admin/postgres_admin_repo.py` | 294–301, 367–372 | **Medium**   | `order` and `where` are built from validated inputs (order ∈ ASC/DESC, where from params). Current code is safe but fragile; any future change could introduce injection.      | Keep `order` as a variable that is only ever `"ASC"` or `"DESC"` (no user string in SQL). Same for `where` — only add clauses with parameterized values.                                                                   |

---

### 1.3 Event-loop blocking and connection handling

| File Path                                                       | Line Number | Severity   | Issue                                                                                                                          | Exact Code Fix                                                                                                                                                                                                                           |
| --------------------------------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Backend/repositories/trade_repository.py`                      | 122–156     | **Medium** | Synchronous `cur.execute` and `fetchall()` block the Flask worker; under high concurrency buyer/supplier list calls can stack. | Acceptable for Flask sync workers; for global scale consider async (e.g. asyncpg) or offload heavy trade queries to a dedicated worker/cache. Document and add timeouts: `cur.execute(..., options="-c statement_timeout=15000")` (15s). |
| `Backend/modules/repositories/User/postgres_user_repository.py` | 48          | **Low**    | Connection pool created per repo instance; ensure `RepoProvider` reuses one pool per process.                                  | Verify `RepoProvider` instantiates each repo once and reuses the same pool; if not, move pool to a module-level singleton.                                                                                                               |

---

## 2. GLOBAL SECURITY & COMPLIANCE

### 2.1 OWASP — Injection, XSS, CSRF

| File Path                                                   | Line Number   | Severity   | Issue                                                                                                                                                                                                   | Exact Code Fix                                                                                                                                                                                             |
| ----------------------------------------------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Backend/modules/repositories/Admin/postgres_admin_repo.py` | 180, 298, 367 | **Low**    | `search_term` is passed into LIKE via `term = f"%{search_term.strip()}%"` and then used as a **parameter** (`params = [term, term, term]`), not string-formatted into SQL. So SQL injection is avoided. | No change required; keep using parameters only.                                                                                                                                                            |
| `Frontend/app/layout.tsx`                                   | 184–197       | **Low**    | `dangerouslySetInnerHTML` with `JSON.stringify(organizationJsonLd)` etc. — content is app-controlled (no user input), so XSS risk is low.                                                               | Keep as is or move JSON-LD to a separate component that clearly marks data as non-user.                                                                                                                    |
| Backend                                                     | App-wide      | **High**   | No CSRF protection on state-changing endpoints (POST /login, /signup, /api/contact, etc.). Cookie-based auth is used; without SameSite+CSRF tokens, risk of cross-site request forgery.                 | For production: use a CSRF token for browser forms (e.g. Flask-WTF or double-submit cookie) or ensure all state-changing requests require a custom header (e.g. X-Requested-With) and SameSite=Strict/Lax. |
| `Backend/controllers/auth_controller.py`                    | 47–49         | **Medium** | Cookies set without `secure=True`; in production over HTTPS they should be secure.                                                                                                                      | Set `secure=os.environ.get("FLASK_ENV") == "production"` and pass it to `set_cookie(..., secure=...)`.                                                                                                     |

**Code fix — `Backend/controllers/auth_controller.py` (lines 46–49):**

```python
import os
# ...
    response = jsonify(response_data)
    secure_cookie = os.environ.get("FLASK_ENV") == "production"
    response.set_cookie(
        "session_token", session_token,
        httponly=True, samesite="Lax", secure=secure_cookie
    )
    response.set_cookie(
        "user_id", user_id,
        httponly=True, samesite="Lax", secure=secure_cookie
    )
```

---

### 2.2 Authentication — Session and cookies

| File Path                                | Line Number | Severity   | Issue                                                                                                                                | Exact Code Fix                                                                                           |
| ---------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `Backend/middlewares/auth_middleware.py` | 24–27       | **Low**    | Session expiration is checked; expiry is stored in DB. No refresh token; session is extended only on activity if you add that logic. | Document session TTL and consider sliding expiration on each authenticated request.                      |
| `Backend/controllers/auth_controller.py` | 47–49       | **Medium** | `user_id` in cookie exposes PII (email used as UserId); HttpOnly reduces script access but cookie is still sent on every request.    | Prefer not storing user_id in cookie; derive from session server-side. If kept, ensure it is not logged. |

---

### 2.3 PII and logging

| File Path                                     | Line Number | Severity   | Issue                                                                                                                                     | Exact Code Fix                                                                                                                                                                                                                          |
| --------------------------------------------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Backend/controllers/contact_controller.py`   | 37          | **Medium** | `print(f"Contact save error: {e}")` — exception `e` can contain stack traces or DB details; in production this can leak into stdout/logs. | Use a logger and log only exception type and message: `import logging; logger = logging.getLogger(__name__); logger.exception("Contact save failed")` then in production configure logging to avoid printing full trace to public logs. |
| `Backend/controllers/user_controller.py`      | 40, 70      | **Medium** | Same as above: `print(f"Error in get_user_license_info: {e}")` can leak internal info.                                                    | Replace with structured logging; do not log request bodies or PII.                                                                                                                                                                      |
| `Backend/controllers/sims_data_controller.py` | 29, 41      | **Medium** | Same: `print(f"sims_data ... error: {e}")`.                                                                                               | Same as above; use logger and sanitize.                                                                                                                                                                                                 |

---

### 2.4 Rate-limiting and security headers

| File Path        | Line Number | Severity | Issue                                                                                                               | Exact Code Fix                                                                                                                                                                                                                    |
| ---------------- | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Backend/app.py` | 29–35       | **High** | No rate-limiting on `/login`, `/signup`, `/forgot-password`, or `/api/trade/top`. Enables brute-force and scraping. | Add Flask-Limiter or a simple in-process rate limit (e.g. by IP) for auth and trade endpoints. Example: `from flask_limiter import Limiter; limiter = Limiter(key_func=get_remote_address); @limiter.limit("5/minute")` on login. |
| `Backend/app.py` | 21–35       | **High** | No security headers (X-Content-Type-Options, X-Frame-Options, etc.).                                                | Add middleware or `@app.after_request` to set headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or SAMEORIGIN), `Strict-Transport-Security` in production.                                                     |

**Example — add after `create_app` in `Backend/app.py`:**

```python
@app.after_request
def security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "SAMEORIGIN"
    if os.environ.get("FLASK_ENV") == "production":
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return resp
```

---

## 3. FRONTEND PERFORMANCE & GLOBAL SEO (TypeScript / Next.js)

### 3.1 Core Web Vitals and bundle size

| File Path                                      | Line Number  | Severity   | Issue                                                                                                                                         | Exact Code Fix                                                                                                                                  |
| ---------------------------------------------- | ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Frontend/app/login/page.tsx`                  | 104, 163–164 | **High**   | `backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL` can be `undefined` if env is missing; request becomes `undefined/login` → "Network Error". | Guard: `const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL                                                                                  |     | ""; if (!backendUrl) { showToast("Configuration Error", "Backend URL is not configured.", "error"); return; }`before`axios.post`. |
| `Frontend/app/buyer/BuyerPageClient.tsx`       | (whole page) | **Medium** | Large client component; no `next/dynamic` for heavy tables. On slow global networks, TTI can suffer.                                          | Lazy-load table or heavy parts: `const BuyersTable = dynamic(() => import("./BuyersTable"), { ssr: false, loading: () => <TableSkeleton /> });` |
| `Frontend/app/supplier/SupplierPageClient.tsx` | (same)       | **Medium** | Same as buyer page.                                                                                                                           | Same pattern: dynamic import for table or secondary UI.                                                                                         |
| `Frontend/next.config.ts`                      | 1–23         | **Low**    | No explicit bundle analyzer or split chunks tuning.                                                                                           | Optional: enable `experimental.optimizePackageImports` for large libs (e.g. lodash, icons) to reduce bundle size.                               |

---

### 3.2 Technical SEO — Meta, OpenGraph, JSON-LD

| File Path                     | Line Number     | Severity | Issue                                                                                                                                                                             | Exact Code Fix                                                                                                                         |
| ----------------------------- | --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Frontend/app/layout.tsx`     | 16–110, 113–164 | **Low**  | Metadata and JSON-LD are appropriate for a **trade/supply chain** platform (Organization, WebSite, SoftwareApplication). No "Education/Course" schema (correct for this product). | Ensure key pages (buyer, supplier, buyers-directory, plan) have `metadata` and `openGraph` with page-specific titles and descriptions. |
| `Frontend/app/buyer/page.tsx` | 4–28            | **Low**  | Has metadata and openGraph; good.                                                                                                                                                 | Add JSON-LD for `ItemList` or `DataCatalog` on directory pages if you want richer SERP snippets.                                       |

---

### 3.3 Accessibility and i18n

| File Path                     | Line Number | Severity   | Issue                                                                                                                  | Exact Code Fix                                                                                           |
| ----------------------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Frontend/app/layout.tsx`     | 172         | **Low**    | Root has `lang="en"`; no `dir` or multi-locale.                                                                        | For i18n: add locale to layout and use next-intl or similar; set `lang` and `dir` from locale.           |
| `Frontend/app/login/page.tsx` | (form)      | **Medium** | Ensure form inputs have associated `<label>` and error messages are linked with `aria-describedby` for screen readers. | Add `id` on inputs and `htmlFor` on labels; add `aria-invalid` and `aria-describedby` when errors exist. |

---

## 4. EDGE CASES & RELIABILITY

### 4.1 Race conditions and async

| File Path                                | Line Number      | Severity   | Issue                                                                                                                | Exact Code Fix                                                                                                                                                                          |
| ---------------------------------------- | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Frontend/app/buyer/BuyerPageClient.tsx` | (fetchSuppliers) | **Medium** | Rapid page/sort changes can trigger multiple in-flight requests; last response may not match current filters (race). | Use an abort controller or request id: `const reqId = ++requestIdRef.current; ... if (res.reqId !== requestIdRef.current) return;` or cancel previous `AbortController` on new request. |
| `Backend/controllers/auth_controller.py` | 32–35            | **Low**    | Login creates session then fetches user_info, license, tokens in sequence; if one fails, session is already created. | Consider creating session only after all data is ready, or use a transaction and rollback on failure.                                                                                   |
| `Frontend/app/login/page.tsx`            | 161–169          | **Low**    | Double-submit: user can click Sign In twice; two POSTs.                                                              | Disable submit button while `isLoading` (likely already done) and ignore duplicate submissions.                                                                                         |

---

### 4.2 Critical flows checklist

Use this for manual and automated testing:

- **Signup**
  - [ ] POST /signup with invalid email → 400.
  - [ ] POST /signup with weak password → 400 with details.
  - [ ] POST /signup with existing email/phone → 400.
  - [ ] POST /signup valid → 201, activation email sent (or mocked).
  - [ ] Account not activated → login returns 401 with code ACCOUNT_NOT_ACTIVATED.
- **Login**
  - [ ] POST /login without body → 400.
  - [ ] POST /login wrong credentials → 401.
  - [ ] POST /login valid + activated → 200, Set-Cookie session_token, user_id; response has session_token, user_details, license.
  - [ ] Frontend: missing NEXT_PUBLIC_BACKEND_URL → clear error, no request to "undefined".
- **Buyers/Suppliers data**
  - [ ] GET /api/trade/top with trade_type, hs_code → 200, paginated; frequency from frequency_ratio.
  - [ ] Invalid trade_type or hs_code → 400.
  - [ ] Unauthenticated request where auth required → 401.
- **Session**
  - [ ] Request with expired session cookie → 401 SESSION_EXPIRED.
  - [ ] Logout clears cookie and invalidates session.
- **Admin**
  - [ ] Non-admin cannot access /api/admin/users.
  - [ ] get_all_users pagination returns correct slice and total.
- **Contact**
  - [ ] POST /api/contact with valid name, email, message → 200.
  - [ ] Missing name/email/message → 400.

---

## 5. SUMMARY TABLE

| Category          | Critical | High | Medium | Low |
| ----------------- | -------- | ---- | ------ | --- |
| Architecture / DB | 0        | 3    | 1      | 1   |
| Security          | 1        | 3    | 4      | 2   |
| Frontend / SEO    | 0        | 1    | 2      | 2   |
| Edge cases        | 0        | 0    | 2      | 2   |

**Immediate actions:**

1. Add rate-limiting and security headers (Backend).
2. Set `secure=True` on cookies in production (auth_controller).
3. Guard login when `NEXT_PUBLIC_BACKEND_URL` is missing (Frontend).
4. Paginate `get_all_users` in DB (admin repo + controller).
5. Replace `print(e)` with structured logging in controllers; avoid logging PII.
6. Document and add indexes for `trade_company_report` and Session/UserProfile where beneficial.

---

_Audit tailored to SCM INSIGHTS: Flask + PostgreSQL + Next.js, global supply chain buyers and suppliers data platform._
