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
  Copy01Icon,
  Mail01Icon,
  UserIcon,
  RupeeCircleIcon,
  Calendar01Icon,
  GlobalIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
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
  IsTestMode?: boolean;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

// ─── Copy helper ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className="ml-1.5 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
    >
      <HugeiconsIcon icon={copied ? CheckmarkCircle02Icon : Copy01Icon} size={13} className={copied ? "text-emerald-500" : ""} />
    </button>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    captured: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    created:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"  },
    failed:   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"    },
  };
  const s = map[status?.toLowerCase()] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status || "—"}
    </span>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono = false, copyable = false, icon }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
  icon?: any;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {icon && (
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
          <HugeiconsIcon icon={icon} size={14} className="text-gray-500" />
        </div>
      )}
      <div className={`flex-1 min-w-0 ${icon ? "" : "pl-10"}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
        <div className={`flex items-center gap-1 ${mono ? "font-mono text-xs" : "text-sm"} text-gray-800 font-medium`}>
          <span className="break-all">{value || "—"}</span>
          {copyable && typeof value === "string" && value && <CopyButton value={value} />}
        </div>
      </div>
    </div>
  );
}

// ─── Transaction Detail Modal ─────────────────────────────────────────────────

function TransactionDetailModal({
  tx,
  onClose,
  amountRupees,
  formatDate,
}: {
  tx: Transaction;
  onClose: () => void;
  amountRupees: (p: number) => string;
  formatDate: (s: string) => string;
}) {
  const isCaptured = tx.Status?.toLowerCase() === "captured";

  let metadata: Record<string, any> | null = null;
  if (tx.MetadataJson) {
    try {
      metadata = typeof tx.MetadataJson === "string" ? JSON.parse(tx.MetadataJson) : tx.MetadataJson;
    } catch { /* ignore */ }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* ── Header ── */}
        <div className={`px-5 pt-5 pb-4 ${isCaptured ? "bg-gradient-to-br from-emerald-50 to-white" : "bg-gradient-to-br from-amber-50 to-white"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${isCaptured ? "bg-emerald-100" : "bg-amber-100"}`}>
                <HugeiconsIcon icon={Ticket01Icon} size={22} className={isCaptured ? "text-emerald-600" : "text-amber-600"} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-snug">Transaction #{tx.Id}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(tx.CreatedAt)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </button>
          </div>

          {/* Amount + Status strip */}
          <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-white/70 border border-gray-100 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Amount</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">₹{amountRupees(tx.AmountPaise)}</p>
              <p className="text-xs text-gray-400 font-medium">{tx.Currency || "INR"}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</p>
              <StatusBadge status={tx.Status} />
              {tx.IsTestMode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 tracking-wide">TEST MODE</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-3">

          {/* User Details */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 mt-1">User Details</p>
          <div className="bg-gray-50 rounded-xl px-4 py-1 mb-4">
            <DetailRow label="Email" value={tx.EmailId} icon={Mail01Icon} copyable />
            <DetailRow label="User ID" value={tx.UserId} icon={UserIcon} mono copyable />
            <DetailRow label="Plan" value={
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                {tx.LicenseType || "—"}
              </span>
            } icon={InformationCircleIcon} />
          </div>

          {/* Payment Details */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Payment Details</p>
          <div className="bg-gray-50 rounded-xl px-4 py-1 mb-4">
            <DetailRow label="Order ID" value={tx.RazorpayOrderId} icon={RupeeCircleIcon} mono copyable />
            <DetailRow label="Payment ID" value={tx.RazorpayPaymentId || "—"} icon={RupeeCircleIcon} mono copyable={!!tx.RazorpayPaymentId} />
            <DetailRow label="Source Website" value={tx.SourceWebsite} icon={GlobalIcon} />
            <DetailRow label="Last Updated" value={formatDate(tx.UpdatedAt)} icon={Calendar01Icon} />
          </div>

          {/* Metadata */}
          {metadata && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Metadata</p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
            "Session-Token": sessionToken ?? "",
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
            "Session-Token": sessionToken ?? "",
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {t.LicenseType}
                          {t.IsTestMode && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 tracking-wide">TEST</span>
                          )}
                        </div>
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
          <TransactionDetailModal
            tx={detailRow}
            onClose={() => setDetailRow(null)}
            amountRupees={amountRupees}
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
