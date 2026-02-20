/**
 * Detect if user is likely in India (for showing INR vs USD).
 * Uses timezone and locale; safe for SSR (returns false until client).
 */
export function isUserInIndia(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Kolkata") return true;
    const lang = navigator.language || (navigator as any).userLanguage || "";
    if (lang.startsWith("en-IN") || lang.startsWith("hi")) return true;
  } catch {
    // ignore
  }
  return false;
}

export type PriceDisplay = { amount: number; currency: "INR" | "USD"; formatted: string };

/**
 * Get display price for a plan based on user location.
 * Prefers PriceINR/PriceUSD when present; falls back to Price (treated as USD).
 */
export function getPlanPriceDisplay(
  plan: { Price?: number; PriceINR?: number; PriceUSD?: number },
  inIndia?: boolean
): PriceDisplay {
  const useINR = inIndia ?? (typeof window !== "undefined" ? isUserInIndia() : false);
  if (useINR) {
    const amount = plan.PriceINR ?? plan.Price ?? 0;
    const formatted =
      amount === 0 ? "Free" : `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    return { amount, currency: "INR", formatted };
  }
  const amount = plan.PriceUSD ?? plan.Price ?? 0;
  const formatted =
    amount === 0 ? "Free" : `$${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return { amount, currency: "USD", formatted };
}
