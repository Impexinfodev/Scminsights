"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Ticket01Icon,
  Loading03Icon,
  Cancel01Icon,
  Download01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
import { useUser } from "@/hooks/useUser";
import axios from "axios";

type Transaction = {
  Id: number;
  RazorpayOrderId: string;
  RazorpayPaymentId: string;
  UserId: string;
  EmailId: string;
  LicenseType: string;
  AmountPaise: number;
  Currency: string;
  Status: string;
  SourceWebsite: string;
  MetadataJson: string | null;
  CreatedAt: string;
  UpdatedAt: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export default function AdminTransactionsPage() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, sessionChecked, sessionToken } = useUser(
    {
      redirectTo: "/login",
    },
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 50,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    user_id: "",
    from_date: "",
    to_date: "",
    website: "",
  });

  const isAdmin = user?.user_details?.Role === "ADMIN";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchTransactions = useCallback(
    (pageOverride?: number) => {
      if (!sessionToken || !backendUrl) return;
      setLoading(true);
      setError(null);
      const page = pageOverride ?? pagination.page;
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pagination.page_size),
        sort_order: "desc",
      });
      if (filters.status) params.set("status", filters.status);
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.from_date) params.set("from_date", filters.from_date);
      if (filters.to_date) params.set("to_date", filters.to_date);
      if (filters.website) params.set("website", filters.website);
      axios
        .get(`${backendUrl}/api/admin/transactions?${params.toString()}`, {
          headers: {
            "Session-Token": sessionToken,
            "X-Client": "scm-insights",
          },
        })
        .then((res) => {
          setTransactions(res.data?.transactions ?? []);
          setPagination((prev) => ({
            ...prev,
            ...res.data?.pagination,
            total: res.data?.pagination?.total ?? 0,
            total_pages: res.data?.pagination?.total_pages ?? 0,
          }));
        })
        .catch((err) =>
          setError(err.response?.data?.error || "Failed to load transactions"),
        )
        .finally(() => setLoading(false));
    },
    [sessionToken, backendUrl, pagination.page, pagination.page_size, filters],
  );

  useEffect(() => {
    if (!sessionChecked || !isLoggedIn) return;
    if (sessionChecked && isLoggedIn && !isAdmin) {
      router.replace("/");
      return;
    }
  }, [sessionChecked, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !sessionToken || !backendUrl) return;
    fetchTransactions();
  }, [isAdmin, sessionToken, backendUrl, fetchTransactions]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (!backendUrl || !sessionToken) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.from_date) params.set("from_date", filters.from_date);
      if (filters.to_date) params.set("to_date", filters.to_date);
      if (filters.website) params.set("website", filters.website);
      const res = await fetch(
        `${backendUrl}/api/admin/transactions/export?${params.toString()}`,
        {
          headers: {
            "Session-Token": sessionToken,
            "X-Client": "scm-insights",
          },
        },
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transactions.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export. Check filters or try again.");
    } finally {
      setExporting(false);
    }
  };

  const amountRupees = (paise: number) =>
    (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const formatDate = (s: string) =>
    s
      ? new Date(s).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "—";

  if (isLoading || !sessionChecked || (isLoggedIn && !isAdmin)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <HugeiconsIcon
          icon={Loading03Icon}
          size={32}
          className="text-blue-600 animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <HugeiconsIcon
              icon={Ticket01Icon}
              size={24}
              className="text-white"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Transaction records
            </h1>
            <p className="text-sm text-gray-500">
              Razorpay payments (INR). Export to CSV/Excel.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
        >
          <HugeiconsIcon icon={Download01Icon} size={18} />
          {exporting ? "Exporting…" : "Export to Excel (CSV)"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <input
          type="text"
          placeholder="User / Email"
          value={filters.user_id}
          onChange={(e) =>
            setFilters((f) => ({ ...f, user_id: e.target.value }))
          }
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">All statuses</option>
          <option value="created">Created</option>
          <option value="captured">Captured</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="text"
          placeholder="Website"
          value={filters.website}
          onChange={(e) =>
            setFilters((f) => ({ ...f, website: e.target.value }))
          }
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          title="Filter by source website (e.g. scminsights)"
        />
        <input
          type="date"
          placeholder="From"
          value={filters.from_date}
          onChange={(e) =>
            setFilters((f) => ({ ...f, from_date: e.target.value }))
          }
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        />
        <input
          type="date"
          placeholder="To"
          value={filters.to_date}
          onChange={(e) =>
            setFilters((f) => ({ ...f, to_date: e.target.value }))
          }
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setPagination((p) => ({ ...p, page: 1 }));
            fetchTransactions(1);
          }}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Apply
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <span className="text-sm text-gray-600">
            {pagination.total > 0
              ? `Showing ${(pagination.page - 1) * pagination.page_size + 1}–${Math.min(pagination.page * pagination.page_size, pagination.total)} of ${pagination.total}`
              : "No transactions"}
          </span>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Rows per page
            <select
              value={pagination.page_size}
              onChange={(e) => {
                setPagination((p) => ({ ...p, page_size: Number(e.target.value), page: 1 }));
              }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={28}
              className="text-blue-600 animate-spin"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User / Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount (₹)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Website
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.Id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(t.CreatedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {t.UserId}
                        </div>
                        <div className="text-gray-500 text-xs truncate max-w-[180px]">
                          {t.EmailId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {t.LicenseType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium tabular-nums">
                        ₹{amountRupees(t.AmountPaise)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            t.Status === "captured"
                              ? "bg-emerald-100 text-emerald-700"
                              : t.Status === "created"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {t.Status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {t.SourceWebsite || "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-xs text-gray-500 font-mono hidden md:table-cell truncate max-w-[140px]"
                        title={t.RazorpayOrderId}
                      >
                        {t.RazorpayOrderId}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailRow(t)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>Page {pagination.page} of {pagination.total_pages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => {
                  setPagination((p) => ({ ...p, page: p.page - 1 }));
                  fetchTransactions(pagination.page - 1);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => {
                  setPagination((p) => ({ ...p, page: p.page + 1 }));
                  fetchTransactions(pagination.page + 1);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                Next <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Detail modal */}
      <AnimatePresence>
        {detailRow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDetailRow(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  Transaction details
                </h2>
                <button
                  type="button"
                  onClick={() => setDetailRow(null)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <span className="text-gray-500">ID</span>
                  <span className="font-mono">{detailRow.Id}</span>
                  <span className="text-gray-500">Date</span>
                  <span>{formatDate(detailRow.CreatedAt)}</span>
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-mono break-all">
                    {detailRow.RazorpayOrderId}
                  </span>
                  <span className="text-gray-500">Payment ID</span>
                  <span className="font-mono break-all">
                    {detailRow.RazorpayPaymentId || "—"}
                  </span>
                  <span className="text-gray-500">User ID</span>
                  <span className="break-all">{detailRow.UserId}</span>
                  <span className="text-gray-500">Email</span>
                  <span className="break-all">{detailRow.EmailId}</span>
                  <span className="text-gray-500">Plan</span>
                  <span>{detailRow.LicenseType}</span>
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold">
                    ₹{amountRupees(detailRow.AmountPaise)} {detailRow.Currency}
                  </span>
                  <span className="text-gray-500">Status</span>
                  <span>{detailRow.Status}</span>
                  <span className="text-gray-500">Website</span>
                  <span>{detailRow.SourceWebsite || "—"}</span>
                  <span className="text-gray-500">Updated</span>
                  <span>{formatDate(detailRow.UpdatedAt)}</span>
                </div>
                {detailRow.MetadataJson && (
                  <div>
                    <span className="text-gray-500 block mb-1">Metadata</span>
                    <pre className="p-3 rounded-lg bg-gray-50 text-xs overflow-x-auto">
                      {typeof detailRow.MetadataJson === "string"
                        ? detailRow.MetadataJson
                        : JSON.stringify(detailRow.MetadataJson, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
