"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
  Database01Icon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons";
import axios from "axios";
import { useUser } from "@/hooks/useUser";

interface LicenseInfo {
  LicenseType: string;
  OwnedLicenses?: string[];
  IsSimsAccess: boolean;
  BuyersAccess?: string;
  SuppliersAccess?: string;
  NumberOfRowsPerPeriod?: number;
  DirectoryRowsPerSearch?: number;
  LicenseValidTill?: string;
}

const PLAN_LABEL: Record<string, string> = {
  DIRECTORY: "Directory",
  TRADE: "Buyers & Suppliers",
  BUNDLE: "Unlimited Bundle",
  TRIAL: "Trial",
};

const PLAN_DESCRIPTION: Record<string, string> = {
  DIRECTORY: "Full access to the Buyers Directory with unmasked contact details.",
  TRADE: "Full access to Buyers and Suppliers search by HS code, country and year.",
  BUNDLE: "Complete access: unlimited directory, full buyers and suppliers search.",
  TRIAL: "Limited access to directory, buyers and suppliers.",
};

const PLAN_COLOR: Record<string, string> = {
  DIRECTORY: "bg-blue-100 text-blue-800 border-blue-200",
  TRADE: "bg-purple-100 text-purple-800 border-purple-200",
  BUNDLE: "bg-indigo-100 text-indigo-800 border-indigo-200",
  TRIAL: "bg-amber-100 text-amber-800 border-amber-200",
};

function AccessBadge({ level, label }: { level: string; label: string }) {
  const isFull = level === "full";
  const isNone = level === "none";
  return (
    <div className="flex items-center gap-2 py-1">
      <HugeiconsIcon
        icon={isNone ? AlertCircleIcon : CheckmarkCircle02Icon}
        size={16}
        className={
          isFull
            ? "text-emerald-500 shrink-0"
            : isNone
              ? "text-red-400 shrink-0"
              : "text-amber-400 shrink-0"
        }
      />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

export default function PlanPageClient() {
  const { sessionToken, isLoading: userLoading } = useUser({
    redirectTo: "/login",
  });
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!sessionToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    axios
      .get(`${backendUrl}/userLicenseInfo`, {
        headers: { "Session-Token": sessionToken },
      })
      .then((res) => setLicenseInfo(res.data || null))
      .catch(() => setLicenseInfo(null))
      .finally(() => setLoading(false));
  }, [sessionToken, backendUrl]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const ownedPlans: string[] = licenseInfo?.OwnedLicenses?.length
    ? licenseInfo.OwnedLicenses
    : licenseInfo?.LicenseType && licenseInfo.LicenseType !== "TRIAL"
      ? [licenseInfo.LicenseType]
      : [];

  const isTrial = ownedPlans.length === 0;
  const dirRows = Number(licenseInfo?.NumberOfRowsPerPeriod ?? 10);
  const dirSearchRows = Number(licenseInfo?.DirectoryRowsPerSearch ?? 5);
  const buyersAccess = licenseInfo?.BuyersAccess ?? "none";
  const suppliersAccess = licenseInfo?.SuppliersAccess ?? "none";
  const validTill = licenseInfo?.LicenseValidTill;
  const hasFullCoverage = ownedPlans.length > 1 || ownedPlans.includes("BUNDLE");

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8 md:mb-10"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Your Plans
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Active licenses and access details
          </p>
        </motion.div>

        {/* Trial state */}
        {isTrial && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden mb-6"
          >
            <div className="p-5 md:p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  Trial
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                  <HugeiconsIcon icon={AlertCircleIcon} size={12} />
                  Limited access
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mt-3">Free Trial</h2>
              <p className="text-gray-600 mt-1 text-sm">
                You&apos;re on a trial with limited access. Purchase a plan to unlock full features.
              </p>
            </div>
            <div className="p-5 md:p-6">
              <div className="space-y-1 mb-6">
                <AccessBadge level="limited" label={`Directory: ${dirRows} rows total, ${dirSearchRows}/search`} />
                <AccessBadge level="limited" label="Buyers: 5 results per search" />
                <AccessBadge level="limited" label="Suppliers: 5 results per search" />
                <AccessBadge level="none" label="Contact details are masked" />
              </div>
              <Link
                href="/plans"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                View Plans & Upgrade
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Active plan cards */}
        {ownedPlans.map((planType, i) => (
          <motion.div
            key={planType}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4"
          >
            <div className="p-5 md:p-6 bg-gray-50 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${PLAN_COLOR[planType] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
                >
                  {PLAN_LABEL[planType] ?? planType}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                  Active
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mt-3">
                {PLAN_LABEL[planType] ?? planType}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{PLAN_DESCRIPTION[planType] ?? ""}</p>
              {validTill && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <HugeiconsIcon icon={Calendar01Icon} size={12} />
                  Valid till{" "}
                  {new Date(validTill).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
            <div className="p-5 md:p-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                What you get
              </h3>
              <div className="space-y-1">
                {(planType === "DIRECTORY" || planType === "BUNDLE") && (
                  <AccessBadge level="full" label="Directory: Unlimited access, unmasked contacts" />
                )}
                {planType === "TRADE" && (
                  <AccessBadge
                    level="limited"
                    label={`Directory: ${dirRows} rows, ${dirSearchRows}/search`}
                  />
                )}
                {(planType === "TRADE" || planType === "BUNDLE") && (
                  <>
                    <AccessBadge level={buyersAccess} label="Buyers: Full search access" />
                    <AccessBadge level={suppliersAccess} label="Suppliers: Full search access" />
                  </>
                )}
                {planType === "DIRECTORY" && (
                  <>
                    <AccessBadge level="none" label="Buyers trade search: Not included" />
                    <AccessBadge level="none" label="Suppliers trade search: Not included" />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Combined access summary when multiple plans owned */}
        {hasFullCoverage && ownedPlans.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + ownedPlans.length * 0.08 }}
            className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 md:p-6 mb-4"
          >
            <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-emerald-600" />
              Your combined access
            </h3>
            <div className="space-y-1">
              <AccessBadge level="full" label="Directory: Full unlimited access" />
              <AccessBadge level="full" label="Buyers: Full search access" />
              <AccessBadge level="full" label="Suppliers: Full search access" />
            </div>
            <p className="text-xs text-emerald-700 mt-3 font-medium">
              You have full access across all features — equivalent to the Bundle plan.
            </p>
          </motion.div>
        )}

        {/* Add another plan CTA */}
        {!isTrial && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Want to add more features?</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Purchase additional plans — your access stacks automatically.
                </p>
              </div>
              <Link
                href="/plans"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                View All Plans
                <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
              </Link>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Link
            href="/buyers-directory"
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
          >
            <HugeiconsIcon icon={Database01Icon} size={18} />
            Go to Directory
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
