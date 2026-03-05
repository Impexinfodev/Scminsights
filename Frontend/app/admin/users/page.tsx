"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Loading03Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Download01Icon,
  Search01Icon,
  Tick02Icon,
  Cancel01Icon,
  Delete02Icon,
  Ticket01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import axios from "axios";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
type SortBy = "email" | "name" | "status" | "";
type StatusFilter = "" | "active" | "inactive";

interface UserRow {
  UserId?: string;
  EmailId?: string;
  Name?: string;
  Company?: string;
  LicenseType?: string;
  ActivationStatus?: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, sessionChecked, sessionToken } = useUser(
    {
      redirectTo: "/login",
    },
  );

  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total_users: 0,
    total_pages: 0,
  });
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [sortBy, setSortBy] = useState<SortBy>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exporting, setExporting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = user?.user_details?.Role === "ADMIN";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchUsers = useCallback(
    (pageOverride?: number) => {
      if (!isAdmin || !sessionToken || !backendUrl) return;
      setLoading(true);
      setError(null);
      const page = pageOverride ?? pagination.page;
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pagination.page_size),
        sort_order: sortOrder,
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (sortBy) params.set("sort_by", sortBy);
      axios
        .get(`${backendUrl}/api/admin/users?${params}`, {
          headers: {
            "Session-Token": sessionToken,
            "X-Client": "scm-insights",
          },
          withCredentials: true,
        })
        .then((res) => {
          setUsers(res.data?.users ?? []);
          setPagination((prev) => ({
            ...prev,
            page,
            total_users: res.data?.pagination?.total_users ?? 0,
            total_pages: res.data?.pagination?.total_pages ?? 0,
          }));
        })
        .catch((err) =>
          setError(err.response?.data?.error || "Failed to load users"),
        )
        .finally(() => setLoading(false));
    },
    [
      isAdmin,
      sessionToken,
      backendUrl,
      pagination.page,
      pagination.page_size,
      search,
      statusFilter,
      sortBy,
      sortOrder,
    ],
  );

  const fetchOverview = useCallback(() => {
    if (!sessionToken || !backendUrl) return;
    axios
      .get(`${backendUrl}/api/admin/overview`, {
        headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" },
        withCredentials: true,
      })
      .then((res) => {
        setStats({
          total: res.data?.total_users ?? 0,
          active: res.data?.active_users ?? 0,
          inactive: res.data?.inactive_users ?? 0,
        });
      })
      .catch(() => {});
  }, [sessionToken, backendUrl]);

  useEffect(() => {
    if (!sessionChecked || !isLoggedIn) return;
    if (sessionChecked && isLoggedIn && !isAdmin) {
      router.replace("/");
      return;
    }
  }, [sessionChecked, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !sessionToken || !backendUrl) return;
    fetchOverview();
  }, [isAdmin, sessionToken, backendUrl, fetchOverview]);

  useEffect(() => {
    if (!isAdmin || !sessionToken || !backendUrl) return;
    const t = setTimeout(
      () => fetchUsers(1),
      search || statusFilter || sortBy ? 300 : 0,
    );
    return () => clearTimeout(t);
  }, [
    isAdmin,
    sessionToken,
    backendUrl,
    search,
    statusFilter,
    sortBy,
    sortOrder,
    pagination.page_size,
  ]);

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.total_pages) return;
    fetchUsers(page);
  };

  const onPageSizeChange = (newSize: number) => {
    setPagination((p) => ({ ...p, page_size: newSize, page: 1 }));
  };

  const handleSort = (col: SortBy) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortOrder("asc");
    }
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleExport = async () => {
    if (!backendUrl || !sessionToken) return;
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort_order: sortOrder });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (sortBy) params.set("sort_by", sortBy);
      const res = await fetch(
        `${backendUrl}/api/admin/users/export?${params}`,
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
      a.download = "users.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const toggleStatus = async (emailId: string, current: boolean) => {
    if (!sessionToken || !backendUrl) return;
    setActionLoading(emailId);
    setError(null);
    try {
      await axios.put(
        `${backendUrl}/api/admin/user/status`,
        { EmailId: emailId, ActivationStatus: !current },
        {
          headers: {
            "Session-Token": sessionToken,
            "X-Client": "scm-insights",
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );
      fetchUsers(pagination.page);
      fetchOverview();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to update status",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (emailId: string) => {
    if (!sessionToken || !backendUrl) return;
    setActionLoading(emailId);
    setError(null);
    try {
      await axios.delete(
        `${backendUrl}/api/admin/user?EmailId=${encodeURIComponent(emailId)}`,
        {
          headers: {
            "Session-Token": sessionToken,
            "X-Client": "scm-insights",
          },
          withCredentials: true,
        },
      );
      setDeleteConfirm(null);
      fetchUsers(pagination.page);
      fetchOverview();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to delete user",
      );
    } finally {
      setActionLoading(null);
    }
  };

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

  const start = (pagination.page - 1) * pagination.page_size + 1;
  const end = Math.min(
    pagination.page * pagination.page_size,
    pagination.total_users,
  );

  const SortIcon = ({ col }: { col: SortBy }) => {
    if (sortBy !== col) return null;
    return sortOrder === "asc" ? (
      <HugeiconsIcon
        icon={ArrowUp01Icon}
        size={14}
        className="ml-0.5 inline opacity-70"
      />
    ) : (
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        size={14}
        className="ml-0.5 inline opacity-70"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <HugeiconsIcon
              icon={UserGroupIcon}
              size={24}
              className="text-white"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">Manage user accounts</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          <HugeiconsIcon icon={Download01Icon} size={18} />
          {exporting ? "Exporting…" : "Export to Excel (CSV)"}
        </button>
      </div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600/80">
            Total users
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600/80">
            Active
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">
            {stats.active}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600/80">
            Inactive
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-0.5">
            {stats.inactive}
          </p>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 rounded"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Filter by email, name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <span className="text-sm text-gray-600">
            {pagination.total_users > 0
              ? `Showing ${start}–${end} of ${pagination.total_users}`
              : "No users"}
          </span>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Rows per page
            <select
              value={pagination.page_size}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={28}
              className="text-indigo-600 animate-spin"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("email")}
                      className="inline-flex items-center hover:text-indigo-600"
                    >
                      Email <SortIcon col="email" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className="inline-flex items-center hover:text-indigo-600"
                    >
                      Name <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("status")}
                      className="inline-flex items-center hover:text-indigo-600"
                    >
                      Status <SortIcon col="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const emailId = u.EmailId ?? u.UserId ?? "";
                    const isActive = !!u.ActivationStatus;
                    const loadingThis = actionLoading === emailId;
                    return (
                      <tr
                        key={u.UserId || emailId}
                        className="hover:bg-gray-50/80"
                      >
                        <td className="px-4 py-3 flex items-center gap-2 text-sm text-gray-900">
                          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                            <HugeiconsIcon
                              icon={UserGroupIcon}
                              size={18}
                              className="text-violet-600"
                            />
                          </div>
                          <span className="break-all">{emailId}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                          {u.Name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                              isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-row items-center justify-end gap-2">
                            <span className="relative group">
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-20 shadow-lg">
                                {isActive ? "Deactivate user" : "Activate user"}
                              </span>
                              <button
                                type="button"
                                disabled={loadingThis}
                                onClick={() => toggleStatus(emailId, isActive)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                              >
                                {loadingThis ? (
                                  <HugeiconsIcon
                                    icon={Loading03Icon}
                                    size={18}
                                    className="animate-spin"
                                  />
                                ) : isActive ? (
                                  <HugeiconsIcon
                                    icon={Cancel01Icon}
                                    size={18}
                                  />
                                ) : (
                                  <HugeiconsIcon icon={Tick02Icon} size={18} />
                                )}
                              </button>
                            </span>
                            <span className="relative group">
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-20 shadow-lg">
                                Assign license
                              </span>
                              <Link
                                href={`/admin/assign-license?search=${encodeURIComponent(emailId)}`}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                              >
                                <HugeiconsIcon icon={Ticket01Icon} size={18} />
                              </Link>
                            </span>
                            <span className="relative group">
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-20 shadow-lg">
                                Delete user
                              </span>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(emailId)}
                                disabled={loadingThis}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                              >
                                <HugeiconsIcon icon={Delete02Icon} size={18} />
                              </button>
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.total_pages || 1}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 text-gray-700"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Previous
            </button>
            {(() => {
              const total = pagination.total_pages || 1;
              const current = pagination.page;
              const delta = 2;
              const low = Math.max(1, current - delta);
              const high = Math.min(total, current + delta);
              const pages: number[] = [];
              for (let p = low; p <= high; p++) pages.push(p);
              return pages.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => goToPage(pageNum)}
                  className={`min-w-9 h-9 rounded-lg border text-sm font-medium ${
                    pagination.page === pageNum
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              ));
            })()}
            <button
              type="button"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => goToPage(pagination.page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 text-gray-700"
            >
              Next <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !actionLoading && setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-700 font-medium">
              Delete user <strong>{deleteConfirm}</strong>? This cannot be
              undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={!!actionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <HugeiconsIcon icon={Delete02Icon} size={18} />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
