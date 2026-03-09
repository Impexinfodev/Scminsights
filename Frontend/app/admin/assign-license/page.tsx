"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Ticket01Icon,
  Loading03Icon,
  Search01Icon,
  UserGroupIcon,
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
import { useUser } from "@/hooks/useUser";
import axios from "axios";

interface UserRow {
  UserId?: string;
  EmailId?: string;
  Name?: string;
  Company?: string;
  LicenseType?: string;
  ActivationStatus?: boolean;
}

interface LicenseOption {
  LicenseType: string;
  LicenseName?: string;
}

interface LicenseStat {
  license_type: string;
  license_name: string;
  count: number;
}

const LICENSE_BADGE_COLORS: Record<string, string> = {
  TRIAL: "bg-amber-100 text-amber-800 border-amber-200",
  DIRECTORY: "bg-blue-100 text-blue-800 border-blue-200",
  TRADE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  BUNDLE: "bg-violet-100 text-violet-800 border-violet-200",
};
function getLicenseBadgeClass(licenseType: string): string {
  return (
    LICENSE_BADGE_COLORS[licenseType] ??
    "bg-gray-100 text-gray-800 border-gray-200"
  );
}

function AdminAssignLicenseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isLoading: userLoading,
    isLoggedIn,
    sessionChecked,
    sessionToken,
  } = useUser({
    redirectTo: "/login",
  });

  const [users, setUsers] = useState<UserRow[]>([]);
  const [licenses, setLicenses] = useState<LicenseOption[]>([]);
  const [licenseStats, setLicenseStats] = useState<{
    total_users: number;
    by_license: LicenseStat[];
  }>({ total_users: 0, by_license: [] });
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => searchParams.get("search") || "",
  );
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total_users: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [openDropdownFor, setOpenDropdownFor] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = user?.user_details?.Role === "ADMIN";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!sessionChecked || !isLoggedIn) return;
    if (sessionChecked && isLoggedIn && !isAdmin) {
      router.replace("/");
    }
  }, [sessionChecked, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q != null && q !== "") {
      setSearch(q);
      setDebouncedSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(
    (pageOverride?: number) => {
      if (!isAdmin || !sessionToken || !backendUrl) return;
      const page = pageOverride ?? pagination.page;
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pagination.page_size),
        sort_order: "desc",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      axios
        .get(`${backendUrl}/api/admin/users?${params}`, {
          headers: {
            "Session-Token": sessionToken ?? "",
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
        .catch((err: any) => {
          setError(err.response?.data?.error || "Failed to load users");
          setUsers([]);
        })
        .finally(() => setLoading(false));
    },
    [
      isAdmin,
      sessionToken,
      backendUrl,
      debouncedSearch,
      pagination.page,
      pagination.page_size,
    ],
  );

  const fetchLicenses = useCallback(async () => {
    if (!sessionToken || !backendUrl) return;
    try {
      const res = await axios.get(`${backendUrl}/api/admin/licenses`, {
        headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" },
        withCredentials: true,
      });
      setLicenses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLicenses([]);
    }
  }, [sessionToken, backendUrl]);

  const fetchLicenseStats = useCallback(async () => {
    if (!sessionToken || !backendUrl) return;
    try {
      const res = await axios.get(`${backendUrl}/api/admin/licenses/stats`, {
        headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" },
        withCredentials: true,
      });
      setLicenseStats({
        total_users: res.data?.total_users ?? 0,
        by_license: res.data?.by_license ?? [],
      });
    } catch {
      setLicenseStats({ total_users: 0, by_license: [] });
    }
  }, [sessionToken, backendUrl]);

  useEffect(() => {
    if (!isAdmin || !sessionToken) return;
    fetchLicenses();
  }, [isAdmin, sessionToken, fetchLicenses]);

  useEffect(() => {
    if (!isAdmin || !sessionToken) return;
    fetchLicenseStats();
  }, [isAdmin, sessionToken, fetchLicenseStats]);

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      setPagination((p) => ({ ...p, page: 1 }));
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (!isAdmin || !sessionToken) return;
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    function handleClickOutside() {
      setOpenDropdownFor(null);
      setDropdownAnchor(null);
    }
    if (openDropdownFor) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openDropdownFor]);

  const handleAssign = async (
    userId: string,
    emailId: string,
    licenseType: string,
  ) => {
    if (!sessionToken || !backendUrl) return;
    setAssigning(userId);
    setError(null);
    setSuccess(null);
    try {
      await axios.post(
        `${backendUrl}/api/admin/assign-license`,
        { UserId: userId, EmailId: emailId, LicenseType: licenseType },
        {
          headers: {
            "Session-Token": sessionToken ?? "",
            "X-Client": "scm-insights",
          },
          withCredentials: true,
        },
      );
      setSuccess(`License "${licenseType}" assigned to ${emailId || userId}.`);
      fetchUsers();
      fetchLicenseStats();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to assign license");
    } finally {
      setAssigning(null);
    }
  };

  if (userLoading || !sessionChecked || (isLoggedIn && !isAdmin)) {
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
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <HugeiconsIcon icon={Ticket01Icon} size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign License</h1>
          <p className="text-sm text-gray-500">
            Search users and assign a plan (admin only)
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
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
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="p-1 hover:bg-emerald-100 rounded"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <HugeiconsIcon icon={Search01Icon} size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by email, name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
        </div>
      </div>

      {/* License stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-600/80">
            Total users
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            {licenseStats.total_users}
          </p>
        </div>
        {licenseStats.by_license.map((item, idx) => {
          const colors = [
            "text-amber-600/80",
            "text-blue-600/80",
            "text-violet-600/80",
            "text-emerald-600/80",
          ];
          const borderBg = [
            "border-amber-200/60 bg-amber-50/50",
            "border-blue-200/60 bg-blue-50/50",
            "border-violet-200/60 bg-violet-50/50",
            "border-emerald-200/60 bg-emerald-50/50",
          ];
          const i = idx % 4;
          return (
            <div
              key={item.license_type}
              className={`rounded-xl border p-4 shadow-sm ${borderBg[i]}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wider ${colors[i]}`}
              >
                {item.license_name}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {item.count}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">users</p>
            </div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200/80 shadow-sm"
      >
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <span className="text-sm text-gray-600">
            {pagination.total_users > 0
              ? `Showing ${(pagination.page - 1) * pagination.page_size + 1}–${Math.min(pagination.page * pagination.page_size, pagination.total_users)} of ${pagination.total_users}`
              : "No users"}
          </span>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Rows per page
            <select
              value={pagination.page_size}
              onChange={(e) =>
                setPagination((p) => ({
                  ...p,
                  page_size: Number(e.target.value),
                  page: 1,
                }))
              }
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
              className="text-indigo-500 animate-spin"
            />
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 text-sm">
            {debouncedSearch
              ? "No users match your search."
              : "No users found."}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Current license
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">
                    Assign
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {users.map((u) => (
                  <tr
                    key={u.UserId ?? u.EmailId}
                    className="hover:bg-gray-50/80"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                          <HugeiconsIcon
                            icon={UserGroupIcon}
                            size={18}
                            className="text-violet-600"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {u.Name || "—"}
                          </div>
                          <div className="text-xs text-gray-500 break-all">
                            {u.EmailId ?? u.UserId ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                      {u.Company ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg border ${getLicenseBadgeClass(
                          u.LicenseType ?? "TRIAL",
                        )}`}
                      >
                        {u.LicenseType ?? "TRIAL"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <div className="relative min-w-[140px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const key = u.UserId ?? u.EmailId ?? "";
                              const isOpen = openDropdownFor === key;
                              if (isOpen) {
                                setOpenDropdownFor(null);
                                setDropdownAnchor(null);
                              } else {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setOpenDropdownFor(key);
                                setDropdownAnchor({
                                  top: rect.bottom,
                                  left: rect.left,
                                  width: Math.max(rect.width, 160),
                                });
                              }
                            }}
                            disabled={!!assigning}
                            className="w-full text-left text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white hover:border-violet-300 hover:bg-violet-50/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-colors flex items-center justify-between gap-1 disabled:opacity-50"
                          >
                            <span className="text-gray-500 truncate">
                              Assign plan…
                            </span>
                            <HugeiconsIcon
                              icon={ArrowDown01Icon}
                              size={14}
                              className={`text-gray-400 shrink-0 transition-transform ${
                                openDropdownFor === (u.UserId ?? u.EmailId)
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>
                          {openDropdownFor === (u.UserId ?? u.EmailId) &&
                            dropdownAnchor &&
                            typeof document !== "undefined" &&
                            createPortal(
                              <div
                                className="fixed py-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-9999 min-w-[160px]"
                                style={{
                                  top: dropdownAnchor.top + 4,
                                  left: dropdownAnchor.left,
                                  width: dropdownAnchor.width,
                                }}
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                {licenses.map((lic) => (
                                  <button
                                    key={lic.LicenseType}
                                    type="button"
                                    onClick={async () => {
                                      setOpenDropdownFor(null);
                                      setDropdownAnchor(null);
                                      await handleAssign(
                                        u.UserId ?? u.EmailId ?? "",
                                        u.EmailId ?? "",
                                        lic.LicenseType,
                                      );
                                    }}
                                    disabled={!!assigning}
                                    className="w-full text-left text-xs px-3 py-2 rounded-lg mx-1.5 hover:bg-violet-50 hover:text-violet-700 text-gray-700 transition-colors disabled:opacity-50"
                                  >
                                    {lic.LicenseName ?? lic.LicenseType}
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )}
                        </div>
                        {assigning === (u.UserId ?? u.EmailId) && (
                          <HugeiconsIcon
                            icon={Loading03Icon}
                            size={16}
                            className="animate-spin text-violet-500 shrink-0"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                Next <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function AdminAssignLicensePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={32}
            className="text-blue-600 animate-spin"
          />
        </div>
      }
    >
      <AdminAssignLicenseContent />
    </Suspense>
  );
}
