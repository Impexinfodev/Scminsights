# SCM Insights — Architecture Context
**Generated:** 2026-03-13
**Purpose:** Structural documentation for system audit. No bug analysis or fixes — observation only.

---

## SECTION 1 — PRIMARY TECH STACK

### Languages & Runtimes
| Layer | Language | Version |
|---|---|---|
| Frontend | TypeScript | 5.x |
| Frontend | Node.js | (inferred from Next.js 16 requirements) |
| Backend | Python | 3.x (exact version not in repo) |

### Frontend Framework
- **Next.js 16.1.6** — App Router (not Pages Router)
- **React 19.2.3** — latest stable
- **Tailwind CSS 4.1.18** — utility-first styling
- **Framer Motion 12.29.2** — animations
- **Recharts 3.7.0** — data visualization (admin dashboard)

### Backend Framework
- **Flask 2.3.3** — WSGI micro-framework
- **flask-cors** — CORS header management
- **flask-limiter** — rate limiting

### Database
- **PostgreSQL** — remote hosted at `4.240.103.110:5433`, database `impexinfo`
- **Driver:** `psycopg3` (binary pool variant — `psycopg[binary]`)
- **ORM:** None — raw SQL via psycopg3 (no SQLAlchemy or similar)
- **Connection pattern:** Connection pool via `RepoProvider` singleton; repositories instantiated per-request

### Caching Layer
- **None detected.** No Redis, Memcached, or in-memory cache layer present. Some client-side rate limiting logic exists in the frontend (`lib/api-security.ts`) but is not a server-side cache.

### Message Queue / Event Bus
- **None detected.** No Celery, RabbitMQ, Kafka, or background task worker present. Razorpay webhook (`POST /api/payment/webhook`) serves as an async payment confirmation mechanism, but no formal queue.

### Monorepo / Workspace
- **Single repo, two top-level directories:** `Backend/` (Flask) and `Frontend/` (Next.js)
- No npm/yarn workspaces, no Turborepo, no lerna configuration
- Each directory has its own dependency manifest (`requirements.txt`, `package.json`)

### Frontend State Management
- **Redux Toolkit** (`@reduxjs/toolkit ^2.11.2`) with `react-redux ^9.2.0`
- Single slice: `authSlice` — manages `{ isLoggedIn, user, isLoading, sessionChecked }`
- Store configured via `makeStore()` factory in `lib/store/store.ts`
- Auth state also persisted to `localStorage` (initialized via `initializeAuth()` action)

### HTTP Client (Frontend)
- **Axios 1.13.4** — used for all API calls from client components
- Standard `fetch` may also appear in server components (not confirmed from files reviewed)

### Assumptions
- Python runtime version not explicitly pinned in `requirements.txt` (no `.python-version` or `pyproject.toml` found)
- No `Dockerfile` or `docker-compose.yml` was found; deployment topology inferred from env vars and config only
- No `middleware.ts` (Next.js route middleware) found in Frontend root — route protection is done client-side via `useUser` hook

---

## SECTION 2 — DATA FLOW & ARCHITECTURE PATTERN

### Macro Pattern
**Monolith (Separated Frontend/Backend)**
- Flask backend = REST API server (JSON responses only, no server-side rendering)
- Next.js frontend = SSR/SSG/CSR hybrid (App Router with server + client components)
- No microservices, no service mesh, no BFF layer

### Request Lifecycle (Authenticated Page Load)

```
Browser
  → Next.js Server (SSR/SSG page.tsx)
      → Returns HTML shell with metadata + JSON-LD
  → Browser hydrates *PageClient.tsx (React 19)
      → Redux initializeAuth() reads localStorage
      → useUser() hook checks session validity
          → If invalid: redirect to /login
          → If valid: axios.get(NEXT_PUBLIC_BACKEND_URL + endpoint)
              → Flask CSRF middleware (header/origin check)
              → Auth middleware (@require_auth)
                  → Session lookup in PostgreSQL (Session table)
                  → Attaches request.user_id
              → Controller handler
              → Repository → psycopg3 → PostgreSQL
              → JSON response
  → React state update → re-render
```

### Authentication & Authorization Flow

**Registration:**
1. `POST /api/auth/signup` → create `UserProfile` + `AccountActivation` row → send activation email
2. Email link: `GET /account-activate?token=...` → `POST /api/auth/account-activate` → mark `is_active=true`

**Login:**
1. `POST /api/auth/login` → verify bcrypt hash → create `Session` row (1-hour TTL) → return `session_token`
2. Frontend stores `session_token` in Redux + localStorage
3. All subsequent requests: `Session-Token` header (preferred) or `session_token` httponly cookie

**Authorization Levels:**
- Public: no auth required (health, plans listing)
- Authenticated: `@require_auth` — validates `session_token` against `Session` table
- Admin: `@require_admin` — `@require_auth` + checks `WHITELISTED_ADMINS` env list or `UserProfile.Role = 'ADMIN'`

**Password Reset:**
1. `POST /api/auth/forgot-password` → `PasswordReset` row (1-hour TTL) → send email
2. Email link → `POST /api/auth/reset-password` with `token` (POST body or query param)

**Session Storage:**
- Backend: `Session` table (user_id, session_key, client_id, expiration)
- Frontend: Redux store (in-memory) + localStorage (persistence across tabs/refresh)
- Cookies: `session_token` + `user_id` httponly cookies also set at login (dual path)

### Real-Time / Event-Driven Patterns
- **None detected.** No WebSocket, SSE, or polling. All data fetched on-demand via REST.

### File Upload / Storage
- **None detected.** No S3, GCS, Cloudinary, or multer-equivalent present. No file upload endpoints found.

### Payment Flow (Razorpay)

```
Frontend (CheckoutPageClient)
  1. POST /api/payment/create-order  { license_type }
     → Backend creates Razorpay order via SDK
     → Inserts PaymentTransaction (status="created")
     → Returns { order_id, amount_paise, key_id, transaction_id }

  2. Frontend opens Razorpay checkout popup
     → User completes payment on Razorpay

  3. Razorpay returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }

  4. POST /api/payment/verify  { order_id, payment_id, signature, license_type }
     → Backend HMAC-verifies signature
     → Updates PaymentTransaction (status="captured")
     → Assigns license to user (LicenseValidTill set)
     → Returns success

  5. POST /api/payment/webhook (async, from Razorpay servers)
     → Safety net for payment.captured / payment.failed events
     → Verifies webhook HMAC
     → Updates transaction + license if not already done
```

**Gateway Config Fallback:**
- Backend first checks `PaymentGatewayConfig` table in DB
- Falls back to `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` env vars if no DB config

### Multi-Tenancy
- **None detected.** Single-tenant SaaS. All users share the same DB schema with no tenant-ID column. Admin users have elevated access across all user data.

---

## SECTION 3 — THIRD-PARTY DEPENDENCIES & INTEGRATIONS

### External APIs & SDKs

| Integration | Purpose | Where Referenced |
|---|---|---|
| Razorpay | Payment gateway (INR) | `payment_controller.py`, `payment_service.py`, `CheckoutPageClient.tsx` |
| Gmail SMTP | Transactional email | `email_service.py`, `config.py` |
| flagcdn.com | Country flag images | `next.config.ts` (remote image patterns) |
| images.unsplash.com | Stock images | `next.config.ts` (remote image patterns) |
| sardine.ai | *(Listed in CSP `connect-src`)* — fraud/bot detection (assumption) | `next.config.ts` CSP |

### Payment Gateways
- **Razorpay** — INR payments; SDK: `razorpay` (Python pip package)
- Keys stored in: env vars (fallback) + `PaymentGatewayConfig` DB table (primary, admin-managed)
- Currently in **test mode** (`rzp_test_` prefix in key ID)

### Email Provider
- **Gmail SMTP** (`smtp.gmail.com:587`, STARTTLS)
- Python standard `smtplib` via custom `EmailService`
- No SendGrid / AWS SES SDK present
- *(Known limitation: ~500 emails/day cap)*

### Storage Providers
- **None detected.** No cloud storage SDK.

### Analytics / Monitoring
- **None detected in code.** No Google Analytics, Mixpanel, Sentry, Datadog, or similar SDK found in frontend or backend code.

### Frontend npm Packages (Key)

| Package | Version | Role |
|---|---|---|
| `next` | 16.1.6 | Framework |
| `react` / `react-dom` | 19.2.3 | UI runtime |
| `@reduxjs/toolkit` | ^2.11.2 | State management |
| `react-redux` | ^9.2.0 | Redux bindings |
| `axios` | ^1.13.4 | HTTP client |
| `framer-motion` | ^12.29.2 | Animations |
| `@hugeicons/react` | ^1.1.4 | Icon library |
| `@hugeicons/core-free-icons` | ^3.1.1 | Icon assets |
| `lucide-react` | ^0.563.0 | Icon library |
| `react-icons` | ^5.5.0 | Icon library |
| `recharts` | ^3.7.0 | Charts (admin) |
| `tailwindcss` | ^4.1.18 | CSS utility framework |
| `@hugeicons/mcp-server` | ^0.2.1 | **Listed in prod deps — should be devDep** |
| `eslint-config-next` | — | *Version mismatch noted* |

### Backend pip Packages (Key)

| Package | Role | Security Sensitivity |
|---|---|---|
| `flask` | Framework | Medium |
| `flask-cors` | CORS headers | Medium |
| `flask-limiter` | Rate limiting | Low |
| `psycopg[binary]` | PostgreSQL driver | Low |
| `bcrypt` | Password hashing | **High** |
| `razorpay` | Payment SDK | **High** |
| `python-dotenv` | Env var loading | Low |
| `email-validator` | Email validation | Low |

*(Full `requirements.txt` not read in detail — exact versions not all captured)*

---

## SECTION 4 — DEPLOYMENT TOPOLOGY (observed from code only)

### Inferred Deployment Setup
- **Backend:** Flask running on `0.0.0.0:5001` (from `FLASK_HOST`, `FLASK_PORT`)
  Public URL: `https://api.scminsights.ai` (from `BACKEND_URL` env)
  Likely behind a reverse proxy (Nginx/Caddy) for TLS termination — inferred from `FLASK_SSL_PORT=443` and HSTS headers added conditionally on `FLASK_ENV=production`
- **Frontend:** Next.js deployed at `https://scminsights.ai` (from `DOMAIN_URL`)
  Likely on Vercel or similar — no custom server config found; standard `next start` setup
- **Database:** Remote PostgreSQL at `4.240.103.110:5433`
  Named `impexinfo` — appears to be a shared/managed instance (possibly Supabase-hosted based on user `supabase_admin`)

### Environment Variables — Complete List

**Backend:**
| Variable | Purpose |
|---|---|
| `FLASK_SECRET_KEY` | Flask session encryption |
| `FLASK_ENV` | `development` or `production` |
| `FLASK_DEBUG` | Debug mode boolean |
| `FLASK_HOST` | Bind address (0.0.0.0) |
| `FLASK_PORT` | HTTP port (5001) |
| `FLASK_SSL_PORT` | HTTPS port (443) |
| `POSTGRES_DB_HOST` | DB host (4.240.103.110) |
| `POSTGRES_DB_PORT` | DB port (5433) |
| `POSTGRES_DB_USER` | DB user (supabase_admin) |
| `POSTGRES_DB_PASSWORD` | DB password |
| `POSTGRES_DB_NAME` | DB name (impexinfo) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `SMTP_HOST` | Mail server (smtp.gmail.com) |
| `SMTP_PORT` | Mail port (587) |
| `SMTP_USER` | SMTP username (admin@impexinfo.com) |
| `SMTP_PASSWORD` | SMTP password |
| `EMAIL_FROM_NAME` | Sender display name |
| `SMTP_USE_TLS` | TLS toggle boolean |
| `DOMAIN_URL` | Public domain (https://scminsights.ai) |
| `BACKEND_URL` | Backend API URL |
| `FRONTEND_URL` | Frontend URL (for email links) |
| `WHITELISTED_ADMINS` | Comma-separated admin emails |
| `RAZORPAY_KEY_ID` | Razorpay publishable key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC secret |
| `PAYMENT_SOURCE_WEBSITE` | Source identifier in transactions |
| `LOG_FILE_PATH` | *(Optional)* Log file path override |

**Frontend:**
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API base URL |

### Multi-Region / Multi-Instance
- **None detected.** Single-instance deployment for both frontend and backend inferred from code.

### Port Bindings
- Backend: `5001` (HTTP), `443` (HTTPS/SSL via reverse proxy)
- Frontend: `3000` (development), standard `443` in production

### Reverse Proxy Patterns
- HSTS header (`Strict-Transport-Security`) applied by Flask only when `FLASK_ENV=production` — implies TLS is terminated by a proxy upstream
- CSP includes `https://api.scminsights.ai` in `connect-src` — confirms separate subdomain routing for backend
- No explicit `X-Forwarded-For` / `X-Real-IP` handling detected in Flask code (assumption: not rate-limiting by real IP behind proxy)

---

## SECTION 5 — AUDIT BLIND SPOTS

### Files Referenced But Not Read
| Referenced File/Module | Referenced From | Impact on Audit |
|---|---|---|
| `Backend/repositories/` (full contents) | `repo_provider.py` | Partial — structure inferred from controller usage |
| `Backend/modules/db/postgres_models.py` | `app.py` | Schema inferred from agent summary, not direct read |
| `Backend/controllers/trade_controller.py` | `app.py` | Route details partially known |
| `Backend/controllers/sims_data_controller.py` | `app.py` | Route details partially known |
| `Backend/controllers/public_controller.py` | `app.py` | Only health endpoint known |
| `Backend/controllers/contact_controller.py` | `app.py` | Routes not fully enumerated |
| `Frontend/hooks/useUser.ts` | multiple pages | Behavior inferred from description |
| `Frontend/lib/api-security.ts` | client components | Function signatures summarized, not fully read |
| `Frontend/app/admin/**` | browser routes | Admin page implementations not individually read |
| `Frontend/components/**` | page files | UI components not reviewed |
| `Backend/requirements.txt` | — | Exact package versions not captured |
| `Backend/tools/*.py` | manual ops | CLI scripts not read |

### Missing Configuration Files
| File | Impact |
|---|---|
| `.env` (both Backend and Frontend) | Actual values redacted — secrets, keys, DB credentials not visible |
| `.env.example` | Not found — no canonical list of required variables |
| `Dockerfile` / `docker-compose.yml` | Not found — deployment topology fully inferred |
| `nginx.conf` or reverse proxy config | Not found — proxy behavior assumed |
| `tsconfig.json` | Not read — TypeScript compiler settings unknown |
| `tailwind.config.*` | Not found — custom design tokens unknown |
| `pytest.ini` / `jest.config.*` | Not found |

### Missing or Absent Test Infrastructure
- **No test files detected** in either Backend or Frontend
- No `tests/` directory found in Backend
- No `__tests__/` or `*.test.ts` / `*.spec.ts` files found in Frontend
- No test runner configuration (`pytest`, `jest`, `vitest`) observed
- **Assumption:** System has no automated test suite

### Services Called But Not Included
| Service | How Invoked | Missing Context |
|---|---|---|
| Razorpay API | `razorpay` Python SDK + frontend JS | Webhook retry behavior, dispute flow unknown |
| Gmail SMTP | `smtplib` directly | Email delivery failures not tracked |
| sardine.ai | CSP `connect-src` only | No SDK or API call found in code — may be loaded via script tag not reviewed |
| PostgreSQL (remote) | psycopg3 pool | DB schema for trade data tables not in models file |

### Trade Data Tables
- The platform queries trade data (importers/exporters by year, HS code, country) via `trade_controller.py`
- The underlying trade data tables (`trade_*` or similar) are **not defined in `postgres_models.py`** — they appear to be pre-existing/external tables in the `impexinfo` database, seeded separately
- This is a significant blind spot: the schema, indexes, and row volumes of trade tables are unknown

### Admin Payment Settings Frontend
- `Frontend/app/admin/payment-settings/page.tsx` was listed as modified in git status
- Contents not fully read — exact UI/logic for admin Razorpay key management UI unknown

### `game_of_squids` Folder
- Exists in `/public` directory (noted in project memory)
- Purpose unknown — not referenced in any reviewed code

---

## APPENDIX — DATABASE SCHEMA SUMMARY

### Tables in `postgres_models.py` (managed by application)
| Table | Primary Key | Notable Columns |
|---|---|---|
| `UserProfile` | `user_id` UUID | email (UNIQUE), name, company, phone, gstin, role, is_active, consent_given_at, deletion_scheduled_at |
| `License` | `license_type` VARCHAR | license_info JSONB (pricing, access limits, validity) |
| `Session` | `session_key` | user_id FK, client_id, expiration_time, UNIQUE(user_id, client_id) |
| `UserToken` | `user_id` | tokens remaining (for legacy/future use) |
| `AccountActivation` | `activation_token` | user_id, expiration_time |
| `PasswordReset` | `reset_token` | user_id, expiration_time |
| `ContactMessage` | `contact_id` UUID | name, email, subject, message, status, created_time |
| `PaymentTransaction` | `id` SERIAL | razorpay_order_id (UNIQUE), payment_id, user_id, license_type, amount_paise, status, source_website, is_test_mode |
| `HSCodeDescription` | `id` SERIAL | hs_code (UNIQUE), unit, description |
| `SimsDirectory` | `id` SERIAL | iec_code, company_name, email, mobile |
| `PaymentGatewayConfig` | `gateway_id` VARCHAR | is_active, key_id, key_secret, webhook_secret, extra_config |

### Tables NOT in models (pre-seeded / external)
- Trade importer/exporter data tables — schema unknown
- Possibly: `hs_codes`, `suppliers`, `buyers` in raw form — seeded via `tools/seed_*.py`

---

*End of architecture_context.md*
