"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare02Icon,
  Loading03Icon,
  ChartLineData01Icon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import axios from "axios";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, sessionChecked, sessionToken } = useUser({
    redirectTo: "/login",
  });

  const [overview, setOverview] = useState<{
    total_users?: number;
    active_users?: number;
    inactive_users?: number;
  } | null>(null);
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
      .catch((err) => setError(err.response?.data?.error || "Failed to load overview"))
      .finally(() => setLoading(false));
  }, [isAdmin, sessionToken, backendUrl]);

  if (isLoading || !sessionChecked || (isLoggedIn && !isAdmin)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <HugeiconsIcon icon={Loading03Icon} size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <HugeiconsIcon icon={ChartLineData01Icon} size={24} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview and analytics</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <HugeiconsIcon icon={Loading03Icon} size={28} className="text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overview?.total_users ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{overview?.active_users ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sm:col-span-2 lg:col-span-1">
              <p className="text-sm font-medium text-gray-500">Inactive</p>
              <p className="text-2xl font-bold text-gray-500 mt-1">{overview?.inactive_users ?? 0}</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
