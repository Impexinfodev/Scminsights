/**
 * API Security Utilities
 * Provides protection against data scraping and unauthorized access
 */

// Generate a unique request signature
export function generateRequestSignature(payload: object, timestamp: number): string {
  const data = JSON.stringify(payload) + timestamp.toString();
  // Simple hash for client-side validation (actual security is on backend)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Generate request headers with security parameters
export function getSecureHeaders(sessionToken: string): Record<string, string> {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  
  return {
    "Session-Token": sessionToken ?? "",
    "X-Request-Timestamp": timestamp.toString(),
    "X-Request-Nonce": nonce,
    "X-Client-Version": "1.0.0",
    "X-Request-Source": "web-client",
    // Prevent caching of sensitive data
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
  };
}

// Validate page size to prevent excessive data requests
export function validatePageSize(size: number, maxAllowed: number = 50): number {
  if (size < 1) return 10;
  if (size > maxAllowed) return maxAllowed;
  return size;
}

// Rate limit helper - tracks requests per time window
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number; // in milliseconds

  constructor(maxRequests: number = 30, timeWindowSeconds: number = 60) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowSeconds * 1000;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const resetTime = oldestRequest + this.timeWindow;
    return Math.max(0, resetTime - Date.now());
  }
}

// Singleton rate limiter instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(30, 60); // 30 requests per minute
  }
  return rateLimiterInstance;
}

// Sanitize search input to prevent injection
export function sanitizeSearchInput(input: string): string {
  if (!input) return "";
  // Remove potentially dangerous characters
  return input
    .replace(/[<>'"]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim()
    .substring(0, 200); // Limit length
}

// Validate and sanitize HS Code format
export function validateHsCode(code: string): string {
  if (!code) return "";
  // HS codes are typically 2-10 digits
  const cleaned = code.replace(/[^0-9]/g, "");
  return cleaned.substring(0, 10);
}

// Check if request appears to be from an automated source
export function isLikelyAutomated(): boolean {
  if (typeof window === "undefined") return true;
  
  // Check for common automation indicators
  const nav = navigator as Navigator & { webdriver?: boolean };
  const win = window as unknown as Record<string, unknown>;
  const doc = document as Document & Record<string, unknown>;
  const hasWebdriver = !!nav.webdriver;
  const hasPhantom = !!win.callPhantom || !!win._phantom;
  const hasSelenium = !!doc.__selenium_unwrapped;
  const hasCypherDom = !!win.cdc_adoQpoasnfa76pfcZLmcfl_Array;
  
  // Check for missing browser features that real browsers have
  const missingPlugins = navigator.plugins?.length === 0;
  const missingLanguages = !navigator.languages || navigator.languages.length === 0;
  
  return hasWebdriver || hasPhantom || hasSelenium || hasCypherDom || (missingPlugins && missingLanguages);
}

// Generate browser fingerprint for request validation
export function getBrowserFingerprint(): string {
  if (typeof window === "undefined") return "server";
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || "unknown",
  ];
  
  const fingerprint = components.join("|");
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Debounce function for search inputs
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Format numbers for display (prevents exposing exact values)
export function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "—";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}

// Mask sensitive data partially
export function maskEmail(email: string): string {
  if (!email) return "";
  const [localPart, domain] = email.split("@");
  if (!domain) return email;
  const maskedLocal = localPart.substring(0, 2) + "***";
  return `${maskedLocal}@${domain}`;
}

// Session validation
export function isSessionValid(session: Record<string, unknown> | null | undefined): boolean {
  if (!session) return false;
  if (!session.session_token) return false;
  if (session.session_expiration_time) {
    const expirationDate = new Date(session.session_expiration_time as string);
    if (expirationDate < new Date()) return false;
  }
  return true;
}
