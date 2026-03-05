# SCM INSIGHTS - Full Pre-Launch Audit Report
**Date:** March 2026
**Auditor:** Claude Code (Deep Code Audit)
**Scope:** Full-stack audit for Indian market launch readiness
**Stack:** Next.js 16 (React 19) frontend + Flask/PostgreSQL backend

---

## Executive Summary

The codebase is reasonably well-structured with proper auth, Razorpay payment integration, CORS/CSRF protection, and SEO foundations. However, **several critical and high-priority issues must be resolved before an Indian market launch**, particularly around legal compliance (DPDP Act 2023), security hardening, fake/placeholder content, and infrastructure readiness.

**Overall Readiness: 6/10 - NOT launch-ready without fixes below**

---

## CRITICAL ISSUES (Must Fix Before Launch)

### C1. Privacy Policy - DPDP Act 2023 Non-Compliance
**File:** [Frontend/app/policy/page.tsx](Frontend/app/policy/page.tsx)

The Privacy Policy is a generic placeholder with only 6 bare-bones sections. India's **Digital Personal Data Protection (DPDP) Act 2023** requires specific disclosures:
- Name and contact details of Data Fiduciary
- Purpose of data processing with legal basis
- Rights of Data Principals (access, correction, erasure, grievance)
- Data localisation obligations
- Grievance Officer details (name, contact, designated timeframes)
- Cross-border data transfer disclosures
- Consent withdrawal mechanism
- Retention periods per data category

**Action:** Engage a legal counsel to rewrite Privacy Policy for DPDP Act 2023 compliance before launch.

---

### C2. Terms of Service - Critically Incomplete for India
**File:** [Frontend/app/terms-of-use/page.tsx](Frontend/app/terms-of-use/page.tsx)

Missing India-specific mandatory clauses:
- Governing law: "Laws of India" not specified (currently omitted entirely)
- Jurisdiction: No Indian court jurisdiction stated
- Refund/Cancellation Policy (mandatory for Indian e-commerce under Consumer Protection Act 2019)
- GST/Tax treatment disclosure (Indian users purchasing paid plans)
- No arbitration clause or dispute resolution mechanism under India Arbitration Act
- No mention of IT Act 2000 compliance

**Action:** Rewrite ToS with Indian law provisions, especially refund policy for Razorpay payments.

---

### C3. No Refund/Cancellation Policy Page
The platform accepts payments via Razorpay (INR). Under **Consumer Protection (E-Commerce) Rules 2020**, an explicit cancellation and refund policy is **legally required** for Indian e-commerce. No such page exists in the sitemap or navigation.

**Action:** Create `/refund-policy` page and link it from footer, checkout page, and plans page.

---

### C4. Fake/Fabricated Testimonials
**File:** [Frontend/app/page.tsx:523-578](Frontend/app/page.tsx#L523-L578)

The homepage contains completely fabricated testimonials with stock Unsplash photos:
- "Sarah Chen" - Head of Procurement, Global Trade Corp
- "Rajesh Kumar" - Export Manager, Textile Industries Ltd
- "Michael Fischer" - Director of Operations, EuroTrade GmbH

These are fictional characters. Publishing fake testimonials is:
- Misleading under India's **Advertising Standards Council of India (ASCI)** guidelines
- Potentially violates **Consumer Protection Act 2019** Section 2(47) - unfair trade practices
- Risks brand credibility damage if discovered

**Action:** Remove all fabricated testimonials. Replace with real user feedback or remove the section entirely until genuine testimonials are collected.

---

### C5. Fake/Unverified Statistics
**File:** [Frontend/app/page.tsx](Frontend/app/page.tsx)

The homepage displays unverified claims:
- "Trusted by 10,000+ businesses worldwide" (hero badge, repeated multiple times)
- "50M+ Records", "1M+ Companies", "209+ Countries"
- Live shipments widget showing "12,847 Active today" (hardcoded static number)
- "$2.4B Trade Volume" with "+12.5% vs last month" (hardcoded static values)
- "98% Satisfaction Rate" (no source)
- "99.5% accuracy" for verified data
- "Fortune 500" trust badge (implying Fortune 500 clients - requires proof)

JSON-LD in layout.tsx has:
- `ratingValue: "4.9"` with `ratingCount: "2150"` - fabricated aggregate rating for Schema.org

**Action:** Either back these with real data or replace with verifiable claims. Remove the fake live widgets. The fabricated AggregateRating in structured data could get the site penalized by Google.

---

### C6. Razorpay Webhook Secret Leaked in env.example
**File:** [Backend/env.example:48](Backend/env.example#L48)

```
RAZORPAY_WEBHOOK_SECRET=dgOKJb3cVHr81VhFnErfkCw66uBxFDfultTnXHvMhWjF49njzKGpdS9kBXLjV8h0
```

A real-looking secret value is committed in env.example. If this secret is the same one used in the Razorpay dashboard, it must be rotated immediately. Even if it is just a placeholder, it trains developers to leave real secrets in example files.

**Action:** Replace with `your_razorpay_webhook_secret_here` placeholder. If this value was ever used in production, rotate the Razorpay webhook secret immediately.

---

### C7. CSRF Protection is Incomplete
**File:** [Backend/app.py:66-83](Backend/app.py#L66-L83)

The CSRF check only covers a narrow list of paths:
```python
state_changing = (
    path in ("/login", "/signup", "/logout", "/forgot-password")
    or path.startswith("/api/auth/")
    or path.startswith("/api/contact")
)
if not state_changing:
    return None  # All other POST/PUT/DELETE routes bypass CSRF
```

This means `/api/payment/create-order`, `/api/admin/*`, `/api/user/*`, `/api/trade/*` - all state-changing routes - are **not covered by CSRF checks**.

**Action:** Either extend the CSRF check to all `/api/` routes, or use a proper CSRF token mechanism.

---

## HIGH PRIORITY ISSUES

### H1. Missing Content Security Policy (CSP) Headers
Neither the Next.js config nor Flask backend sets a Content Security Policy header. The site loads images from Unsplash and flagcdn.com, and inline scripts via `dangerouslySetInnerHTML` for JSON-LD. Without CSP:
- XSS attacks have no browser-level mitigation
- Required for PCI DSS compliance (Razorpay payments)

**File:** [Frontend/next.config.ts](Frontend/next.config.ts)

**Action:** Add CSP headers in `next.config.ts` using the `headers()` export.

---

### H2. Password Reset Token Passed as Query Param
**File:** [Backend/controllers/auth_controller.py:163](Backend/controllers/auth_controller.py#L163)

```python
token = request.args.get("token", "").strip()
```

The reset token is a URL query parameter (e.g., `/reset-password?token=abc`). This means:
- Token appears in server access logs
- Token is sent in `Referer` headers to third-party services
- Browser history stores tokens

**Action:** Accept token in the POST request body instead of query params. Same issue exists for account activation at line 113.

---

### H3. No Rate Limiting on Critical Endpoints
**File:** [Backend/app.py:87-90](Backend/app.py#L87-L90)

Rate limiting is applied at specific endpoints but gaps exist:
- `/api/auth/resend-activation` - no rate limit (email bombing vector)
- `/api/auth/forgot-password` - 5/min via legacy route, but `/api/auth/forgot-password` blueprint route is not rate-limited
- `/api/trade/years` and `/api/trade/summary` - no rate limit
- `/api/admin/*` - no rate limit

**Action:** Apply `@limiter.limit()` to resend-activation, all auth endpoints, and data endpoints.

---

### H4. No GST Registration Display / Invoice Generation
Indian customers paying for plans expect a GST-compliant invoice. There is:
- No GST number field in signup (only CompanyName, PhoneNumber)
- No invoice generation after payment
- No GST breakdown in checkout or order confirmation

Under GST laws, B2B customers need tax invoices to claim Input Tax Credit (ITC).

**Action:** Add GST number field to user profile, implement invoice PDF generation post-payment.

---

### H5. External Images Used as Hero and Feature Images
**File:** [Frontend/app/page.tsx:46-52](Frontend/app/page.tsx#L46-L52)

All hero, feature, and testimonial images are loaded from Unsplash:
```js
hero: "https://images.unsplash.com/photo-1578575437130-527eed3abbec",
```

Problems:
- Unsplash free tier has rate limits; images can 429 under load
- No control over image availability (images can be deleted by photographers)
- Privacy: Unsplash may set cookies or track users
- Slower LCP (Largest Contentful Paint) vs self-hosted images

**Action:** Download and self-host all production images in `/public/images/`. Use Next.js image optimization.

---

### H6. Hardcoded Fake Live Data Widgets
**File:** [Frontend/app/page.tsx:219-244](Frontend/app/page.tsx#L219-L244)

The hero section floating cards show:
- "Live Shipments: 12,847 Active today" - hardcoded static number
- "Trade Volume: $2.4B" with "+12.5% vs last month" - hardcoded static number

These are fake live statistics presented as real data to users.

**Action:** Remove these widgets or replace with actual real-time API data.

---

### H7. No Error Boundary or Global Error Handling in Frontend
The Next.js app has no `error.tsx` or `global-error.tsx` pages. If an unhandled error occurs, users will see Next.js default error UI. No structured error tracking (Sentry, etc.) is configured.

**Action:** Create `app/error.tsx` and `app/global-error.tsx`. Integrate error monitoring (Sentry recommended).

---

### H8. No Loading States / Skeleton UI for Data Pages
Pages that fetch data (buyer, supplier, directory) show a spinner but no skeleton UI. On slow Indian mobile connections (4G/3G), blank loading states hurt perceived performance significantly.

**Action:** Implement skeleton loading cards for buyer/supplier search results.

---

## MEDIUM PRIORITY ISSUES

### M1. OG Image is Not Referenced in Metadata
**File:** [Frontend/app/layout.tsx:56-63](Frontend/app/layout.tsx#L56-L63)

OpenGraph metadata has no `images` property set - no OG image URL. When shared on WhatsApp, LinkedIn, Twitter in India, the link preview will show no image.

Note: `/public/og-image.png` exists in the public folder but is NOT referenced in layout.tsx metadata.

**Action:** Add `images: [{ url: "/og-image.png", width: 1200, height: 630 }]` to OpenGraph config.

---

### M2. Structured Data Has Fabricated AggregateRating
**File:** [Frontend/app/layout.tsx:157-163](Frontend/app/layout.tsx#L157-L163)

```js
aggregateRating: {
  ratingValue: "4.9",
  ratingCount: "2150",
```

Google explicitly penalizes or ignores fake AggregateRating markup. If flagged, the site may lose rich snippet eligibility.

**Action:** Remove AggregateRating from structured data until you have real reviews.

---

### M3. Hindi/Regional Language Support Missing
For Indian market penetration, at minimum partial Hindi UI or landing page would significantly increase conversions. Currently 100% English only.

**Action (medium-term):** Add `hi` locale with at least a Hindi landing page and marketing content.

---

### M4. No WhatsApp Business Integration
Indian B2B customers heavily use WhatsApp. The contact page has no WhatsApp option. Competitors like Zauba Corp, ExportGenius offer WhatsApp contact.

**Action:** Add WhatsApp Business number to contact page and footer.

---

### M5. Robots.txt Does Not Block /checkout
**File:** [Frontend/app/robots.ts](Frontend/app/robots.ts)

`/checkout` is a transactional page that should not be indexed by search engines, but it is missing from the disallow list. Also `/hsn` exists as a route but is not in sitemap.

**Action:** Add `/checkout` to disallow list. Add `/hsn` to sitemap if it is a public content page.

---

### M6. `@hugeicons/mcp-server` in Production Dependencies
**File:** [Frontend/package.json:13](Frontend/package.json#L13)

```json
"@hugeicons/mcp-server": "^0.2.1"
```

This is an MCP (Model Context Protocol) server package - a development/AI tooling package incorrectly placed in production `dependencies`. This adds unnecessary bundle weight.

**Action:** Move to `devDependencies` or remove entirely if not used.

---

### M7. `eslint-config-next` Version Mismatch
**File:** [Frontend/package.json:33](Frontend/package.json#L33)

```json
"eslint-config-next": "^0.2.4"
```

This is version 0.2.4 but Next.js is 16.1.6. The official `eslint-config-next` should match the Next.js major version. This causes ESLint config errors in CI/CD.

**Action:** Update `eslint-config-next` to the correct version matching Next.js.

---

### M8. `postcss` in Regular Dependencies
**File:** [Frontend/package.json:21](Frontend/package.json#L21)

`postcss` is in `dependencies` but should be in `devDependencies` as it is a build-time tool, not a runtime dependency.

---

### M9. No Logging Infrastructure
**File:** [Backend/app.py](Backend/app.py)

The backend uses Python's `logging` module but there is no log aggregation, rotation, or centralized logging configured. `print()` statements exist in config.py and email_service.py. For production:
- No structured JSON logging
- No log rotation policy
- No alerting on errors or exceptions
- `print(f"CORS Origins: {CORS_ORIGINS}")` leaks config on startup

**Action:** Configure Python `logging` with RotatingFileHandler + integrate with a logging service. Remove all `print()` statements from production code.

---

### M10. No Uptime Monitoring
The `/health` endpoint exists but no uptime monitoring service is configured. The homepage claims "99.9% Uptime" with no mechanism to verify or ensure it.

**Action:** Set up UptimeRobot or Freshping monitoring on the /health endpoint.

---

### M11. Contact Form Has No Phone Number Field
Indian B2B customers strongly prefer phone contact. The contact form has no phone number field. This reduces conversion for Indian users who want callback.

---

### M12. Currency Detection is Client-Side Only
**File:** [Frontend/lib/currency.ts:5-16](Frontend/lib/currency.ts#L5-L16)

INR/USD detection relies on `Intl.DateTimeFormat().resolvedOptions().timeZone` and `navigator.language`. This means:
- Server-side rendered pages always show USD first (no `window` on server)
- Users with VPN/proxy see wrong currency

**Action:** Use server-side IP geolocation via Next.js middleware (checking `x-forwarded-for`) to detect India-based users and serve INR pricing by default.

---

### M13. Email Service Uses Gmail SMTP
**File:** [Backend/env.example:35-36](Backend/env.example#L35-L36)

Gmail SMTP has a limit of ~500 emails/day. For a production Indian launch with thousands of users, transactional emails need a dedicated provider such as AWS SES, SendGrid, Mailgun, or Indian providers like Netcore or Sendx.

---

## LOW PRIORITY / QUALITY IMPROVEMENTS

### L1. Missing PWA Icons in manifest.json
**File:** [Frontend/public/manifest.json](Frontend/public/manifest.json)

PNG icons exist in `/public/` but the manifest.json only references the SVG favicon. Android "Add to Home Screen" requires proper PNG entries at 192x192 and 512x512.

---

### L2. `apple-touch-icon` Not Referenced in Metadata
`apple-touch-icon.png` exists in `/public/` but is not referenced in layout.tsx icons. iOS Safari will not show a proper home screen icon.

**Action:** Add `{ url: "/apple-touch-icon.png", rel: "apple-touch-icon" }` to layout icons metadata.

---

### L3. Legal Pages are `"use client"` - Hurts SEO
**File:** [Frontend/app/policy/page.tsx:1](Frontend/app/policy/page.tsx#L1), [Frontend/app/terms-of-use/page.tsx:1](Frontend/app/terms-of-use/page.tsx#L1)

These are static content pages marked `"use client"` only for framer-motion animations. This disables SSR and hurts SEO for these legally important pages.

**Action:** Remove `"use client"` from legal pages. Use server components.

---

### L4. Homepage is Fully Client-Side - Hurts Core Web Vitals
**File:** [Frontend/app/page.tsx:1](Frontend/app/page.tsx#L1)

The entire homepage is a client component. The initial HTML has no meaningful content, hurting:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- Google SEO crawlability

**Action:** Split into server component shell + `"use client"` animation wrappers.

---

### L5. No Cookie Consent Banner
While India's DPDP Act does not mandate cookie banners like GDPR, the site loads images from Unsplash (third-party), which may set cookies. A basic cookie notice improves trust with corporate Indian buyers.

---

### L6. No `<noscript>` Fallback
Users with JavaScript disabled on low-end Android phones will see a blank page since the homepage is fully client-rendered. A basic `<noscript>` message would improve accessibility.

---

### L7. UPI Not Prominently Featured in Marketing Copy
Razorpay supports UPI, but the marketing copy focuses on general payment without calling out UPI specifically. UPI is the most used payment method in India (over 10B transactions/month). Mentioning UPI explicitly in plans/checkout pages builds trust with Indian users.

---

### L8. `game_of_squids` Folder in /public
**Directory:** [Frontend/public/game_of_squids/](Frontend/public/game_of_squids/)

An unknown folder named `game_of_squids` exists in the public directory. Public folder contents are served directly. Investigate what this contains and remove if not needed.

---

## INDIA-SPECIFIC LAUNCH CHECKLIST

| Item | Status | Priority |
|------|--------|----------|
| DPDP Act 2023 Privacy Policy | MISSING | Critical |
| Refund/Cancellation Policy | MISSING | Critical |
| Terms with Indian jurisdiction | INCOMPLETE | Critical |
| GST Invoice generation | MISSING | High |
| GST number field for B2B | MISSING | High |
| Razorpay Live Keys (not test) | VERIFY | Critical |
| Razorpay webhook secret rotated | VERIFY | Critical |
| UPI prominently featured | VERIFY | High |
| Transactional email provider | MISSING | High |
| Data stored on Indian servers | VERIFY | High |
| Grievance Officer designation | MISSING | Critical |
| WhatsApp Business contact | MISSING | Medium |
| Hindi content / landing page | MISSING | Medium |
| IP-based INR auto-detection | PARTIAL | Medium |
| Uptime monitoring | MISSING | High |
| Error monitoring (Sentry) | MISSING | High |
| Real testimonials | MISSING | Critical |
| Verified statistics | UNVERIFIED | Critical |

---

## SECURITY SCORECARD

| Category | Score | Notes |
|----------|-------|-------|
| Authentication | 7/10 | Session tokens OK; no MFA; token also in headers |
| Authorization | 8/10 | require_auth + require_admin decorators work correctly |
| CSRF Protection | 5/10 | Only covers auth routes, not payment/admin API routes |
| Input Validation | 7/10 | HS code, email, password validated; good |
| Rate Limiting | 6/10 | Gaps on resend-activation, data endpoints |
| SQL Injection | GOOD | Parameterized queries via psycopg assumed |
| XSS Protection | 6/10 | No CSP header; dangerouslySetInnerHTML used |
| Secrets Management | 5/10 | Real-looking secret in env.example |
| HTTPS/TLS | 7/10 | SSL configured but depends on deployment |
| Logging/Monitoring | 3/10 | No production log infrastructure |

---

## PERFORMANCE SCORECARD

| Category | Status | Notes |
|----------|--------|-------|
| SSR (Server-Side Rendering) | PARTIAL | Homepage is full client component |
| Image Optimization | POOR | All images from Unsplash CDN, not self-hosted |
| Bundle Size | FAIR | Package splits configured; mcp-server in prod deps |
| Font Loading | OK | SFPRO font served from /public/SFPRO |
| Code Splitting | AUTO | Next.js handles this automatically |
| CDN Setup | UNKNOWN | Depends on hosting configuration |
| Core Web Vitals | ESTIMATED POOR | Full client homepage hurts LCP |

---

## SEO SCORECARD

| Category | Score | Notes |
|----------|-------|-------|
| Meta Tags | 8/10 | Good metadata in layout.tsx |
| Structured Data | 5/10 | JSON-LD present but contains fake ratings |
| Sitemap | 7/10 | Present but missing /hsn, missing /checkout in robots |
| Robots.txt | 7/10 | Present, /checkout not blocked |
| OpenGraph | 5/10 | Missing OG image reference (file exists, not linked) |
| Canonical URLs | 8/10 | Set per page |
| Page Speed (estimated) | 5/10 | Full client homepage, Unsplash images |
| Hindi SEO | 0/10 | No Hindi content |
| hreflang for India | MISSING | lang="en" instead of "en-IN" |

---

## RECOMMENDED ACTION PRIORITY

### Before Launch (Must Do)
1. Fix Privacy Policy for DPDP Act 2023 - get legal review
2. Add Refund/Cancellation Policy page
3. Rewrite Terms with Indian jurisdiction and refund clauses
4. Remove all fake testimonials and fabricated statistics from homepage
5. Remove fabricated AggregateRating from JSON-LD structured data
6. Rotate Razorpay webhook secret if env.example value was ever used in production
7. Configure Razorpay LIVE keys (verify not using test keys rzp_test_*)
8. Set up transactional email provider (not Gmail - use AWS SES or similar)
9. Add `/checkout` to robots.txt disallow list
10. Investigate and clean up `public/game_of_squids/` folder

### Week 1-2 Post-Launch
1. Designate a Grievance Officer (required under DPDP Act)
2. Implement GST invoice generation
3. Add GST number field to user profile
4. Replace Unsplash images with self-hosted images
5. Add CSP headers in Next.js config
6. Extend CSRF check to all state-changing API routes
7. Add error.tsx and global-error.tsx
8. Set up uptime monitoring (UptimeRobot / Freshping)
9. Set up error monitoring (Sentry)
10. Add OG image reference to layout.tsx metadata

### Month 1
1. IP-based INR/USD detection via Next.js middleware
2. WhatsApp Business integration on contact page and footer
3. Hindi landing page (or at minimum Hindi meta content)
4. Add apple-touch-icon and PWA icon manifest entries
5. Move legal pages off "use client" to improve SEO
6. Proper logging infrastructure with log rotation
7. Add rate limiting to resend-activation and data endpoints
8. Fix eslint-config-next version
9. Move mcp-server and postcss to devDependencies

---

*Report generated by Claude Code. This is a code-level audit and does not replace legal counsel for DPDP Act, GST, or e-commerce compliance matters. Engage qualified Indian legal and CA professionals for regulatory compliance.*
