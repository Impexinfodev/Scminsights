"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon, ArrowRight01Icon, CrownIcon } from "@hugeicons/core-free-icons";

interface TrialBannerProps {
  rowLimit: number;
  context: "buyers" | "suppliers" | "directory" | "hsn";
  className?: string;
}

const contextConfig: Record<
  TrialBannerProps["context"],
  { label: string; detail: (n: number) => string }
> = {
  buyers: {
    label: "Buyers search is limited",
    detail: (n) => `Only ${n} results shown per search on Trial.`,
  },
  suppliers: {
    label: "Suppliers search is limited",
    detail: (n) => `Only ${n} results shown per search on Trial.`,
  },
  directory: {
    label: "Directory access is limited",
    detail: (n) => `Only ${n} companies shown · Contact details are masked.`,
  },
  hsn: {
    label: "HSN code search is limited",
    detail: (n) => `Only ${n} codes shown per search on Trial.`,
  },
};

export default function TrialBanner({ rowLimit, context, className = "" }: TrialBannerProps) {
  const { label, detail } = contextConfig[context];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 ${className}`}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-xl" />

      <div className="flex items-center gap-3 px-4 py-3 pl-5">
        {/* Icon */}
        <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
          <HugeiconsIcon icon={LockIcon} size={16} className="text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 leading-tight">
            {label}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            {detail(rowLimit)}{" "}
            <span className="font-medium">Upgrade for unlimited access.</span>
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/plans"
          className="shrink-0 inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-all whitespace-nowrap"
        >
          <HugeiconsIcon icon={CrownIcon} size={12} />
          Upgrade
          <HugeiconsIcon icon={ArrowRight01Icon} size={11} />
        </Link>
      </div>
    </motion.div>
  );
}
