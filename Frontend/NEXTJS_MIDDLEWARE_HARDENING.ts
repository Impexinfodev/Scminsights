/**
 * NEXTJS_MIDDLEWARE_HARDENING.ts
 * ==============================
 * Hardened replacement for proxy.ts
 *
 * AUDIT FINDINGS on current proxy.ts:
 *
 * FINDING 1 — Googlebot sees incorrect region (SEO impact):
 *   Googlebot does not send Accept-Language, x-vercel-ip-country, or cf-ipcountry
 *   headers. The current detectIndia() returns false for all crawlers, so they
 *   get region=GLOBAL and currency=USD. If any server-rendered content depends on
 *   x-region/x-currency cookies (e.g., pricing server-side), crawlers will see
 *   USD pricing, not INR. The cookie is httpOnly:false (JS-readable), meaning
 *   pricing is currently set client-side from the cookie — so SSR HTML is region-
 *   neutral. But future SSR pricing logic would be broken for crawlers.
 *   Fix: Detect known crawler User-Agents and skip cookie-setting for them.
 *
 * FINDING 2 — No bot/scraper protection at middleware level:
 *   The middleware currently applies no rate limiting, no bot fingerprinting,
 *   and no suspicious-UA detection. A scraper can hit /buyer or /supplier
 *   pages at will without any middleware friction.
 *   Fix: Add X-Robots-Tag header for sensitive routes, and return 403 for
 *   well-known headless browser UAs hitting trade search routes.
 *
 * FINDING 3 — Missing security headers in middleware:
 *   next.config.ts sets CSP and security headers for all responses, but the
 *   Next.js middleware can add additional per-request headers earlier in the
 *   pipeline (before the response is generated), enabling nonce-based CSP.
 *   Fix: Add per-request CSP nonce header so <script> and <style> tags can
 *   use nonces instead of 'unsafe-inline'.
 *
 * FINDING 4 — Cookie security attributes:
 *   x-region and x-currency cookies are set without `secure: true`.
 *   In production (HTTPS), these should be Secure to prevent downgrade attacks.
 *   Fix: Set `secure: true` when NODE_ENV === 'production'.
 *
 * FINDING 5 — No X-Robots-Tag for checkout/admin routes:
 *   While robots.ts disallows /checkout and /admin/* for crawlers, an HTTP-level
 *   X-Robots-Tag: noindex header provides a second line of defense in case
 *   Googlebot ignores robots.txt.
 *   Fix: Add X-Robots-Tag: noindex, nofollow for sensitive routes in middleware.
 *
 * HOW TO APPLY:
 *   Replace the content of Frontend/proxy.ts with this file's content.
 *   Or: copy the relevant sections into your existing proxy.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDIA_COUNTRY_CODE = "IN";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Known crawler/bot User-Agent substrings.
 * When detected: skip x-region/x-currency cookies (crawlers don't use them),
 * and serve clean HTML without currency-specific content.
 * Googlebot, Bingbot, DuckDuckBot are legitimate SEO crawlers — do NOT block them.
 */
const SEO_CRAWLER_UA_PATTERNS = [
  "googlebot",
  "bingbot",
  "slurp",           // Yahoo
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "facebot",         // Facebook
  "ia_archiver",     // Wayback Machine
  "applebot",
];

/**
 * Suspicious/headless browser UA patterns.
 * These hit trade search pages aggressively without authentication.
 * Block at middleware for unauthenticated trade-search routes.
 *
 * NOTE: Only block on SENSITIVE routes (defined in BLOCK_BOT_ROUTES below),
 * not on public marketing pages — that would hurt SEO and legitimate users.
 */
const SUSPICIOUS_UA_PATTERNS = [
  "headlesschrome",
  "phantomjs",
  "selenium",
  "python-requests",
  "go-http-client",
  "curl/",
  "wget/",
  "java/",
  "scrapy",
  "libwww-perl",
  "mechanize",
];

/**
 * Routes where suspicious UAs should receive a 403.
 * These are authenticated trade-data routes that have no SEO value
 * (they require login and are not indexed by Google).
 */
const BLOCK_BOT_ROUTES = ["/buyer", "/supplier", "/buyers-directory", "/hsn"];

/**
 * Routes that should have X-Robots-Tag: noindex, nofollow
 * (belt-and-suspenders alongside robots.ts disallow rules).
 */
const NOINDEX_ROUTES = [
  "/checkout",
  "/admin",
  "/profile",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/account-activate",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectIndia(req: NextRequest): boolean {
  // Cloud provider country headers (Vercel, Cloudflare, AWS CloudFront)
  const vercelCountry = req.headers.get("x-vercel-ip-country");
  const cfCountry = req.headers.get("cf-ipcountry");
  const amzCountry = req.headers.get("cloudfront-viewer-country");

  if (vercelCountry === INDIA_COUNTRY_CODE) return true;
  if (cfCountry === INDIA_COUNTRY_CODE) return true;
  if (amzCountry === INDIA_COUNTRY_CODE) return true;

  // Fallback: Accept-Language preference
  const acceptLang = req.headers.get("accept-language") || "";
  if (acceptLang.toLowerCase().includes("en-in")) return true;

  return false;
}

function isSeoCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return SEO_CRAWLER_UA_PATTERNS.some((p) => lower.includes(p));
}

function isSuspiciousBot(ua: string): boolean {
  if (!ua || ua.trim() === "") return true; // No UA = likely automated
  const lower = ua.toLowerCase();
  return SUSPICIOUS_UA_PATTERNS.some((p) => lower.includes(p));
}

function isBlockedRoute(pathname: string): boolean {
  return BLOCK_BOT_ROUTES.some((route) => pathname.startsWith(route));
}

function isNoIndexRoute(pathname: string): boolean {
  return NOINDEX_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Generate a per-request CSP nonce (16 random bytes, base64-encoded).
 * Use this nonce in layout.tsx for <script nonce={nonce}> tags,
 * enabling you to remove 'unsafe-inline' from script-src.
 *
 * USAGE IN layout.tsx:
 *   import { headers } from "next/headers";
 *   const nonce = headers().get("x-csp-nonce") ?? "";
 *   // Then pass nonce to Script components and inline scripts.
 */
function generateCspNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

// ---------------------------------------------------------------------------
// Main middleware function (replaces proxy() in proxy.ts)
// ---------------------------------------------------------------------------

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent") || "";

  // ------------------------------------------------------------------
  // 1. Bot mitigation: block suspicious UAs on sensitive routes
  //    These routes require auth anyway, but blocking at middleware
  //    reduces load on the Flask backend.
  // ------------------------------------------------------------------
  if (isBlockedRoute(pathname) && isSuspiciousBot(ua) && !isSeoCrawler(ua)) {
    return new NextResponse(
      JSON.stringify({ error: "Automated access not permitted." }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const res = NextResponse.next();

  // ------------------------------------------------------------------
  // 2. CSP Nonce — generate per-request nonce and pass via header
  //    so layout.tsx can embed it in <script> tags, removing unsafe-inline.
  // ------------------------------------------------------------------
  const nonce = generateCspNonce();
  res.headers.set("x-csp-nonce", nonce);

  // ------------------------------------------------------------------
  // 3. X-Robots-Tag — noindex for sensitive/auth routes
  //    Belt-and-suspenders alongside robots.ts disallow rules.
  // ------------------------------------------------------------------
  if (isNoIndexRoute(pathname)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  // ------------------------------------------------------------------
  // 4. Region detection — skip for known SEO crawlers.
  //    Crawlers don't use these cookies; setting them wastes a Set-Cookie
  //    header on every Googlebot request and can confuse cache layers.
  // ------------------------------------------------------------------
  if (isSeoCrawler(ua)) {
    // Let crawlers see the page without any region cookie.
    // They will receive the default (server-rendered) HTML.
    return res;
  }

  // ------------------------------------------------------------------
  // 5. Set x-region and x-currency cookies (unchanged logic from proxy.ts,
  //    with added `secure` attribute in production).
  // ------------------------------------------------------------------
  const isIndia = detectIndia(req);
  const existingRegion = req.cookies.get("x-region")?.value;

  const cookieOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax" as const,
    httpOnly: false, // readable by client JS for currency display
    secure: IS_PRODUCTION, // FIX: add Secure flag in production
  };

  if (!existingRegion) {
    res.cookies.set("x-region", isIndia ? "IN" : "GLOBAL", cookieOptions);
  }

  if (!req.cookies.get("x-currency")?.value) {
    res.cookies.set("x-currency", isIndia ? "INR" : "USD", cookieOptions);
  }

  return res;
}

// ---------------------------------------------------------------------------
// Matcher config — same as original proxy.ts
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, manifest, icons, og-image
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon|manifest|apple-touch-icon|og-image|api/).*)",
  ],
};


// ---------------------------------------------------------------------------
// AUDIT NOTE — CSRF Cookie Bypass in Backend (app.py line 125)
// ---------------------------------------------------------------------------
//
// CRITICAL FINDING: In Backend/app.py, the CSRF check has this bypass:
//
//   if request.cookies.get("session_token"):
//       return None
//
// This is a CSRF vulnerability. A CSRF attack works by crafting a page that
// causes the victim's browser to make a cross-origin request — and the browser
// automatically sends cookies with that request. So checking for the presence
// of a session_token COOKIE does not prove the request came from your JS client.
//
// A malicious site could submit a form POST to /api/auth/logout (or any endpoint)
// and the CSRF check would pass if the user has a session_token cookie.
//
// FIX: Remove lines 124-126 from app.py:
//   # REMOVE THIS BLOCK:
//   if request.cookies.get("session_token"):
//       return None
//
// The existing checks (X-Requested-With / X-Client / Session-Token HEADER) are
// correct CSRF mitigations because custom headers require a CORS preflight,
// which browsers enforce. The cookie bypass undermines the entire protection.
//
// After removing: Ensure all frontend axios calls include at least one of:
//   headers["Session-Token"] = sessionToken   ← from Redux store
//   headers["X-Requested-With"] = "XMLHttpRequest"
//
// The getSecureHeaders() in api-security.ts already sets "Session-Token",
// so authenticated calls are safe. Verify that public form submissions
// (contact form, signup) also include "X-Requested-With" header.
