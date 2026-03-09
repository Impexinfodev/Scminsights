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

function getAccessSummary(access: AccessShape): { type: "full" | "limited" | "none"; text: string } {
  if (access.Access === "full") return { type: "full", text: "Unlimited access" };
  if (access.Access === "limited") {
    const maxRows = access.MaxRows ?? 0;
    const perSearch = access.MaxRowsPerSearch ?? 0;
    if (maxRows > 0) return { type: "limited", text: `${maxRows} rows, ${perSearch}/search` };
    if (perSearch > 0) return { type: "limited", text: `Up to ${perSearch}/search` };
  }
  return { type: "none", text: "No access included" };
}

/* =========================================
   Theme Definitions
   ========================================= */

type PlanTheme = {
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  icon: typeof CrownIcon;
  ctaClass: string;
  isBestValue?: boolean;
  cardBorder: string;
  ringClass: string;
};

const PLAN_THEMES: Record<string, PlanTheme> = {
  TRIAL: {
    accentColor: "text-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-600",
    iconBg: "bg-amber-50 border border-amber-200",
    iconColor: "text-amber-500",
    icon: StarIcon,
    ctaClass: "border-2 border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50",
    cardBorder: "border-amber-200",
    ringClass: "ring-amber-400",
  },
  DIRECTORY: {
    accentColor: "text-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-600",
    iconBg: "bg-blue-50 border border-blue-200",
    iconColor: "text-blue-500",
    icon: Database01Icon,
    ctaClass: "border-2 border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50",
    cardBorder: "border-gray-200",
    ringClass: "ring-blue-500",
  },
  TRADE: {
    accentColor: "text-purple-600",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-600",
    iconBg: "bg-purple-50 border border-purple-200",
    iconColor: "text-purple-500",
    icon: GlobalIcon,
    ctaClass: "border-2 border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50",
    cardBorder: "border-gray-200",
    ringClass: "ring-purple-500",
  },
  BUNDLE: {
    accentColor: "text-indigo-600",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-600",
    iconBg: "bg-indigo-50 border border-indigo-200",
    iconColor: "text-indigo-600",
    icon: CrownIcon,
    ctaClass: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25",
    isBestValue: true,
    cardBorder: "border-indigo-300 shadow-md shadow-indigo-100",
    ringClass: "ring-indigo-500",
  },
};

const DEFAULT_THEME: PlanTheme = { ...PLAN_THEMES["TRIAL"], icon: DiamondIcon };

/* =========================================
   AccessRow
   ========================================= */

function AccessRow({ icon, label, access }: { icon: any; label: string; access: AccessShape }) {
  const { type, text } = getAccessSummary(access);
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
        <HugeiconsIcon icon={icon} size={11} className="text-gray-500" />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-16 shrink-0">{label}</span>
      <span className="text-xs text-gray-500 truncate flex-1">{text}</span>
      <HugeiconsIcon
        icon={type === "none" ? Cancel01Icon : CheckmarkCircle02Icon}
        size={14}
        className={type === "full" ? "text-emerald-500 shrink-0" : type === "limited" ? "text-amber-400 shrink-0" : "text-gray-300 shrink-0"}
      />
    </div>
  );
}

/* =========================================
   Skeleton
   ========================================= */

function PlanSkeleton() {
  return (
    <div className="flex flex-wrap justify-center gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 animate-pulse"
          style={{ width: 270, minHeight: 480 }}
        >
          <div className="w-11 h-11 bg-gray-200 rounded-xl mb-4" />
          <div className="h-5 bg-gray-200 rounded w-2/3 mb-1.5" />
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-full mb-1" />
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-6" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-1" />
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="space-y-2 flex-1 mb-6">
            <div className="h-8 bg-gray-100 rounded-lg" />
            <div className="h-8 bg-gray-100 rounded-lg" />
            <div className="h-8 bg-gray-100 rounded-lg" />
          </div>
          <div className="h-11 bg-gray-200 rounded-xl" />
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
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();

  useEffect(() => {
    if (!backendUrl) { setLoading(false); return; }
    const ctrl = new AbortController();
    axios
      .get(`${backendUrl}/api/plans`, { signal: ctrl.signal, timeout: API_REQUEST_TIMEOUT })
      .then((res) => {
        if (Array.isArray(res.data)) { setPlans(res.data); setError(null); }
        else throw new Error("Invalid format");
      })
      .catch((err) => {
        if (axios.isCancel(err) || err.name === "AbortError" || err.name === "CanceledError") return;
        setError("Unable to load plans. Please refresh or try again later.");
        setPlans([]);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [backendUrl]);

  useEffect(() => {
    if (!isLoggedIn || !sessionToken || !backendUrl) return;
    const ctrl = new AbortController();
    axios
      .get(`${backendUrl}/userLicenseInfo`, {
        headers: { "Session-Token": sessionToken },
        signal: ctrl.signal,
        timeout: API_REQUEST_TIMEOUT,
      })
      .then((res) => setMyLicenseType(res.data?.LicenseType ?? null))
      .catch((err) => {
        if (axios.isCancel(err) || err.name === "AbortError" || err.name === "CanceledError") return;
      });
    return () => ctrl.abort();
  }, [isLoggedIn, sessionToken, backendUrl]);

  return (
    <div className="min-h-screen bg-white pb-16 selection:bg-blue-100 text-gray-900">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-white pt-24 pb-10 lg:pt-28 lg:pb-14 text-center border-b border-blue-100 mb-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-200/20 via-indigo-100/10 to-transparent" />
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
            Pricing that scales with{" "}
            <br className="hidden md:block" />
            your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              global trade
            </span>
            .
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto text-sm md:text-base leading-relaxed font-medium">
            Start completely for free. Instantly access verified global buyers, suppliers, and detailed HS code insights. Upgrade seamlessly as you grow.
          </p>
        </motion.div>
      </div>

      {/* Plans Container */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <AnimatePresence mode="wait">

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlanSkeleton />
            </motion.div>
          )}

          {error && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
              <div className="rounded-2xl bg-red-50 border border-red-200 p-8 flex flex-col items-center text-center">
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
              className="flex flex-wrap justify-center gap-5"
            >
              {plans.map((plan, index) => {
                const theme = PLAN_THEMES[plan.LicenseType] ?? DEFAULT_THEME;
                const isCurrent = isLoggedIn && myLicenseType === plan.LicenseType;
                const isUserOnTopPlan =
                  isLoggedIn &&
                  (myLicenseType === "BUNDLE" ||
                    plans.some((p) => p.LicenseType === myLicenseType && p.IsTopPlan));
                const canUpgrade =
                  isLoggedIn && !isCurrent && !isUserOnTopPlan && isPlanHigherThan(myLicenseType, plan.LicenseType);
                const canDowngrade =
                  isLoggedIn && !isCurrent && isPlanLowerThan(myLicenseType, plan.LicenseType);

                const { inrFormatted, usdFormatted, inIndia } = getPlanPriceBoth(plan);
                const isFree = plan.Price === 0 || inrFormatted === "Free" || usdFormatted === "Free";

                // Primary price shown large, secondary shown small beside
                const primaryPrice = inIndia && !isFree ? inrFormatted : isFree ? "Free Forever" : usdFormatted;
                const secondaryPrice = !isFree ? (inIndia ? usdFormatted : inrFormatted) : null;

                return (
                  <motion.div
                    key={plan.LicenseType}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.08 * index, ease: "easeOut" }}
                    className={`
                      relative flex flex-col rounded-2xl bg-white border-2 transition-all duration-300
                      hover:-translate-y-1.5 hover:shadow-xl
                      ${isCurrent
                        ? `ring-2 ring-offset-2 ${theme.ringClass} ${theme.cardBorder}`
                        : `${theme.cardBorder} hover:shadow-lg`
                      }
                    `}
                    style={{ width: 270, minWidth: 240, maxWidth: 300 }}
                  >
                    {/* Current Plan badge */}
                    {isCurrent && (
                      <div className="absolute -top-px inset-x-0 flex justify-center">
                        <div className="bg-blue-700 text-white text-[10px] font-bold px-3 py-1 rounded-b-lg flex items-center gap-1 shadow-sm">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} />
                          Current Plan
                        </div>
                      </div>
                    )}

                    <div className={`flex flex-col flex-1 p-5 ${isCurrent ? "pt-8" : "pt-5"}`}>

                      {/* Icon + Name + Badge */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                          <HugeiconsIcon icon={theme.icon} size={22} className={theme.iconColor} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-bold text-gray-900 leading-snug truncate">
                            {plan.LicenseName || plan.LicenseType}
                          </h3>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.accentColor}`}>
                            {plan.LicenseType}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 leading-relaxed mb-4 min-h-[36px]">
                        {plan.ShortDescription}
                      </p>

                      {/* Pricing */}
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-3xl font-bold tracking-tight ${isFree ? "text-emerald-600" : "text-gray-900"}`}>
                            {primaryPrice}
                          </span>
                          {!isFree && plan.Validity && (
                            <span className="text-xs text-gray-400 font-semibold">
                              /{plan.Validity.toLowerCase()}
                            </span>
                          )}
                        </div>
                        {secondaryPrice && (
                          <p className="text-sm text-gray-400 font-medium mt-0.5">{secondaryPrice}</p>
                        )}
                      </div>

                      {/* Features */}
                      <div className="flex-1 mb-5">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                          Features
                        </p>
                        <AccessRow icon={Database01Icon} label="Directory" access={plan.Directory} />
                        <AccessRow icon={UserAdd01Icon} label="Buyers" access={plan.Buyers} />
                        <AccessRow icon={UserGroupIcon} label="Suppliers" access={plan.Suppliers} />
                      </div>

                      {/* CTA */}
                      <div className="mt-auto">
                        {!isLoggedIn ? (
                          <Link
                            href="/signup"
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${theme.ctaClass}`}
                          >
                            Get Started
                            <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
                          </Link>
                        ) : isCurrent ? (
                          <Link
                            href="/plan"
                            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 text-sm font-bold hover:border-gray-300 hover:bg-gray-50 transition-all"
                          >
                            Manage Plan
                            <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
                          </Link>
                        ) : canUpgrade ? (
                          <Link
                            href={`/checkout?plan=${encodeURIComponent(plan.LicenseType)}`}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${theme.ctaClass}`}
                          >
                            Upgrade Now
                            <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
                          </Link>
                        ) : canDowngrade ? (
                          <Link
                            href="/contact"
                            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 transition-colors"
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
            <div className="text-center py-24 bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl max-w-2xl mx-auto shadow-sm">
              <HugeiconsIcon icon={Database01Icon} size={52} className="mx-auto text-blue-300 mb-5" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No plans available</h3>
              <p className="text-gray-600 font-medium">
                We are currently updating our pricing tiers. Please check back shortly.
              </p>
            </div>
          )}

        </AnimatePresence>

        {/* Footer Assurances */}
        {!loading && plans.length > 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 px-2"
          >
            <div className="flex items-center gap-2 text-xs text-gray-700 bg-white border border-gray-200 py-2 px-4 rounded-full shadow-sm">
              <HugeiconsIcon icon={Shield01Icon} size={14} className="text-emerald-500" />
              <span className="font-semibold">
                Secured via <span className="font-black text-gray-900">Razorpay</span>
              </span>
            </div>
            {isLoggedIn && (
              <Link
                href="/plan"
                className="group flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-xs transition-colors py-2 px-3 rounded-full hover:bg-indigo-50"
              >
                View usage
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={13}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
