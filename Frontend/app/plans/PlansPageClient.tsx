"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Ticket01Icon,
  Database01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  ArrowRight01Icon,
  Login02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import axios from "axios";
import { useUser } from "@/hooks/useUser";
import { getPlanPriceBoth } from "@/lib/currency";

type AccessShape = {
  Access: string;
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

// Plan hierarchy: lower index = lower tier. Top plan has full access; no plan above it.
const PLAN_ORDER: string[] = ["TRIAL", "DIRECTORY", "TRADE", "BUNDLE"];

function getPlanRank(licenseType: string): number {
  const i = PLAN_ORDER.indexOf(licenseType);
  return i === -1 ? 0 : i;
}

function isPlanHigherThan(myType: string | null, cardType: string): boolean {
  if (!myType) return true;
  return getPlanRank(cardType) > getPlanRank(myType);
}

function isPlanLowerThan(myType: string | null, cardType: string): boolean {
  if (!myType) return false;
  return getPlanRank(cardType) < getPlanRank(myType);
}

function getAccessDetail(a: AccessShape): { label: string; value: string } {
  if (a.Access === "full") return { label: "Access", value: "Full access" };
  if (a.Access === "limited") {
    const maxRows = a.MaxRows ?? 10;
    const perSearch = a.MaxRowsPerSearch ?? 5;
    if (maxRows > 0)
      return {
        label: "Access",
        value: `${maxRows} rows total, ${perSearch} per search`,
      };
    return { label: "Access", value: `${perSearch} rows per search` };
  }
  const searches = a.MaxSearchesPerPeriod ?? 0;
  const rows = a.MaxRowsPerSearch ?? 0;
  if (searches === 0 && rows === 0)
    return { label: "Access", value: "No access" };
  return {
    label: "Access",
    value: `${searches} searches/period, ${rows} rows per search`,
  };
}

export default function PlansPageClient() {
  const { user, isLoggedIn, sessionToken } = useUser({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLicenseType, setMyLicenseType] = useState<string | null>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!backendUrl) {
      setLoading(false);
      return;
    }
    axios
      .get(`${backendUrl}/api/plans`)
      .then((res) => setPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [backendUrl]);

  useEffect(() => {
    if (!isLoggedIn || !sessionToken || !backendUrl) return;
    axios
      .get(`${backendUrl}/userLicenseInfo`, {
        headers: { "Session-Token": sessionToken },
      })
      .then((res) => setMyLicenseType(res.data?.LicenseType ?? null))
      .catch(() => setMyLicenseType(null));
  }, [isLoggedIn, sessionToken, backendUrl]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8 md:mb-10"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Plans & Pricing
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto text-sm md:text-base">
            Choose the plan that fits your needs. Access to Directory, Buyers
            and Suppliers.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid gap-5 sm:grid-cols-2"
          >
            {plans.map((plan, i) => {
              const isCurrent =
                isLoggedIn && myLicenseType === plan.LicenseType;
              const isUserOnTopPlan =
                isLoggedIn &&
                (myLicenseType === "BUNDLE" ||
                  plans.some(
                    (p) => p.LicenseType === myLicenseType && p.IsTopPlan,
                  ));
              const canUpgrade =
                isLoggedIn &&
                !isCurrent &&
                !isUserOnTopPlan &&
                isPlanHigherThan(myLicenseType, plan.LicenseType);
              const canDowngrade =
                isLoggedIn &&
                !isCurrent &&
                isPlanLowerThan(myLicenseType, plan.LicenseType);
              const dirDetail = getAccessDetail(plan.Directory);
              const buyersDetail = getAccessDetail(plan.Buyers);
              const suppliersDetail = getAccessDetail(plan.Suppliers);
              return (
                <motion.div
                  key={plan.LicenseType}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  className={`relative bg-white rounded-2xl border overflow-hidden flex flex-col shadow-sm hover:border-gray-300 transition-colors ${
                    isCurrent
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-gray-200"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-0 left-0 right-0 py-1 bg-blue-600 text-white text-center text-xs font-semibold">
                      Your current plan
                    </div>
                  )}
                  <div className={`p-5 md:p-6 ${isCurrent ? "pt-10" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                          {plan.LicenseName || plan.LicenseType}
                        </h3>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">
                          {plan.LicenseType}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-blue-600 shrink-0 whitespace-nowrap">
                        {(() => {
                          const { inrFormatted, usdFormatted, inIndia } = getPlanPriceBoth(plan);
                          if (inIndia) return inrFormatted;
                          return (
                            <>
                              {usdFormatted}
                              <span className="font-normal text-gray-500 ml-1">
                                · {inrFormatted}
                              </span>
                            </>
                          );
                        })()}
                      </span>
                    </div>
                    {plan.ShortDescription && (
                      <p className="text-sm text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                        {plan.ShortDescription}
                      </p>
                    )}
                    <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                          <tr>
                            <td className="py-2.5 px-3 text-gray-500 font-medium w-24 align-top">
                              <span className="flex items-center gap-1.5">
                                <HugeiconsIcon
                                  icon={Database01Icon}
                                  size={14}
                                  className="text-blue-600 shrink-0"
                                />
                                Directory
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-700">
                              {dirDetail.value}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 text-gray-500 font-medium align-top">
                              <span className="flex items-center gap-1.5">
                                <HugeiconsIcon
                                  icon={UserAdd01Icon}
                                  size={14}
                                  className="text-blue-600 shrink-0"
                                />
                                Buyers
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-700">
                              {buyersDetail.value}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 text-gray-500 font-medium align-top">
                              <span className="flex items-center gap-1.5">
                                <HugeiconsIcon
                                  icon={UserGroupIcon}
                                  size={14}
                                  className="text-blue-600 shrink-0"
                                />
                                Suppliers
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-700">
                              {suppliersDetail.value}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="mt-auto p-4 bg-gray-50/80 border-t border-gray-100">
                    {!isLoggedIn ? (
                      <div className="flex gap-2">
                        <Link
                          href="/signup"
                          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          <HugeiconsIcon icon={UserIcon} size={16} />
                          Sign up
                        </Link>
                        <Link
                          href="/login"
                          className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
                        >
                          <HugeiconsIcon icon={Login02Icon} size={16} />
                          Log in
                        </Link>
                      </div>
                    ) : isCurrent ? (
                      <Link
                        href="/plan"
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        View my plan
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                      </Link>
                    ) : canUpgrade ? (
                      <Link
                        href={`/checkout?plan=${encodeURIComponent(plan.LicenseType)}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Upgrade (Pay in ₹)
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                      </Link>
                    ) : canDowngrade ? (
                      <Link
                        href="/contact"
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
                      >
                        Contact to switch
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                      </Link>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!loading && plans.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No plans available at the moment.</p>
          </div>
        )}

        {isLoggedIn && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-8 text-sm text-gray-500"
          >
            <Link
              href="/plan"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View your current plan & usage →
            </Link>
          </motion.p>
        )}
      </div>
    </div>
  );
}
