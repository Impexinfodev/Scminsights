# SCM Insights – Website Audit Report

**Date:** March 2, 2025  
**Scope:** Frontend (Next.js), Backend (Flask), configuration, security, accessibility, UX

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **High** | 4 |
| **Medium** | 8 |
| **Low** | 18 |

**Top priorities:** Fix lint script, guard backend URL in logout, enforce production secret key, improve accessibility, replace placeholder links.

---

## 1. Project Structure

### Layout

```
Scminsights/
├── Frontend/          # Next.js 16 app
├── Backend/           # Flask API
└── README.md
```

### Issues

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 1.1 | Low | README.md | May reference old folder names (`backend-scm`, `SCM-INSIGHTS`). | Update README to match `Backend` and `Frontend`. |
| 1.2 | Low | Frontend/package.json | `"name": "my-project"` is generic. | Use `"scm-insights"` or `"scm-insights-frontend"`. |

---

## 2. TypeScript / Linter

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 2.1 | **Medium** | Frontend/package.json | `"lint": "eslint"` runs ESLint with no files or options. | Use `"lint": "next lint"` or `"eslint . --ext .ts,.tsx"`. |
| 2.2 | — | — | `npx tsc --noEmit` passes; no TypeScript errors. | — |

---

## 3. Code Quality

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 3.1 | **High** | BuyerPageClient.tsx, SupplierPageClient.tsx | ~840 lines each; nearly identical (Toast, state, dropdowns, fetch, table). | Extract shared `TradeSearchPage` with props for buyer vs supplier. |
| 3.2 | Medium | Multiple pages | Toast implemented separately in login, signup, buyer, supplier, etc. | Create shared `components/ui/Toast.tsx` and reuse. |
| 3.3 | Low | BuyerPageClient.tsx | State uses `suppliers` for buyer results; interface is `Supplier`. | Rename to `buyers` and `Buyer` for clarity. |
| 3.4 | Low | Various | Toast API differs: `{ title, description, status }` vs `{ message, type }`. | Standardize on one Toast API. |

---

## 4. Security

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 4.1 | **High** | Backend/config.py | `FLASK_SECRET_KEY` defaults to `"change-this-secret-in-production"`. | Require `FLASK_SECRET_KEY` in production; fail startup if missing. |
| 4.2 | **Medium** | Navbar.tsx (handleLogout) | `fetch(\`${backendUrl}/logout\`)` when `backendUrl` may be undefined. | Add `if (!backendUrl?.trim()) return;` before fetch. |
| 4.3 | Medium | authSlice.ts | Session token stored in localStorage; vulnerable to XSS. | Prefer httpOnly cookies for session tokens. |
| 4.4 | Low | layout.tsx | JSON-LD via `dangerouslySetInnerHTML`; content is app-controlled. | Acceptable; add comment that content is not user input. |
| 4.5 | Low | Multiple pages | Login guards `NEXT_PUBLIC_BACKEND_URL`; others do not. | Add env guard before API calls where applicable. |
| 4.6 | Low | .gitignore | `.env` is ignored; ensure `.env` is never committed. | Verify `.env` not in repo; add `Frontend/env.example`. |

---

## 5. Accessibility

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 5.1 | **Medium** | Navbar.tsx | Mobile menu button has no `aria-label`. | Add `aria-label={isOpen ? "Close menu" : "Open menu"}`. |
| 5.2 | Medium | Buyer/Supplier pages | Custom dropdowns use `mousedown`; no keyboard support. | Add `onKeyDown` for Enter/Space/Escape. |
| 5.3 | Low | Navbar.tsx | Profile dropdown button has no `aria-label`. | Add `aria-label="User menu"`. |
| 5.4 | Low | BuyerPageClient, SupplierPageClient | Toast close button has no `aria-label`. | Add `aria-label="Dismiss"`. |
| 5.5 | Low | Footer.tsx | Social icon links use `href="#"` and no `aria-label`. | Add `aria-label` (e.g. "LinkedIn", "Twitter", "Email"). |
| 5.6 | Low | Buyer/Supplier tables | Rows clickable but not focusable or keyboard-activatable. | Add `tabIndex={0}`, `onKeyDown` for Enter/Space. |
| 5.7 | Low | Pagination buttons | Buttons lack `aria-label`. | Add `aria-label="First page"`, etc. |

---

## 6. Performance

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 6.1 | — | next.config.ts | `optimizePackageImports` used for Hugeicons. | Good. |
| 6.2 | — | — | Next.js `Image` used with remote patterns. | Good. |
| 6.3 | Low | — | No `next/dynamic` for heavy components. | Consider dynamic import for admin, plans. |
| 6.4 | Low | — | Framer Motion, axios, Redux in use. | Monitor bundle size; consider lazy-loading. |

---

## 7. SEO

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 7.1 | — | layout.tsx | Title, description, keywords, OpenGraph, Twitter, JSON-LD. | Good. |
| 7.2 | — | sitemap.ts, robots.ts | Main pages included; API/auth disallowed. | Good. |
| 7.3 | Low | sitemap.ts | Missing `/plans`, `/plan`. | Add public pages if desired. |
| 7.4 | Low | Multiple | `scminsights.com` vs `scminsights.ai` in different places. | Standardize on one production domain. |

---

## 8. UX / UI

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 8.1 | **Medium** | Footer.tsx | Trade Analytics, Careers, Blog, Cookie Policy, GDPR, social links use `href="#"`. | Replace with real URLs or `/contact` until available. |
| 8.2 | — | Buyer/Supplier pages | "No buyers/suppliers found" with guidance. | Good. |
| 8.3 | — | Most pages | Toasts and redirects for session/API errors. | Good. |

---

## 9. Configuration

| # | Severity | Location | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 9.1 | **High** | Frontend | No `env.example` for `NEXT_PUBLIC_BACKEND_URL`. | Add `Frontend/env.example` with placeholder. |
| 9.2 | Low | Backend/config.py | CORS includes `http://192.168.1.21:3000`. | Remove or make configurable for production. |

---

## ESLint Issues (68 total: 39 errors, 29 warnings)

Key categories found when running `npm run lint`:
- **react-hooks/set-state-in-effect** – setState called synchronously in useEffect (account-activate, admin layout/page, plan, plans)
- **react-hooks/static-components** – SidebarContent created during render (admin layout)
- **react-hooks/refs** – Ref accessed during render (ReduxProvider)
- **@typescript-eslint/no-explicit-any** – Use proper types instead of `any`
- **@typescript-eslint/no-unused-vars** – Unused imports/variables

---

## Recommended Fix Order

1. **Immediate:** Fix lint script, backend URL guard in logout, aria-labels on Navbar ✅
2. **Short-term:** Replace placeholder Footer links, add env.example, enforce FLASK_SECRET_KEY in production ✅
3. **Medium-term:** Fix ESLint errors (setState in effects, component-in-render, refs)
4. **Long-term:** Extract shared TradeSearchPage, create shared Toast, httpOnly cookies, keyboard support
