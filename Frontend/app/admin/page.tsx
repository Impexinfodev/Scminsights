"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
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
  Download01Icon,
  UserGroupIcon,
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
  PieChart,
  Pie,
  Legend,
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

type LicenseStat = { license_type: string; license_name: string; count: number };
type RecentUser = { UserId?: string; Name?: string; Company?: string; LicenseType?: string; ActivationStatus?: boolean; EmailId?: string };
type RecentTx = { Id?: string; EmailId?: string; LicenseType?: string; AmountPaise?: number; Status?: string; CreatedAt?: string };

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff"];
const DONUT_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#ec4899"];

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
  const { user, isLoading, isLoggedIn, sessionChecked, sessionToken } = useUser({ redirectTo: "/login" });

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licenseStats, setLicenseStats] = useState<LicenseStat[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);

  const isAdmin = user?.user_details?.Role === "ADMIN";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!sessionChecked || !isLoggedIn) return;
    if (sessionChecked && isLoggedIn && !isAdmin) {
      router.replace("/");
    }
  }, [sessionChecked, isLoggedIn, isAdmin, router]);

  const fetchDashboard = useCallback(async () => {
    if (!isAdmin || !sessionToken || !backendUrl) return;
    const headers = { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" };
    setLoading(true);
    setError(null);
    try {
      const [ovRes, licRes, usrRes, txRes] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/overview`, { headers }),
        axios.get(`${backendUrl}/api/admin/licenses/stats`, { headers }).catch(() => ({ data: { by_license: [] } })),
        axios.get(`${backendUrl}/api/admin/users?page=1&page_size=5&sort_order=desc`, { headers }).catch(() => ({ data: { users: [] } })),
        axios.get(`${backendUrl}/api/admin/transactions?page=1&page_size=5`, { headers }).catch(() => ({ data: { transactions: [] } })),
      ]);
      setOverview(ovRes.data);
      setLicenseStats(licRes.data?.by_license ?? []);
      setRecentUsers(usrRes.data?.users ?? []);
      setRecentTxs(txRes.data?.transactions ?? []);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        // Session expired — redirect to login
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sessionToken, backendUrl, router]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const chartData = (() => {
    const months = last6Months();
    const byMonth: Record<string, number> = {};
    (overview?.revenue_by_month ?? []).forEach((r) => {
      byMonth[r.month] = r.revenue_paise / 100;
    });
    return months.map((month) => ({
      month,
      revenue: byMonth[month] ?? 0,
      label: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    }));
  })();

  const donutData = licenseStats.map((s) => ({
    name: s.license_name || s.license_type,
    value: s.count,
  }));

  const revenueRupees = (overview?.revenue_total_paise ?? 0) / 100;

  if (isLoading || !sessionChecked || (isLoggedIn && !isAdmin)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <HugeiconsIcon icon={Loading03Icon} size={32} className="text-indigo-600 animate-spin" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Total users", value: overview?.total_users ?? 0, icon: UserIcon, bg: "bg-blue-100", text: "text-blue-600", ring: "bg-blue-100/60", href: "/admin/users" },
    { label: "Active", value: overview?.active_users ?? 0, icon: Tick02Icon, bg: "bg-emerald-100", text: "text-emerald-600", ring: "bg-emerald-100/60", href: "/admin/users?status=active" },
    { label: "Inactive", value: overview?.inactive_users ?? 0, icon: Cancel01Icon, bg: "bg-gray-100", text: "text-gray-500", ring: "bg-gray-100", href: "/admin/users?status=inactive" },
    { label: "Today active", value: overview?.today_active_users ?? 0, icon: Calendar03Icon, bg: "bg-amber-100", text: "text-amber-600", ring: "bg-amber-100/60", href: "/admin/users" },
    { label: "Revenue", value: `₹${(revenueRupees / 1000).toFixed(1)}k`, icon: RupeeCircleIcon, bg: "bg-violet-100", text: "text-violet-600", ring: "bg-violet-100/60", href: "/admin/transactions" },
    { label: "API health", value: overview?.api_health ? "Healthy" : "Error", icon: CloudIcon, bg: "bg-slate-100", text: overview?.api_health ? "text-emerald-600" : "text-red-600", ring: "bg-slate-100", href: null as string | null },
  ];

  const handleExport = (endpoint: string, filename: string) => {
    if (!sessionToken) return;
    fetch(`${backendUrl}${endpoint}`, {
      headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <HugeiconsIcon icon={ChartLineData01Icon} size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Overview and analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("/api/admin/users/export", "users.csv")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <HugeiconsIcon icon={Download01Icon} size={15} />
            Export Users
          </button>
          <button
            onClick={() => handleExport("/api/admin/transactions/export", "transactions.csv")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <HugeiconsIcon icon={Download01Icon} size={15} />
            Export Revenue
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>{error}</span>
          <button
            onClick={fetchDashboard}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <HugeiconsIcon icon={Loading03Icon} size={28} className="text-indigo-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards — clickable */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          >
            {kpiCards.map((card) => {
              const cardBody = (
                <div className={`rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition overflow-hidden relative ${card.href ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`}>
                  <div className={`absolute top-0 right-0 w-20 h-20 ${card.ring} rounded-bl-full`} />
                  <div className="relative flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <HugeiconsIcon icon={card.icon} size={20} className={card.text} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{card.label}</p>
                      <p className={`text-xl font-bold ${card.text}`}>{card.value}</p>
                    </div>
                  </div>
                </div>
              );
              return card.href ? (
                <Link key={card.label} href={card.href}>{cardBody}</Link>
              ) : (
                <div key={card.label}>{cardBody}</div>
              );
            })}
          </motion.div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="lg:col-span-2 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Revenue (last 6 months)</h2>
              <p className="text-sm text-gray-500 mb-6">Captured payments in ₹ (INR)</p>
              <div style={{ width: "100%", height: 240, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => [`₹${(value ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Plan distribution donut */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-gray-200/80 bg-white px-4 py-2 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Plan Distribution</h2>
              <p className="text-sm text-gray-500 mb-4">Users by license type</p>
              {donutData.length > 0 ? (
                <div style={{ width: "100%", height: 280, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) => [value ?? 0, "Users"]}
                        contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb" }}
                      />
                      <Legend formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No plan data available</div>
              )}
            </motion.div>
          </div>

          {/* Recent rows */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={UserGroupIcon} size={18} className="text-indigo-500" />
                  <h2 className="font-semibold text-gray-900 text-sm">Recent Users</h2>
                </div>
                <Link href="/admin/users" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
              </div>
              {recentUsers.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No users yet</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Name / Email</th>
                      <th className="px-4 py-2.5 text-left font-medium">Plan</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentUsers.map((u, i) => (
                      <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 truncate max-w-[140px] capitalize">{u.Name || "—"}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">{u.UserId || u.EmailId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                            {u.LicenseType || "TRIAL"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.ActivationStatus ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            {u.ActivationStatus ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={RupeeCircleIcon} size={18} className="text-violet-500" />
                  <h2 className="font-semibold text-gray-900 text-sm">Recent Transactions</h2>
                </div>
                <Link href="/admin/transactions" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
              </div>
              {recentTxs.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No transactions yet</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">User</th>
                      <th className="px-4 py-2.5 text-left font-medium">Plan</th>
                      <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentTxs.map((tx, i) => (
                      <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[110px]">{tx.EmailId || tx.Id}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                            {tx.LicenseType || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          ₹{((tx.AmountPaise ?? 0) / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.Status === "captured" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {tx.Status || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
