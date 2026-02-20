"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Ticket01Icon,
  Loading03Icon,
  Search01Icon,
  UserGroupIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
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

export default function AdminAssignLicensePage() {
  const router = useRouter();
  const { user, isLoading: userLoading, isLoggedIn, sessionChecked, sessionToken } = useUser({
    redirectTo: "/login",
  });

  const [users, setUsers] = useState<UserRow[]>([]);
  const [licenses, setLicenses] = useState<LicenseOption[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
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
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin || !sessionToken || !backendUrl) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await axios.get(`${backendUrl}/api/admin/users?${params}`, {
        headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" },
        withCredentials: true,
      });
      setUsers(res.data?.users ?? []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sessionToken, backendUrl, debouncedSearch]);

  const fetchLicenses = useCallback(async () => {
    if (!sessionToken || !backendUrl) return;
    try {
      const res = await axios.get(`${backendUrl}/api/admin/licenses`, {
        headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" },
        withCredentials: true,
      });
      setLicenses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLicenses([]);
    }
  }, [sessionToken, backendUrl]);

  useEffect(() => {
    if (!isAdmin || !sessionToken) return;
    fetchLicenses();
  }, [isAdmin, sessionToken, fetchLicenses]);

  useEffect(() => {
    if (!isAdmin || !sessionToken) return;
    fetchUsers();
  }, [fetchUsers]);

  const handleAssign = async (userId: string, emailId: string, licenseType: string) => {
    if (!sessionToken || !backendUrl) return;
    setAssigning(userId);
    setError(null);
    setSuccess(null);
    try {
      await axios.post(
        `${backendUrl}/api/admin/assign-license`,
        { UserId: userId, EmailId: emailId, LicenseType: licenseType },
        { headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" }, withCredentials: true }
      );
      setSuccess(`License "${licenseType}" assigned to ${emailId || userId}.`);
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to assign license");
    } finally {
      setAssigning(null);
    }
  };

  if (userLoading || !sessionChecked || (isLoggedIn && !isAdmin)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <HugeiconsIcon icon={Loading03Icon} size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <HugeiconsIcon icon={Ticket01Icon} size={24} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign License</h1>
          <p className="text-sm text-gray-500">Search users and assign a plan (admin only)</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded">
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <HugeiconsIcon icon={Loading03Icon} size={28} className="text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Assign
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500 text-sm">
                      {debouncedSearch ? "No users match your search." : "No users found."}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.UserId ?? u.EmailId} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <HugeiconsIcon icon={UserGroupIcon} size={16} className="text-gray-500" />
                          </div>
                          <div>
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
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {u.LicenseType ?? "TRIAL"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 mr-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          defaultValue=""
                          onChange={async (e) => {
                            const val = e.target.value;
                            e.target.value = "";
                            if (!val) return;
                            await handleAssign(
                              u.UserId ?? u.EmailId ?? "",
                              u.EmailId ?? "",
                              val
                            );
                          }}
                          disabled={!!assigning}
                        >
                          <option value="">Select plan…</option>
                          {licenses.map((lic) => (
                            <option key={lic.LicenseType} value={lic.LicenseType}>
                              {lic.LicenseName ?? lic.LicenseType}
                            </option>
                          ))}
                        </select>
                        {assigning === (u.UserId ?? u.EmailId) && (
                          <HugeiconsIcon icon={Loading03Icon} size={16} className="inline animate-spin text-indigo-500" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
