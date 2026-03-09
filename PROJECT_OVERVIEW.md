# SCM Insights — Complete Project Overview

> **Company**: Aashita Technosoft Pvt. Ltd. (`aashita.ai`)
> **Product**: SCM Insights — Global Trade Intelligence Platform
> **Website**: https://scminsights.ai
> **Repository Root**: `d:\Aashita\Trade\ScmInsights`

---

## Table of Contents

1. [What Is SCM Insights?](#1-what-is-scm-insights)
2. [Tech Stack Summary](#2-tech-stack-summary)
3. [System Architecture](#3-system-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Frontend — Next.js App](#5-frontend--nextjs-app)
6. [Backend — Flask API](#6-backend--flask-api)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Payment Integration (Razorpay)](#10-payment-integration-razorpay)
11. [Security Architecture](#11-security-architecture)
12. [SEO & Metadata Architecture](#12-seo--metadata-architecture)
13. [License & Plans System](#13-license--plans-system)
14. [Email System](#14-email-system)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Known Issues & Tech Debt](#16-known-issues--tech-debt)

---

## 1. What Is SCM Insights?

**SCM Insights** is a B2B SaaS platform for global trade intelligence. It provides verified buyer and supplier data sourced from 209+ countries, helping Indian importers/exporters find trade partners, analyze HS code-based market trends, and discover business opportunities.

### Core Features
| Feature | Description |
|---------|-------------|
| **Buyer Search** | Search importers by HS code, year, country, sort by frequency |
| **Supplier Search** | Search exporters globally by HS code and trade data |
| **Buyers Directory (SIMS)** | Verified Indian buyer directory from SIMS government data |
| **HSN Code Lookup** | Search & browse HS codes with descriptions |
| **Trade Analytics** | Summary statistics per HS code and year |
| **Plan-Based Access** | Trial / Trade / Directory / Bundle subscription tiers |
| **Admin Dashboard** | User management, license assignment, transaction history |

### Target Market
- Indian importers & exporters
- Trade consultants, customs brokers
- Market research firms
- Startups entering global supply chains

---

## 2. Tech Stack Summary

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | **Next.js** | 16.1.6 |
| UI Library | **React** | 19.2.3 |
| Language | **TypeScript** | ^5 |
| Styling | **Tailwind CSS** | ^4.1.18 |
| Animations | **Framer Motion** | ^12.29.2 |
| State Management | **Redux Toolkit** | ^2.11.2 |
| HTTP Client | **Axios** | ^1.13.4 |
| Icons | **Lucide React** + HugeIcons | Latest |
| Charts | **Recharts** | ^3.7.0 |
| Build Tool | Next.js (Turbopack in dev) | — |

### Backend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | **Flask** | 2.3.3 |
| Language | **Python** | 3.x |
| Database | **PostgreSQL** | via psycopg3 |
| ORM/DB Driver | **psycopg** (pool + binary) | >=3.1 |
| WSGI Server | **Gunicorn** | 21.2.0 |
| Auth | Custom sessions + **bcrypt** | 4.0.1 |
| CORS | flask-cors | 4.0.0 |
| Rate Limiting | **flask-limiter** | 3.5.0 |
| Env Config | python-dotenv | 1.0.0 |
| HTTP | requests | 2.31.0 |

### Infrastructure & Integrations
| Service | Purpose |
|---------|---------|
| **Razorpay** | Payment gateway (INR) |
| **Gmail SMTP** | Transactional emails |
| **PostgreSQL** | Primary database |
| **Next.js Middleware** | Region detection (India vs. Global) |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                    Next.js 16 / React 19                     │
│              (SSR + Client-side interactivity)               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   NEXT.JS MIDDLEWARE                         │
│         proxy.ts — Region Detection (IN / GLOBAL)           │
│         Sets cookies: x-region, x-currency                  │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
       Static SSR    API Proxy   Client JS
              │          │          │
              └──────────▼──────────┘
                         │ REST API calls
                         │ (Session-Token, X-Requested-With)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  FLASK BACKEND (Python)                      │
│                                                              │
│  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌──────────────┐  │
│  │   Auth   │  │  Trade  │  │Payment │  │    Admin     │  │
│  │Controller│  │Controller│  │Control │  │  Controller  │  │
│  └────┬─────┘  └────┬────┘  └───┬────┘  └──────┬───────┘  │
│       │             │            │               │           │
│  ┌────▼─────────────▼────────────▼───────────────▼───────┐  │
│  │                  Repository Layer                      │  │
│  │        (postgres_user_repo, postgres_admin_repo,       │  │
│  │         trade_repository)                              │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │          psycopg3 Connection Pool                      │  │
│  └────────────────────────┬───────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                      PostgreSQL                              │
│   UserProfile, Session, License, UserToken, PaymentTransaction│
│   ContactMessage, AccountActivation, PasswordReset           │
│   HSCodeDescription, SimsDirectory                           │
└──────────────────────────────────────────────────────────────┘

External Integrations:
  Razorpay ──── Payment Gateway (INR)
  Gmail SMTP ── Transactional Email
```

### Communication Flow
1. User loads page → Next.js server renders HTML with metadata
2. Client components hydrate → Redux initializes auth state
3. API calls hit Flask with session token + CSRF headers
4. Flask validates session → queries PostgreSQL → returns JSON
5. Redux updates → React re-renders

---

## 4. Directory Structure

```
ScmInsights/
├── README.md                        # Project-wide documentation
├── .gitignore                       # Comprehensive ignore rules
│
├── Frontend/                        # Next.js 16 application
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout (metadata, JSON-LD, fonts)
│   │   ├── page.tsx                 # Homepage (server component)
│   │   ├── HomePageClient.tsx       # Homepage (client component)
│   │   ├── globals.css              # Global Tailwind CSS
│   │   ├── error.tsx                # Error boundary
│   │   ├── global-error.tsx         # Global error boundary
│   │   ├── robots.ts                # Robots.txt generator
│   │   ├── sitemap.ts               # XML sitemap generator
│   │   │
│   │   ├── about/                   # About page
│   │   ├── account-activate/        # Email activation
│   │   ├── admin/                   # Admin dashboard
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── assign-license/
│   │   │   ├── contacts/
│   │   │   ├── plans/
│   │   │   ├── transactions/
│   │   │   └── users/
│   │   ├── buyer/                   # Buyer search page
│   │   ├── buyers-directory/        # SIMS buyers directory
│   │   ├── checkout/                # Payment checkout
│   │   ├── contact/                 # Contact form
│   │   ├── forgot-password/         # Password recovery
│   │   ├── hsn/                     # HSN code lookup
│   │   ├── login/                   # Login page
│   │   ├── plan/                    # Single plan view
│   │   ├── plans/                   # Plans listing
│   │   ├── policy/                  # Privacy/Terms
│   │   ├── profile/                 # User profile
│   │   ├── refund-policy/           # Refund policy
│   │   ├── reset-password/          # Password reset
│   │   ├── signup/                  # Registration
│   │   ├── supplier/                # Supplier search page
│   │   └── terms-of-use/            # Terms of service
│   │
│   ├── components/                  # Shared UI components
│   │   ├── CookieConsent.tsx        # GDPR cookie notice
│   │   ├── TrialBanner.tsx          # Trial status banner
│   │   └── layout/
│   │       ├── ClientLayout.tsx     # Main layout wrapper
│   │       ├── Navbar.tsx           # Navigation bar
│   │       └── Footer.tsx           # Footer
│   │
│   ├── hooks/
│   │   └── useUser.ts               # Auth state hook
│   │
│   ├── lib/
│   │   ├── api-security.ts          # Client-side security utils
│   │   ├── currency.ts              # Currency formatting
│   │   └── store/
│   │       ├── store.ts             # Redux store
│   │       ├── authSlice.ts         # Auth state slice
│   │       ├── hooks.ts             # Typed Redux hooks
│   │       └── index.ts             # Store exports
│   │
│   ├── public/                      # Static assets
│   │   ├── favicon.svg              # SVG favicon
│   │   ├── favicon-*.png            # Multiple favicon sizes
│   │   ├── apple-touch-icon.png     # iOS home screen icon
│   │   ├── og-image.png             # OG social share image (1200x630)
│   │   ├── manifest.json            # PWA manifest
│   │   ├── fonts/                   # SFPRO font family
│   │   └── game_of_squids/          # ⚠️ Undocumented (investigate)
│   │
│   ├── proxy.ts                     # Region detection middleware
│   ├── next.config.ts               # Next.js + CSP config
│   ├── tsconfig.json                # TypeScript config
│   ├── package.json                 # Dependencies
│   └── env.example                  # Environment template
│
└── Backend/                         # Flask Python application
    ├── app.py                       # Application factory entry
    ├── config.py                    # Centralized config (165 lines)
    ├── extensions.py                # Flask-Limiter setup
    ├── requirements.txt             # Python dependencies
    │
    ├── controllers/                 # Route handlers (8 files)
    │   ├── auth_controller.py       # Login/Signup/Password (191 lines)
    │   ├── trade_controller.py      # Buyer/Supplier search (196 lines)
    │   ├── payment_controller.py    # Razorpay integration (272 lines)
    │   ├── admin_controller.py      # Admin operations
    │   ├── user_controller.py       # User profile
    │   ├── public_controller.py     # Public endpoints
    │   ├── sims_data_controller.py  # SIMS directory
    │   └── contact_controller.py    # Contact form
    │
    ├── services/                    # Business logic
    │   ├── auth_service.py          # Password hashing/validation
    │   └── email_service.py         # SMTP email sending
    │
    ├── repositories/                # Data access
    │   └── repo_provider.py         # Repository factory (singletons)
    │
    ├── modules/
    │   ├── db/
    │   │   └── postgres_models.py   # Table schemas + indexes (154 lines)
    │   └── repositories/
    │       ├── User/
    │       │   └── postgres_user_repository.py
    │       └── Admin/
    │           └── postgres_admin_repo.py
    │
    ├── middlewares/
    │   └── auth_middleware.py       # require_auth, require_admin decorators
    │
    ├── utils/
    │   ├── constants.py             # Country codes, status values
    │   ├── helpers.py               # Validation helpers
    │   └── hsn_data.py              # HS code data handling
    │
    ├── tools/                       # DB setup & seeding scripts
    │   ├── create_db.py             # Create PostgreSQL database
    │   ├── init_db.py               # Create all tables
    │   ├── seed_hscodes.py          # Load HS codes from CSV
    │   ├── seed_sims_directory.py   # Load SIMS buyers from JSON
    │   ├── run_live_indexes.py      # Create live DB indexes
    │   ├── run_trade_indexes.py     # Create trade indexes
    │   ├── delete_dummy.py          # Clean test data
    │   └── update_user_role.py      # Promote user to ADMIN
    │
    ├── static/                      # Data files (CSV, JSON)
    ├── logs/                        # Rotating log files
    └── env.example                  # Environment template
```

---

## 5. Frontend — Next.js App

### Rendering Strategy
Every page follows a **Server + Client split**:

```
/buyer
  ├── page.tsx          → Server Component
  │     exports: metadata (title, description, OG tags, Twitter cards)
  │     exports: JSON-LD structured data
  │     renders: <BuyerPageClient /> inside Suspense
  │
  └── BuyerPageClient.tsx → "use client"
        handles: animations (Framer Motion), API calls, user state
```

This pattern gives:
- **SEO**: Full metadata & structured data from server
- **Performance**: HTML rendered on server, hydrated on client
- **Interactivity**: Framer Motion animations, real-time search, Redux state

### State Management (Redux)
```
store/
  authSlice.ts   — user info, session token, license type
  store.ts       — configureStore
  hooks.ts       — useAppDispatch, useAppSelector (typed)
```

All API calls include the `session_token` from Redux state.

### Region Detection (proxy.ts)
The middleware at `proxy.ts` detects the user's region:
- Checks headers: `x-vercel-ip-country`, `cf-ipcountry`, `cloudfront-viewer-country`, `Accept-Language`
- Sets cookies: `x-region` (`IN` or `GLOBAL`), `x-currency` (`INR` or `USD`)
- 7-day expiry, accessible to client JS
- Used for currency display and pricing

### Client-Side Security (api-security.ts)
```typescript
// Features in lib/api-security.ts:
- Request rate limiting: 30 requests / 60 seconds (client-side)
- Input sanitization: Clean HS code search inputs
- Request signing: Session-Token, X-Request-Timestamp, X-Request-Nonce headers
- Bot detection: Checks webdriver, phantom, Selenium flags
- Browser fingerprinting: user-agent, language, resolution, timezone
```

### Key Pages
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | page.tsx + HomePageClient.tsx | Landing page with features, pricing |
| `/buyer` | BuyerPageClient.tsx | Search importers by HS code |
| `/supplier` | SupplierPageClient.tsx | Search exporters by HS code |
| `/buyers-directory` | BuyersDirectoryPageClient.tsx | SIMS verified Indian buyers |
| `/hsn` | HsnPageClient.tsx | HS code search & lookup |
| `/plans` | PlansPageClient.tsx | Subscription plans (INR/USD) |
| `/checkout` | CheckoutPageClient.tsx | Razorpay payment flow |
| `/profile` | Profile page | User account, license info |
| `/admin/*` | Admin dashboard | User & license management |

---

## 6. Backend — Flask API

### Application Factory (`app.py`)
```python
def create_app(config_override=None):
    app = Flask(__name__)

    # 1. Configure logging (RotatingFileHandler: 10MB, 7 backups)
    # 2. Load config (config.py)
    # 3. Initialize CORS (whitelist origins)
    # 4. Initialize rate limiter (200/min global)
    # 5. Register all blueprints (8 controllers)
    # 6. Add CSRF protection (before_request hook)
    # 7. Add security headers (after_request hook)
    # 8. Health check endpoint

    return app
```

### Blueprint Registration
| Blueprint | URL Prefix | Controller |
|-----------|-----------|-----------|
| `auth_bp` | `/api/auth` | auth_controller.py |
| `admin_bp` | `/api/admin` | admin_controller.py |
| `user_bp` | `/api/user` | user_controller.py |
| `payment_bp` | `/api/payment` | payment_controller.py |
| `sims_data_bp` | `/api/sims-data` | sims_data_controller.py |
| `public_bp` | (public) | public_controller.py |
| `contact_bp` | (contact) | contact_controller.py |
| `trade_bp` | `/api/trade` | trade_controller.py |

### Configuration System (`config.py`)
All config is loaded via helper functions:
```python
get_env("KEY")           # String env var
get_env_bool("DEBUG")    # Boolean env var
get_env_int("PORT")      # Integer env var
get_env_list("ORIGINS")  # Comma-separated list
```

Required env groups:
- Flask: `SECRET_KEY`, `ENV`, `DEBUG`, `HOST`, `PORT`
- Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- CORS: `CORS_ORIGINS` (comma-separated)
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- URLs: `FRONTEND_URL`, `DOMAIN_URL`, `BACKEND_URL`
- Admin: `WHITELISTED_ADMINS`
- SSL: `SSL_CERT_PATH`, `SSL_KEY_PATH` (production)

### Rate Limiting Strategy
| Endpoint | Limit |
|----------|-------|
| Global (all routes) | 200 / minute |
| `POST /api/auth/login` | 10 / minute |
| `POST /api/auth/signup` | 5 / minute |
| `POST /api/auth/resend-activation` | 3 / minute; 10 / hour |
| `POST /api/auth/forgot-password` | 5 / minute; 20 / hour |
| All `/api/trade/*` routes | 60 / minute |

---

## 7. Database Schema

### Tables Overview

```
PostgreSQL Database: scm_insights
```

#### `UserProfile` — Users & Customers
| Column | Type | Notes |
|--------|------|-------|
| `UserId` | UUID | Primary Key |
| `EmailId` | VARCHAR UNIQUE | Login identifier |
| `Name` | VARCHAR | Display name |
| `HashPassword` | VARCHAR | bcrypt hash |
| `LicenseType` | VARCHAR | TRIAL / TRADE / DIRECTORY / BUNDLE / null |
| `LicenseValidTill` | TIMESTAMP | License expiry |
| `CompanyName` | VARCHAR | Optional |
| `PhoneNumber` | VARCHAR | Optional |
| `gst` | VARCHAR | GST number (optional) |
| `activationStatus` | BOOLEAN | Email verified? |
| `Role` | VARCHAR | USER / ADMIN |
| `CreatedAt` | TIMESTAMP | Registration time |

#### `Session` — Active Login Sessions
| Column | Type | Notes |
|--------|------|-------|
| `SessionKey` | VARCHAR | Primary Key (session token) |
| `UserId` | UUID | FK → UserProfile |
| `ExpirationTime` | TIMESTAMP | Auto-expire |
| `ClientId` | VARCHAR | Browser/device ID |
| UNIQUE | `(UserId, ClientId)` | One session per device |

#### `License` — Plan Definitions
| Column | Type | Notes |
|--------|------|-------|
| `LicenseType` | VARCHAR | Primary Key |
| `LicenseInfoJson` | JSONB | Plan features, price, limits |

#### `UserToken` — Search Quota Tracking
| Column | Type | Notes |
|--------|------|-------|
| `UserId` | UUID | PK + FK |
| `StartTime` | TIMESTAMP | Token period start |
| `EndTime` | TIMESTAMP | Token period end |
| `TokensRemaining` | INTEGER | Remaining searches |

#### `AccountActivation` — Email Verification
| Column | Type | Notes |
|--------|------|-------|
| `ActivationToken` | VARCHAR | Primary Key |
| `UserId` | UUID | FK → UserProfile |
| `ExpirationTime` | TIMESTAMP | Token expiry |

#### `PasswordReset` — Password Recovery
| Column | Type | Notes |
|--------|------|-------|
| `ResetToken` | VARCHAR | Primary Key |
| `UserId` | UUID | FK → UserProfile |
| `ExpirationTime` | TIMESTAMP | Token expiry |

#### `PaymentTransaction` — Razorpay Orders
| Column | Type | Notes |
|--------|------|-------|
| `Id` | SERIAL | Primary Key |
| `RazorpayOrderId` | VARCHAR UNIQUE | Razorpay order ID |
| `RazorpayPaymentId` | VARCHAR | Razorpay payment ID |
| `UserId` | UUID | FK → UserProfile |
| `EmailId` | VARCHAR | Denormalized for queries |
| `LicenseType` | VARCHAR | Plan purchased |
| `AmountPaise` | INTEGER | Amount in paise (INR) |
| `Currency` | VARCHAR | INR |
| `Status` | VARCHAR | created / captured / failed |
| `SourceWebsite` | VARCHAR | Which website completed payment |
| `MetadataJson` | JSONB | Full Razorpay response |
| `CreatedAt` | TIMESTAMP | Order creation time |
| `UpdatedAt` | TIMESTAMP | Last status update |

#### `ContactMessage` — Contact Form Submissions
| Column | Type | Notes |
|--------|------|-------|
| `ContactId` | UUID | Primary Key |
| `Name` | VARCHAR | Sender name |
| `Email` | VARCHAR | Sender email |
| `PhoneNumber` | VARCHAR | Optional |
| `Message` | TEXT | Message body |
| `Status` | VARCHAR | new / read / replied |
| `CreatedTime` | TIMESTAMP | Submission time |

#### `HSCodeDescription` — HS Code Reference
| Column | Type | Notes |
|--------|------|-------|
| `Id` | SERIAL | Primary Key |
| `HsCode` | VARCHAR UNIQUE | HS/HSN code |
| `Unit` | VARCHAR | Unit of measure |
| `Description` | TEXT | HS code description |

**Indexes**: Prefix search on `HsCode` for fast autocomplete

#### `SimsDirectory` — Verified Indian Buyers
| Column | Type | Notes |
|--------|------|-------|
| `Id` | SERIAL | Primary Key |
| `IecCode` | VARCHAR | Import Export Code |
| `CompanyName` | VARCHAR | Business name |
| `Email` | VARCHAR | Contact email |
| `Mobile` | VARCHAR | Contact phone |
| `CreatedAt` | TIMESTAMP | Record created |
| `UpdatedAt` | TIMESTAMP | Record updated |

**Indexes**: CompanyName, Email, Mobile, IecCode for search performance

---

## 8. API Endpoints

### Authentication (`/api/auth/`)
| Method | Endpoint | Auth Required | Rate Limit | Description |
|--------|---------|--------------|-----------|-------------|
| POST | `/api/auth/login` | No | 10/min | Login, returns session_token + user details |
| POST | `/api/auth/logout` | Yes | Default | Clear session |
| POST | `/api/auth/signup` | No | 5/min | Register new account |
| POST | `/api/auth/account-activate` | No | Default | Activate account via email token |
| POST | `/api/auth/resend-activation` | No | 3/min; 10/hr | Resend activation email |
| POST | `/api/auth/forgot-password` | No | 5/min; 20/hr | Send password reset email |
| POST | `/api/auth/reset-password` | No | Default | Reset password via token |

### Trade Data (`/api/trade/`)
| Method | Endpoint | Auth Required | Rate Limit | Description |
|--------|---------|--------------|-----------|-------------|
| GET | `/api/trade/years` | Yes | 60/min | Get available years for an HS code + trade type |
| GET | `/api/trade/top` | Yes | 60/min | Get top buyers/suppliers (paginated, filtered) |
| GET | `/api/trade/summary` | Yes | 60/min | Get trade summary statistics |

**Query params for `/api/trade/top`**:
- `trade_type`: `importer` or `exporter`
- `hs_code`: 4-8 digit HS code
- `year`: 4-digit year
- `page`: Page number (default 1)
- `page_size`: 25 (Trial: 5, max 100)
- `country`: Filter by country
- `sort_by`: `frequency` or other fields
- `sort_order`: `asc` or `desc`

### Payment (`/api/payment/`)
| Method | Endpoint | Auth Required | Description |
|--------|---------|--------------|-------------|
| POST | `/api/payment/create-order` | Yes | Create Razorpay order for a plan |
| POST | `/api/payment/verify` | Yes | Verify payment + activate license |
| POST | `/api/payment/webhook` | No (HMAC) | Razorpay webhook for payment events |

### Admin (`/api/admin/`)
| Method | Endpoint | Auth + Admin | Description |
|--------|---------|-------------|-------------|
| GET | `/api/admin/users` | Yes | List all users (paginated, filtered, sorted) |
| GET | `/api/admin/users/export` | Yes | CSV export of all users |
| GET | `/api/admin/user` | Yes | Single user details |
| Various | `/api/admin/*` | Yes | User status, deletion, role management |

### Health & Public
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| GET | `/health` | No | DB connectivity check |
| Various | `/api/sims-data/*` | Varies | SIMS buyers directory |
| Various | `/api/user/*` | Yes | User profile management |
| POST | `/contact` | No | Contact form submission |

---

## 9. Authentication & Authorization

### Login Flow
```
User submits email + password
        ↓
Rate check (10/min per IP)
        ↓
CSRF header validation
        ↓
Fetch user from DB by EmailId
        ↓
bcrypt.verify(password, hash)
        ↓
Check activationStatus = true
        ↓
Create Session record (SessionKey, UserId, ClientId, ExpirationTime)
        ↓
Return: { session_token, user_details, license, tokens }
```

### Session Validation
Every protected endpoint uses `@require_auth` decorator:
```python
# middlewares/auth_middleware.py
@require_auth
def protected_route():
    # g.user_id, g.session_key available here
```

The decorator:
1. Reads `Session-Token` from request header
2. Queries `Session` table for matching, non-expired key
3. Sets `g.user_id` and `g.session_key`
4. Returns 401 if invalid or expired

### Admin Authorization
```python
@require_admin
def admin_route():
    # Only users with Role=ADMIN can reach here
```

Admin emails whitelisted via `WHITELISTED_ADMINS` env variable.

### Password Security
- Hashed with **bcrypt** (bcrypt 4.0.1)
- Strength requirements enforced on signup
- Password reset via time-limited token (stored in `PasswordReset` table)
- Account activation via time-limited token (stored in `AccountActivation` table)

---

## 10. Payment Integration (Razorpay)

### Payment Flow
```
1. User selects plan on /plans
2. Client calls POST /api/payment/create-order
   → Flask creates Razorpay order (INR amount)
   → Stores order with status="created" in PaymentTransaction
   → Returns: { razorpay_order_id, amount, currency, key_id }

3. Client opens Razorpay checkout popup
   → User enters card/UPI/netbanking details
   → Razorpay processes payment

4. On success, client calls POST /api/payment/verify
   → Flask verifies HMAC-SHA256 signature:
     signature = HMAC(razorpay_order_id + "|" + razorpay_payment_id, secret)
   → Updates transaction status = "captured"
   → Assigns license to UserProfile
   → Returns success

5. Razorpay also sends webhook to POST /api/payment/webhook
   → Flask validates webhook signature
   → Handles payment.captured and payment.failed events
   → Idempotent: handles duplicate webhook deliveries
```

### Supported Plans
| Plan | Access |
|------|--------|
| TRIAL | Trade search (5 rows max per search) |
| DIRECTORY | SIMS buyers directory only |
| TRADE | Full trade search (100 rows max) |
| BUNDLE | Full access (Trade + Directory) |

### Multi-Website Support
`PAYMENT_SOURCE_WEBSITE` env variable tracks which website completed the payment.

---

## 11. Security Architecture

### CSRF Protection
Custom implementation in `app.py` `before_request` hook:
```python
# Bypass: OPTIONS, GET, HEAD, webhook endpoints
# Validate at least ONE of these headers present:
- X-Requested-With
- X-Client
- Session-Token
# Plus Origin/Referer validation against CORS whitelist
```

### Content Security Policy (next.config.ts)
```
default-src 'self'
script-src 'self' checkout.razorpay.com api.razorpay.com (+ unsafe-eval in dev)
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: *.unsplash.com flagcdn.com
frame-src api.razorpay.com
connect-src 'self' api.razorpay.com lumberjack.razorpay.com (+ ws: in dev)
```

### Security Headers
| Header | Value | Set By |
|--------|-------|--------|
| `X-Content-Type-Options` | `nosniff` | Flask (after_request) |
| `X-Frame-Options` | `SAMEORIGIN` | Flask (after_request) |
| `Strict-Transport-Security` | `max-age=31536000` | Flask (production only) |
| `X-XSS-Protection` | `1; mode=block` | Next.js config |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Next.js config |
| `Permissions-Policy` | Blocks camera, mic, geolocation | Next.js config |

### Client-Side Protection (api-security.ts)
- **Rate limiting**: 30 API calls per 60 seconds (per client)
- **Input sanitization**: Cleans HS code inputs before sending
- **Bot detection**: Checks `navigator.webdriver`, phantom, Selenium globals
- **Browser fingerprinting**: user-agent + language + screen resolution + timezone
- **Request signing**: Nonce + timestamp headers to prevent replay attacks

### Logging
```python
RotatingFileHandler(
    "logs/app.log",
    maxBytes=10 * 1024 * 1024,  # 10 MB per file
    backupCount=7                 # Keep 7 rotated files
)
```

---

## 12. SEO & Metadata Architecture

### Structured Data (JSON-LD)
Each page exports relevant schema.org types:

| Page | JSON-LD Types |
|------|--------------|
| Homepage | `Organization`, `WebSite`, `SoftwareApplication`, `FAQPage` |
| Buyer/Supplier | `BreadcrumbList` |
| Buyers Directory | `DataCatalog` |
| About | `AboutPage`, `BreadcrumbList` |
| Contact | `ContactPage`, `BreadcrumbList` |
| Plans | `BreadcrumbList` |
| HSN | `BreadcrumbList` |

### Metadata Per Page
All pages export:
- `title`: Unique, keyword-rich
- `description`: 150-160 character summary
- `keywords`: Expanded keyword lists
- `openGraph`: OG title, description, image (1200x630)
- `twitter`: Twitter card with og-image.png

### Technical SEO Files
- `robots.ts`: Disallows `/checkout`, `/admin/*`, `/api/*`
- `sitemap.ts`: Includes all public routes with priorities, excludes `/checkout`
- `layout.tsx`: `lang="en-IN"`, hreflang alternate tags

---

## 13. License & Plans System

### Plan Tiers
```
TRIAL
  - Limited: 5 results per trade search
  - Time-limited
  - No directory access (or limited)

DIRECTORY
  - Full SIMS Buyers Directory access
  - No trade search

TRADE
  - Full trade search (100 rows max per query)
  - Years, countries, HS codes, sorting
  - No directory

BUNDLE
  - TRADE + DIRECTORY combined
  - Best value plan
```

### Plan-Based Access Control (trade_controller.py)
```python
license_type = g.user_license

if license_type == "DIRECTORY":
    return 403 # No trade access

elif license_type == "TRIAL":
    page_size = min(page_size, 5)  # Limit results

elif license_type in ["TRADE", "BUNDLE"]:
    page_size = min(page_size, 100)  # Full access
```

---

## 14. Email System

### Email Service (email_service.py)
```
Provider: Gmail SMTP
Host:     smtp.gmail.com
Port:     587
Security: TLS (STARTTLS)
```

### Email Types
| Email | Trigger | Template |
|-------|---------|---------|
| Account Activation | After signup | Link to `/account-activate?token=...` |
| Password Reset | After forgot-password request | Link to `/reset-password?token=...` |

### Current Limitation
Gmail SMTP limited to ~500 emails/day. Recommended upgrade to **AWS SES** or **Sendgrid** for production scale.

---

## 15. Deployment & Infrastructure

### Development Setup
```bash
# Backend
cd Backend
cp env.example .env  # Fill in values
pip install -r requirements.txt
python tools/create_db.py
python tools/init_db.py
python tools/seed_hscodes.py
python tools/seed_sims_directory.py
python app.py  # Runs on port 5001

# Frontend
cd Frontend
cp env.example .env
npm install
npm run dev  # Runs on port 3000
```

### Production
```
Backend:  gunicorn + SSL (port 443)
Frontend: next build + next start (port 3000)
Database: PostgreSQL (external)
```

### Environment Variables

**Frontend** (`env.example`):
```env
NEXT_PUBLIC_BACKEND_URL=https://api.scminsights.ai
```

**Backend** (`env.example`):
```env
# Flask
FLASK_ENV=production
FLASK_SECRET_KEY=<secret>
FLASK_HOST=0.0.0.0
FLASK_PORT=5001
FLASK_SSL_PORT=443

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<password>
DB_DATABASE=scm_insights

# CORS
CORS_ORIGINS=https://scminsights.ai,https://www.scminsights.ai

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASSWORD=<app-password>

# Razorpay
RAZORPAY_KEY_ID=<key>
RAZORPAY_KEY_SECRET=<secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret>
PAYMENT_SOURCE_WEBSITE=scminsights.ai

# URLs
FRONTEND_URL=https://scminsights.ai
DOMAIN_URL=https://scminsights.ai
BACKEND_URL=https://api.scminsights.ai

# Admin
WHITELISTED_ADMINS=admin@aashita.ai

# SSL
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

---

## 16. Known Issues & Tech Debt

### Legal / Compliance
| Issue | Risk | Status |
|-------|------|--------|
| Fake testimonials/statistics on homepage | Legal risk (ASCI guidelines) | Open |
| Privacy Policy — DPDP Act 2023 compliance | Legal requirement | Needs legal counsel |
| No GST invoice generation | Tax compliance | Open |

### Infrastructure
| Issue | Impact | Recommended Fix |
|-------|--------|----------------|
| Gmail SMTP (~500/day limit) | Cannot scale email | Migrate to AWS SES or Sendgrid |
| No Docker/containerization | Manual deployment only | Add Dockerfile + docker-compose |
| No CI/CD pipelines | Manual deployment | GitHub Actions / AWS CodePipeline |
| No test framework (Jest, pytest) | No automated testing | Add unit + integration tests |

### Code Quality
| Issue | Location | Fix |
|-------|---------|-----|
| `@hugeicons/mcp-server` in prod deps | Frontend/package.json | Move to devDependencies |
| `eslint-config-next` version mismatch | Frontend/package.json | Align with Next.js version |
| `game_of_squids/` in /public | Frontend/public/ | Investigate & remove if unused |
| No WhatsApp Business contact | Contact page | Add WhatsApp Business number |

---

## Quick Reference

### Key Commands
```bash
# Backend dev start
python app.py

# Backend prod start (example)
gunicorn -w 4 -b 0.0.0.0:5001 "app:create_app()"

# Frontend dev
npm run dev

# Frontend build + start
npm run build && npm start

# Seed HS codes
python tools/seed_hscodes.py

# Promote user to admin
python tools/update_user_role.py admin@example.com
```

### Health Check
```
GET https://api.scminsights.ai/health
→ { "status": "ok", "db": "connected" }
```

### Technology Versions (as of March 2026)
| Tech | Version |
|------|---------|
| Next.js | 16.1.6 |
| React | 19.2.3 |
| TypeScript | ^5 |
| Tailwind CSS | ^4.1.18 |
| Framer Motion | ^12.29.2 |
| Redux Toolkit | ^2.11.2 |
| Flask | 2.3.3 |
| Python | 3.x |
| PostgreSQL | (via psycopg >=3.1) |
| Gunicorn | 21.2.0 |
| bcrypt | 4.0.1 |

---

*Documentation generated: March 2026*
*Repository: d:\Aashita\Trade\ScmInsights*
*Company: Aashita Technosoft Pvt. Ltd.*
