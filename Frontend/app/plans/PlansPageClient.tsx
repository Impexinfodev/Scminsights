"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Database01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  ArrowRight01Icon,
  Login02Icon,
  UserIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  AlertCircleIcon,
  CrownIcon,
  DiamondIcon,
  StarIcon,
  FlashIcon,
  GlobalIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import axios from "axios";
import { useUser } from "@/hooks/useUser";
import { getPlanPriceBoth } from "@/lib/currency";

/* =========================================
   Types & Utilities
   ========================================= */

type AccessShape = {
  Access: "full" | "limited" | "none";
  MaxRows?: number;
  MaxRowsPerSearch?: number;
  MaxSearchesPerPeriod?: number;
};

type Plan = {
  LicenseType: string;
  LicenseName: string;
  Price?: number;
  PriceINR?: number;
  PriceUSD?: number;
  ShortDescription: string;
  Directory: AccessShape;
  Buyers: AccessShape;
  Suppliers: AccessShape;
  Validity?: string;
  IsTopPlan?: boolean;
};

const PLAN_ORDER: readonly string[] = ["TRIAL", "DIRECTORY", "TRADE", "BUNDLE"] as const;
const API_REQUEST_TIMEOUT = 10000;

function getPlanRank(licenseType: string): number {
  return PLAN_ORDER.indexOf(licenseType as any);
}

function isPlanHigherThan(myType: string | null, cardType: string): boolean {
  if (!myType) return true;
  return getPlanRank(cardType) > getPlanRank(myType);
}

function isPlanLowerThan(myType: string | null, cardType: string): boolean {
  if (!myType) return false;
  return getPlanRank(cardType) < getPlanRank(myType);
}

function getAccessSummary(
  access: AccessShape
): { type: "full" | "limited" | "none"; text: string } {
  if (access.Access === "full") return { type: "full", text: "Unlimited access" };
  if (access.Access === "limited") {
    const maxRows = access.MaxRows ?? 0;
    const perSearch = access.MaxRowsPerSearch ?? 0;
    if (maxRows > 0) return { type: "limited", text: `${maxRows} rows, ${perSearch}/search` };
    if (perSearch > 0) return { type: "limited", text: `Up to ${perSearch} rows/search` };
  }
  return { type: "none", text: "No access included" };
}

/* =========================================
   Themes Definitions
   ========================================= */

type PlanTheme = {
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconText: string;
  icon: typeof CrownIcon;
  ctaClass: string;
  isBestValue?: boolean;
  borderClass: string;
  ringClass: string;
};

const PLAN_THEMES: Record<string, PlanTheme> = {
  TRIAL: {
    accentColor: "text-amber-600",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    iconBg: "bg-amber-50 rounded-xl border border-amber-200",
    iconText: "text-amber-500",
    icon: StarIcon,
    ctaClass: "bg-white border-2 border-gray-200 text-gray-800 hover:border-amber-400 hover:bg-amber-50",
    borderClass: "border-gray-200 hover:border-amber-300",
    ringClass: "ring-amber-400",
  },
  DIRECTORY: {
    accentColor: "text-blue-600",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    iconBg: "bg-blue-50 rounded-xl border border-blue-200",
    iconText: "text-blue-500",
    icon: Database01Icon,
    ctaClass: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20",
    borderClass: "border-gray-200 hover:border-blue-300",
    ringClass: "ring-blue-500",
  },
  TRADE: {
    accentColor: "text-purple-600",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    iconBg: "bg-purple-50 rounded-xl border border-purple-200",
    iconText: "text-purple-500",
    icon: GlobalIcon,
    ctaClass: "bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-600/20",
    borderClass: "border-gray-200 hover:border-purple-300",
    ringClass: "ring-purple-500",
  },
  BUNDLE: {
    accentColor: "text-indigo-600",
    badgeBg: "bg-indigo-600",
    badgeText: "text-white",
    iconBg: "bg-indigo-50 rounded-xl border border-indigo-200",
    iconText: "text-indigo-600",
    icon: CrownIcon,
    ctaClass: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25",
    isBestValue: true,
    borderClass: "border-indigo-400 shadow-lg shadow-indigo-500/10",
    ringClass: "ring-indigo-500",
  },
};

const DEFAULT_THEME: PlanTheme = {
  ...PLAN_THEMES["TRIAL"],
  icon: DiamondIcon,
};

/* =========================================
   UI Components
   ========================================= */

function AccessRow({ icon, label, access }: { icon: any; label: string; access: AccessShape }) {
  const { type, text } = getAccessSummary(access);

  const statusColor =
    type === "full" ? "text-emerald-500" : type === "limited" ? "text-amber-500" : "text-gray-300";

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0 last:pb-0">
      <div className={`p-1 rounded-md bg-gray-50 border border-gray-100`}>
        <HugeiconsIcon icon={icon} size={12} className="text-gray-500" />
      </div>
      <div className="flex-1 text-xs text-gray-700 font-medium">{label}</div>
      <div className="flex items-center gap-1 text-right">
        <span className="text-xs text-gray-500 truncate max-w-[100px]">{text}</span>
        <HugeiconsIcon
          icon={type === "none" ? Cancel01Icon : type === "full" ? CheckmarkCircle02Icon : AlertCircleIcon}
          size={16}
          className={statusColor}
        />
      </div>
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto w-full" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse h-[480px]">
          <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-6" />
          <div className="h-4 bg-gray-200 rounded w-full mb-8" />
          <div className="space-y-4 mb-auto">
            <div className="h-10 bg-gray-100 rounded-lg w-full" />
            <div className="h-10 bg-gray-100 rounded-lg w-full" />
            <div className="h-10 bg-gray-100 rounded-lg w-full" />
          </div>
          <div className="h-12 bg-gray-200 rounded-xl w-full mt-6" />
        </div>
      ))}
    </div>
  );
}

/* =========================================
   Main Client Component
   ========================================= */

export default function PlansPageClient() {
  const { isLoggedIn, sessionToken } = useUser({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myLicenseType, setMyLicenseType] = useState<string | null>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Fetch Plans
  useEffect(() => {
    if (!backendUrl) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    const fetchPlans = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/plans`, {
          signal: abortController.signal,
          timeout: API_REQUEST_TIMEOUT,
        });
        if (Array.isArray(res.data)) {
          setPlans(res.data);
          setError(null);
        } else {
          throw new Error("Invalid format");
        }
        setLoading(false);
      } catch (err: any) {
        if (axios.isCancel(err) || err.name === "AbortError" || err.name === "CanceledError") return;
        console.error("Failed to fetch plans:", err);
        setError("Unable to load securely. Please refresh or try again later.");
        setPlans([]);
        setLoading(false);
      }
    };

    fetchPlans();
    return () => abortController.abort();
  }, [backendUrl]);

  // Fetch User License info
  useEffect(() => {
    if (!isLoggedIn || !sessionToken || !backendUrl) return;

    const abortController = new AbortController();
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${backendUrl}/userLicenseInfo`, {
          headers: { "Session-Token": sessionToken },
          signal: abortController.signal,
          timeout: API_REQUEST_TIMEOUT,
        });
        setMyLicenseType(res.data?.LicenseType ?? null);
      } catch (err: any) {
        if (axios.isCancel(err) || err.name === "AbortError" || err.name === "CanceledError") return;
        console.error("Failed to sync license");
      }
    };

    fetchUser();
    return () => abortController.abort();
  }, [isLoggedIn, sessionToken, backendUrl]);

  return (
    <div className="min-h-screen bg-white pb-12 selection:bg-blue-100 text-gray-900" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-white pt-24 pb-10 lg:pt-28 lg:pb-14 text-center rounded-b-2xl shadow-sm mb-8 border-b border-blue-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-200/20 via-indigo-100/10 to-transparent" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10"
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-blue-200">
            <HugeiconsIcon icon={FlashIcon} size={12} className="text-amber-500" />
            50M+ Verified Trade Records · Global Reach
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4 leading-tight">
            Pricing that scales with <br className="hidden md:block" /> your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">global trade</span>.
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto text-sm md:text-base leading-relaxed font-medium">
            Start completely for free. Instantly access verified global buyers, suppliers, and detailed HS code insights. Upgrade seamlessly as you grow.
          </p>
        </motion.div>
      </div>

      {/* Plans Container */}
      <div className="mx-auto px-4 sm:px-12 lg:px-32" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlanSkeleton />
            </motion.div>
          )}

          {error && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
              <div className="rounded-2xl bg-red-50 border border-red-200 p-8 flex flex-col items-center text-center" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <HugeiconsIcon icon={AlertCircleIcon} size={28} className="text-red-600" />
                </div>
                <h3 className="text-red-900 font-bold text-lg mb-2">We encountered an issue</h3>
                <p className="text-sm text-red-700 mb-6 font-medium">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2.5 bg-white text-red-700 font-semibold rounded-lg border border-red-300 hover:bg-red-50 transition-colors shadow-sm"
                >
                  Reload Page
                </button>
              </div>
            </motion.div>
          )}

          {!loading && !error && plans.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`grid gap-4 ${plans.length === 3 ? "lg:grid-cols-3 md:grid-cols-3 max-w-7xl mx-auto" : "lg:grid-cols-4 sm:grid-cols-2 max-w-full mx-auto"}`}
            >
              {plans.map((plan, index) => {
                const theme = PLAN_THEMES[plan.LicenseType] ?? DEFAULT_THEME;
                const isCurrent = isLoggedIn && myLicenseType === plan.LicenseType;
                const isUserOnTopPlan = isLoggedIn && (myLicenseType === "BUNDLE" || plans.some((p) => p.LicenseType === myLicenseType && p.IsTopPlan));
                const canUpgrade = isLoggedIn && !isCurrent && !isUserOnTopPlan && isPlanHigherThan(myLicenseType, plan.LicenseType);
                const canDowngrade = isLoggedIn && !isCurrent && isPlanLowerThan(myLicenseType, plan.LicenseType);

                const { inrFormatted, usdFormatted, inIndia } = getPlanPriceBoth(plan);
                const isFree = inrFormatted === "Free" || usdFormatted === "Free" || plan.Price === 0;

                const priceDisplay = inIndia && !isFree ? inrFormatted : isFree ? "Free Forever" : usdFormatted;
                const priceSubtext = !inIndia && !isFree ? inrFormatted : null;

                return (
                  <motion.div
                    key={plan.LicenseType}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index, ease: "easeOut" }}
                    className={`
                      relative flex flex-col rounded-2xl bg-white border-2 overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-lg
                      ${isCurrent ? `ring-2 ring-offset-2 ${theme.ringClass}` : theme.borderClass}
                    `}
                  >

                    {/* Header Badges */}
                    <div className="h-2 w-full bg-gradient-to-r from-blue-100 to-indigo-100 absolute top-0 left-0" />
                    {(theme.isBestValue || isCurrent) && (
                      <div className="absolute top-0 inset-x-0 flex justify-center">
                        <div className={`${isCurrent ? "bg-blue-700 text-white" : theme.badgeBg + " " + theme.badgeText} text-xs font-bold px-4 py-1.5 rounded-b-lg flex items-center gap-1.5 shadow-sm `}>
                          <HugeiconsIcon icon={isCurrent ? CheckmarkCircle02Icon : CrownIcon} size={13} />
                          {isCurrent ? "Current Plan" : "Most Popular"}
                        </div>
                      </div>
                    )}

                    <div className="p-5 pt-9 flex-1 flex flex-col" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
                      {/* Brand Icon & Title */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                          <HugeiconsIcon icon={theme.icon} size={20} className={theme.iconText} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900 tracking-tight leading-snug">
                            {plan.LicenseName || plan.LicenseType}
                          </h3>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.accentColor}`}>
                            {plan.LicenseType}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 leading-snug mb-5 min-h-[40px] font-medium">
                        {plan.ShortDescription}
                      </p>

                      {/* Pricing Block */}
                      <div className="mb-6 pb-5 border-b border-gray-200 flex items-center justify-between gap-2" >
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-4xl font-bold tracking-tight ${isFree ? "text-emerald-600" : "text-gray-900"}`}>
                            {priceDisplay}
                          </span>
                          {!isFree && plan.Validity && (
                            <span className="text-xs font-semibold text-gray-500">/{plan.Validity.toLowerCase()}</span>
                          )}
                        </div>
                        {priceSubtext && (
                          <div className="text-lg text-gray-500 font-semibold mt-1.5">
                            {priceSubtext}
                          </div>
                        )}
                      </div>

                      {/* Feature Checklist */}
                      <div className="space-y-0.5 flex-1 mb-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Features</h4>
                        <AccessRow icon={Database01Icon} label="Directory" access={plan.Directory} />
                        <AccessRow icon={UserAdd01Icon} label="Buyers" access={plan.Buyers} />
                        <AccessRow icon={UserGroupIcon} label="Suppliers" access={plan.Suppliers} />
                      </div>

                      {/* CTA Buttons */}
                      <div className="mt-auto">
                        {!isLoggedIn ? (
                          <div className="space-y-3">
                            <Link
                              href="/signup"
                              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all ${theme.ctaClass}`}
                            >
                              Get Started <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            </Link>
                            {!isFree && (
                              <Link
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-transparent text-gray-500 text-sm font-semibold hover:bg-gray-50 hover:text-gray-800 transition-colors"
                              >
                                Log in to existing
                              </Link>
                            )}
                          </div>
                        ) : isCurrent ? (
                          <Link
                            href="/plan"
                            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-700 text-sm font-bold hover:border-gray-300 hover:bg-gray-100 transition-all focus:ring-4 focus:ring-gray-100"
                          >
                            Manage Plan
                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                          </Link>
                        ) : canUpgrade ? (
                          <Link
                            href={`/checkout?plan=${encodeURIComponent(plan.LicenseType)}`}
                            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all ${theme.ctaClass}`}
                          >
                            Upgrade Now
                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                          </Link>
                        ) : canDowngrade ? (
                          <Link
                            href="/contact"
                            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 transition-colors"
                          >
                            Contact to Change
                          </Link>
                        ) : null}
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {!loading && plans.length === 0 && !error && (
            <div className="text-center py-24 bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl max-w-2xl mx-auto shadow-sm" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
              <HugeiconsIcon icon={Database01Icon} size={52} className="mx-auto text-blue-300 mb-5" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No plans available</h3>
              <p className="text-gray-600 font-medium">We are currently updating our pricing tiers. Please check back shortly.</p>
            </div>
          )}

        </AnimatePresence>

        {/* Global Footer Assurances */}
        {!loading && plans.length > 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-10 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 px-4" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
          >
            <div className="flex items-center gap-2 text-xs text-gray-700 bg-white border border-gray-200 py-2 px-4 rounded-full shadow-sm hover:shadow-md transition-all">
              <HugeiconsIcon icon={Shield01Icon} size={15} className="text-emerald-500" aria-hidden="true" />
              <span className="font-semibold inline-flex gap-1.5 items-center">
                Secured via <span className="font-black text-gray-900">Razorpay</span>
              </span>
            </div>

            {isLoggedIn && (
              <Link
                href="/plan"
                className="group flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-xs transition-colors py-2 px-3 rounded-full hover:bg-indigo-50"
              >
                View usage
                <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}