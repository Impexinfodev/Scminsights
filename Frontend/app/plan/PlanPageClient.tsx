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
} from "@hugeicons/core-free-icons";
import axios from "axios";
import { useUser } from "@/hooks/useUser";

export default function PlanPageClient() {
  const { sessionToken, isLoading: userLoading } = useUser({
    redirectTo: "/login",
  });
  const [licenseInfo, setLicenseInfo] = useState<Record<string, unknown> | null>(null);
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

  const isTrial =
    !licenseInfo?.IsSimsAccess &&
    (licenseInfo?.LicenseType === "TRIAL" || !licenseInfo?.LicenseType);
  const planDisplayName = String(licenseInfo?.LicenseName || licenseInfo?.LicenseType || "TRIAL");
  const dirRows = Number(licenseInfo?.NumberOfRowsPerPeriod ?? 10);
  const searchRows = Number(licenseInfo?.DirectoryRowsPerSearch ?? 5);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

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
            Your Plan
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Current license and access limits
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div
            className={`p-5 md:p-6 ${isTrial ? "bg-linear-to-br from-blue-50 to-indigo-50 border-b border-gray-100" : "bg-gray-50 border-b border-gray-100"}`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {planDisplayName}
              </span>
              {isTrial && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                  <HugeiconsIcon icon={AlertCircleIcon} size={14} />
                  Limited access
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mt-4">
              {planDisplayName}
            </h2>
            <p className="text-gray-600 mt-1">
              {isTrial
                ? "You're on a trial with limited directory and search results. Unlock full access by upgrading."
                : "You have full access to directory and features."}
            </p>
          </div>

          <div className="p-5 md:p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              What you get
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={20}
                  className="text-green-500 shrink-0 mt-0.5"
                />
                <span className="text-gray-700">
                  <strong>Directory:</strong> Up to {dirRows} rows total,{" "}
                  {searchRows} rows per search.
                </span>
              </li>
              {isTrial && (
                <>
                  <li className="flex items-start gap-3">
                    <HugeiconsIcon
                      icon={AlertCircleIcon}
                      size={20}
                      className="text-amber-500 shrink-0 mt-0.5"
                    />
                    <span className="text-gray-700">
                      Contact details (name, email, phone) are{" "}
                      <strong>masked</strong> on trial.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <HugeiconsIcon
                      icon={Database01Icon}
                      size={20}
                      className="text-blue-500 shrink-0 mt-0.5"
                    />
                    <span className="text-gray-700">
                      Upgrade for full SIMS access: unmasked details and higher
                      limits.
                    </span>
                  </li>
                </>
              )}
              {!isTrial && (
                <li className="flex items-start gap-3">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={20}
                    className="text-green-500 shrink-0 mt-0.5"
                  />
                  <span className="text-gray-700">
                    Full SIMS access with unmasked directory data.
                  </span>
                </li>
              )}
            </ul>

            {isTrial && (
              <div className="mt-8 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-sm font-medium text-blue-900 mb-3">
                  Want more?
                </p>
                <p className="text-sm text-blue-800 mb-4">
                  Contact us to upgrade your plan and get full directory access,
                  higher row limits, and unmasked contacts.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Contact to upgrade
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
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
