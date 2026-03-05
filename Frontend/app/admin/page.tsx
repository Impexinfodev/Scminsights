"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChartLineData01Icon,
  Loading03Icon,
  UserIcon,
  Tick02Icon,
  Cancel01Icon,
  Calendar03Icon,
  RupeeCircleIcon,
  CloudIcon,
} from "@hugeicons/core-free-icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useUser } from "@/hooks/useUser";
import axios from "axios";

type Overview = {
  total_users?: number;
  active_users?: number;
  inactive_users?: number;
  today_active_users?: number;
  revenue_total_paise?: number;
  revenue_by_month?: { month: string; revenue_paise: number }[];
  api_health?: boolean;
};

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#c084fc",
  "#d8b4fe",
  "#e9d5ff",
];

function last6Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, sessionChecked, sessionToken } = useUser(
    {
      redirectTo: "/login",
    },
  );

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.user_details?.Role === "ADMIN";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!sessionChecked || !isLoggedIn) return;
    if (sessionChecked && isLoggedIn && !isAdmin) {
      router.replace("/");
      return;
    }
  }, [sessionChecked, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !sessionToken || !backendUrl) return;
    setLoading(true);
    setError(null);
    axios
      .get(`${backendUrl}/api/admin/overview`, {
        headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" },
        withCredentials: true,
      })
      .then((res) => setOverview(res.data))
      .catch((err) =>
        setError(err.response?.data?.error || "Failed to load overview"),
      )
      .finally(() => setLoading(false));
  }, [isAdmin, sessionToken, backendUrl]);

  const chartData = (() => {
    const months = last6Months();
    const byMonth: Record<string, number> = {};
    (overview?.revenue_by_month ?? []).forEach((r) => {
      byMonth[r.month] = r.revenue_paise / 100;
    });
    return months.map((month) => ({
      month,
      revenue: byMonth[month] ?? 0,
      label: new Date(month + "-01").toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
    }));
  })();

  const revenueRupees = (overview?.revenue_total_paise ?? 0) / 100;

  if (isLoading || !sessionChecked || (isLoggedIn && !isAdmin)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <HugeiconsIcon
          icon={Loading03Icon}
          size={32}
          className="text-indigo-600 animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <HugeiconsIcon
            icon={ChartLineData01Icon}
            size={24}
            className="text-white"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview and analytics</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={28}
            className="text-indigo-600 animate-spin"
          />
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          >
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/60 rounded-bl-full" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <HugeiconsIcon
                    icon={UserIcon}
                    size={20}
                    className="text-blue-600"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-blue-600/80">
                    Total users
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {overview?.total_users ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100/60 rounded-bl-full" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    size={20}
                    className="text-emerald-600"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-600/80">
                    Active
                  </p>
                  <p className="text-xl font-bold text-emerald-700">
                    {overview?.active_users ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gray-100 rounded-bl-full" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={20}
                    className="text-gray-500"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Inactive
                  </p>
                  <p className="text-xl font-bold text-gray-700">
                    {overview?.inactive_users ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100/60 rounded-bl-full" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    size={20}
                    className="text-amber-600"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-600/80">
                    Today active
                  </p>
                  <p className="text-xl font-bold text-amber-700">
                    {overview?.today_active_users ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-100/60 rounded-bl-full" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <HugeiconsIcon
                    icon={RupeeCircleIcon}
                    size={20}
                    className="text-violet-600"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-violet-600/80">
                    Revenue
                  </p>
                  <p className="text-xl font-bold text-violet-700">
                    ₹{(revenueRupees / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-slate-100 rounded-bl-full" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <HugeiconsIcon
                    icon={CloudIcon}
                    size={20}
                    className="text-slate-600"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    API health
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      overview?.api_health ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {overview?.api_health ? "Healthy" : "Error"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Revenue (last 6 months)
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Captured payments in ₹ (INR)
            </p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickFormatter={(v) =>
                      `₹${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`
                    }
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `₹${(value ?? 0).toLocaleString("en-IN")}`,
                      "Revenue",
                    ]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.label ?? ""
                    }
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
