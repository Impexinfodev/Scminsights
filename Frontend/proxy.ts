import { NextRequest, NextResponse } from "next/server";

// Indian IP ranges are broad — we use Accept-Language and timezone hints
// for a lightweight detection without a geo-IP database.
// Vercel/CloudFront deployments can pass x-vercel-ip-country or cf-ipcountry.

const INDIA_COUNTRY_CODE = "IN";

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

export function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const isIndia = detectIndia(req);
  const existingRegion = req.cookies.get("x-region")?.value;

  // Only set the cookie if not already set, to avoid overwriting explicit user choice
  if (!existingRegion) {
    res.cookies.set("x-region", isIndia ? "IN" : "GLOBAL", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
      httpOnly: false, // readable by JS for currency display
    });
  }

  // Hint for client-side: preferred currency
  if (!req.cookies.get("x-currency")?.value) {
    res.cookies.set("x-currency", isIndia ? "INR" : "USD", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, manifest, icons
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon|manifest|apple-touch-icon|og-image|api/).*)",
  ],
};
