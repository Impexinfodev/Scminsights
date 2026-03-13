/**
 * Detect if user is likely in India (for showing INR vs USD).
 * Uses timezone and locale; safe for SSR (returns false until client).
 */
export function isUserInIndia(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Kolkata") return true;
    const nav = navigator as Navigator & { userLanguage?: string };
    const lang = nav.language || nav.userLanguage || "";
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

export type PlanPriceBoth = {
  inrFormatted: string;
  usdFormatted: string;
  inIndia: boolean;
};

/**
 * Get both INR and USD display strings and location flag.
 * Use inIndia to decide: India => show only INR; otherwise => show both.
 */
export function getPlanPriceBoth(
  plan: { Price?: number; PriceINR?: number; PriceUSD?: number }
): PlanPriceBoth {
  const inIndia = typeof window !== "undefined" ? isUserInIndia() : false;
  const inrAmount = plan.PriceINR ?? plan.Price ?? 0;
  const usdAmount = plan.PriceUSD ?? plan.Price ?? 0;
  const inrFormatted =
    inrAmount === 0 ? "Free" : `₹${Number(inrAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const usdFormatted =
    usdAmount === 0 ? "Free" : `$${Number(usdAmount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return { inrFormatted, usdFormatted, inIndia };
}
