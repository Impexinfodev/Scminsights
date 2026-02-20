"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Ticket01Icon,
  Loading03Icon,
  Add01Icon,
  Edit02Icon,
  Delete02Icon,
  Cancel01Icon,
  Database01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import axios from "axios";

type AccessShape = {
  Access: "full" | "limited" | "custom";
  MaxRows?: number;
  MaxRowsPerSearch?: number;
  MaxSearchesPerPeriod?: number;
};

type Plan = {
  LicenseType: string;
  LicenseName: string;
  Price?: number;
  PriceINR?: number;
  PriceUSD?: number;
  ShortDescription: string;
  Directory: AccessShape;
  Buyers: AccessShape;
  Suppliers: AccessShape;
  Validity?: string;
  ValidityDays?: number;
};

const defaultDirectory: AccessShape = {
  Access: "limited",
  MaxRows: 10,
  MaxRowsPerSearch: 5,
};
const defaultBuyers: AccessShape = {
  Access: "custom",
  MaxSearchesPerPeriod: 0,
  MaxRowsPerSearch: 0,
};
const defaultSuppliers: AccessShape = {
  Access: "custom",
  MaxSearchesPerPeriod: 0,
  MaxRowsPerSearch: 0,
};

const emptyPlan: Plan = {
  LicenseType: "",
  LicenseName: "",
  PriceINR: 0,
  PriceUSD: 0,
  ShortDescription: "",
  Directory: { ...defaultDirectory },
  Buyers: { ...defaultBuyers },
  Suppliers: { ...defaultSuppliers },
  Validity: "Year",
  ValidityDays: 365,
};

function summarizeAccess(label: string, a: AccessShape): string {
  if (a.Access === "full") return "Full access";
  if (a.Access === "limited" && "MaxRows" in a)
    return `${a.MaxRows} rows total, ${a.MaxRowsPerSearch ?? 0} per search`;
  const searches = a.MaxSearchesPerPeriod ?? 0;
  const rows = a.MaxRowsPerSearch ?? 0;
  if (searches === 0 && rows === 0) return "No access";
  return `${searches} searches/period, ${rows} rows/search`;
}

export default function AdminPlansPage() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, sessionChecked, sessionToken } = useUser(
    { redirectTo: "/login" },
  );
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Plan>(emptyPlan);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = user?.user_details?.Role === "ADMIN";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchPlans = useCallback(() => {
    if (!sessionToken || !backendUrl) return;
    setLoading(true);
    setError(null);
    axios
      .get(`${backendUrl}/api/admin/licenses`, {
        headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" },
        withCredentials: true,
      })
      .then((res) => setPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load plans"))
      .finally(() => setLoading(false));
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
    fetchPlans();
  }, [isAdmin, sessionToken, backendUrl, fetchPlans]);

  const openCreate = () => {
    setForm({
      ...emptyPlan,
      Directory: { ...defaultDirectory },
      Buyers: { ...defaultBuyers },
      Suppliers: { ...defaultSuppliers },
    });
    setModal("create");
  };

  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setForm({
      LicenseType: p.LicenseType,
      LicenseName: p.LicenseName,
      PriceINR: p.PriceINR ?? 0,
      PriceUSD: p.PriceUSD ?? p.Price ?? 0,
      ShortDescription: p.ShortDescription ?? "",
      Directory: { ...defaultDirectory, ...p.Directory },
      Buyers: { ...defaultBuyers, ...p.Buyers },
      Suppliers: { ...defaultSuppliers, ...p.Suppliers },
      Validity: p.Validity ?? "Year",
      ValidityDays: p.ValidityDays ?? 365,
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditingPlan(null);
    setForm(emptyPlan);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !backendUrl) return;
    const payload = {
      LicenseType: form.LicenseType.trim(),
      LicenseName: form.LicenseName.trim() || form.LicenseType.trim(),
      PriceINR: Number(form.PriceINR) ?? 0,
      PriceUSD: Number(form.PriceUSD) ?? 0,
      ShortDescription: form.ShortDescription.trim(),
      Directory: form.Directory,
      Buyers: form.Buyers,
      Suppliers: form.Suppliers,
      Validity: form.Validity || "Year",
      ValidityDays: Number(form.ValidityDays) || 365,
    };
    if (!payload.LicenseType) {
      setError("License type is required");
      return;
    }
    setSubmitLoading(true);
    setError(null);
    const method = modal === "create" ? "post" : "put";
    const url = `${backendUrl}/api/admin/license`;
    axios({
      method,
      url,
      data: payload,
      headers: {
        "Session-Token": sessionToken,
        "X-Client": "scm-insights",
        "Content-Type": "application/json",
      },
      withCredentials: true,
    })
      .then(() => {
        fetchPlans();
        closeModal();
      })
      .catch((err) =>
        setError(err.response?.data?.error || "Failed to save plan"),
      )
      .finally(() => setSubmitLoading(false));
  };

  const handleDelete = (licenseType: string) => {
    if (!sessionToken || !backendUrl) return;
    setSubmitLoading(true);
    setError(null);
    axios
      .delete(
        `${backendUrl}/api/admin/license?LicenseType=${encodeURIComponent(licenseType)}`,
        {
          headers: {
            "Session-Token": sessionToken,
            "X-Client": "scm-insights",
          },
          withCredentials: true,
        },
      )
      .then(() => {
        fetchPlans();
        setDeleteConfirm(null);
      })
      .catch((err) =>
        setError(err.response?.data?.error || "Failed to delete plan"),
      )
      .finally(() => setSubmitLoading(false));
  };

  const updateForm = (updates: Partial<Plan>) =>
    setForm((f) => ({ ...f, ...updates }));
  const updateDirectory = (updates: Partial<AccessShape>) =>
    setForm((f) => ({ ...f, Directory: { ...f.Directory, ...updates } }));
  const updateBuyers = (updates: Partial<AccessShape>) =>
    setForm((f) => ({ ...f, Buyers: { ...f.Buyers, ...updates } }));
  const updateSuppliers = (updates: Partial<AccessShape>) =>
    setForm((f) => ({ ...f, Suppliers: { ...f.Suppliers, ...updates } }));

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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <HugeiconsIcon
              icon={Ticket01Icon}
              size={24}
              className="text-blue-600"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Plans & Pricing
            </h1>
            <p className="text-sm text-gray-500">
              Manage license plans for Directory, Buyers and Suppliers
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <HugeiconsIcon icon={Add01Icon} size={18} />
          Create plan
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={32}
            className="text-blue-600 animate-spin"
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {plans.map((plan) => (
            <div
              key={plan.LicenseType}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:border-gray-300 transition-colors"
            >
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {plan.LicenseName || plan.LicenseType}
                    </h3>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">
                      {plan.LicenseType}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-blue-600 shrink-0 whitespace-nowrap">
                    ₹{Number(plan.PriceINR ?? plan.Price ?? 0).toLocaleString()} / $
                    {Number(plan.PriceUSD ?? plan.Price ?? 0).toLocaleString()}
                  </span>
                </div>
                {plan.ShortDescription && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                    {plan.ShortDescription}
                  </p>
                )}
                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2.5 px-3 text-gray-500 font-medium w-24 align-top">
                          <span className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={Database01Icon} size={14} className="text-blue-600 shrink-0" />
                            Directory
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">{summarizeAccess("Directory", plan.Directory)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-gray-500 font-medium align-top">
                          <span className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={UserAdd01Icon} size={14} className="text-blue-600 shrink-0" />
                            Buyers
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">{summarizeAccess("Buyers", plan.Buyers)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-gray-500 font-medium align-top">
                          <span className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={UserGroupIcon} size={14} className="text-blue-600 shrink-0" />
                            Suppliers
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">{summarizeAccess("Suppliers", plan.Suppliers)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-auto p-4 bg-gray-50/80 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(plan)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <HugeiconsIcon icon={Edit02Icon} size={16} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    plan.LicenseType !== "TRIAL" &&
                    setDeleteConfirm(plan.LicenseType)
                  }
                  disabled={plan.LicenseType === "TRIAL"}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={
                    plan.LicenseType === "TRIAL"
                      ? "Trial plan cannot be deleted"
                      : "Delete plan"
                  }
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
                <h2 className="text-base font-semibold text-gray-900">
                  {modal === "create" ? "Create plan" : "Edit plan"}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License type (ID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.LicenseType}
                      onChange={(e) =>
                        updateForm({
                          LicenseType: e.target.value
                            .replace(/\s/g, "_")
                            .toUpperCase(),
                        })
                      }
                      placeholder="e.g. SILVER, GOLD"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      disabled={modal === "edit"}
                    />
                    {modal === "edit" && (
                      <p className="text-xs text-gray-500 mt-1">
                        ID cannot be changed when editing.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={form.LicenseName}
                      onChange={(e) =>
                        updateForm({ LicenseName: e.target.value })
                      }
                      placeholder="e.g. Silver"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Price (₹ INR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.PriceINR ?? ""}
                      onChange={(e) =>
                        updateForm({
                          PriceINR:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Price ($ USD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.PriceUSD ?? ""}
                      onChange={(e) =>
                        updateForm({
                          PriceUSD:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Validity
                    </label>
                    <select
                      value={form.Validity}
                      onChange={(e) =>
                        updateForm({
                          Validity: e.target.value,
                          ValidityDays: e.target.value === "Year" ? 365 : 30,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Month">Month</option>
                      <option value="Year">Year</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short description
                  </label>
                  <textarea
                    value={form.ShortDescription}
                    onChange={(e) =>
                      updateForm({ ShortDescription: e.target.value })
                    }
                    rows={2}
                    placeholder="Brief description for this plan"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Directory */}
                <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
                    <HugeiconsIcon
                      icon={Database01Icon}
                      size={14}
                      className="text-blue-600"
                    />
                    Directory
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="dirAccess"
                        checked={form.Directory.Access === "full"}
                        onChange={() => updateDirectory({ Access: "full" })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Full access</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="dirAccess"
                        checked={form.Directory.Access === "limited"}
                        onChange={() => updateDirectory({ Access: "limited" })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Limited (rows)</span>
                    </label>
                  </div>
                  {form.Directory.Access === "limited" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Max rows total
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.Directory.MaxRows ?? 10}
                          onChange={(e) =>
                            updateDirectory({
                              MaxRows: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Max rows per search
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.Directory.MaxRowsPerSearch ?? 5}
                          onChange={(e) =>
                            updateDirectory({
                              MaxRowsPerSearch: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Buyers */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <HugeiconsIcon
                      icon={UserAdd01Icon}
                      size={18}
                      className="text-blue-600"
                    />
                    Buyers
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="buyersAccess"
                        checked={form.Buyers.Access === "full"}
                        onChange={() => updateBuyers({ Access: "full" })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Full access</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="buyersAccess"
                        checked={form.Buyers.Access === "custom"}
                        onChange={() => updateBuyers({ Access: "custom" })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Custom</span>
                    </label>
                  </div>
                  {form.Buyers.Access === "custom" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Max searches per period
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.Buyers.MaxSearchesPerPeriod ?? 0}
                          onChange={(e) =>
                            updateBuyers({
                              MaxSearchesPerPeriod: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Max rows per search
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.Buyers.MaxRowsPerSearch ?? 0}
                          onChange={(e) =>
                            updateBuyers({
                              MaxRowsPerSearch: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Suppliers */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <HugeiconsIcon
                      icon={UserGroupIcon}
                      size={18}
                      className="text-blue-600"
                    />
                    Suppliers
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="suppliersAccess"
                        checked={form.Suppliers.Access === "full"}
                        onChange={() => updateSuppliers({ Access: "full" })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Full access</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="suppliersAccess"
                        checked={form.Suppliers.Access === "custom"}
                        onChange={() => updateSuppliers({ Access: "custom" })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Custom</span>
                    </label>
                  </div>
                  {form.Suppliers.Access === "custom" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Max searches per period
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.Suppliers.MaxSearchesPerPeriod ?? 0}
                          onChange={(e) =>
                            updateSuppliers({
                              MaxSearchesPerPeriod: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Max rows per search
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.Suppliers.MaxRowsPerSearch ?? 0}
                          onChange={(e) =>
                            updateSuppliers({
                              MaxRowsPerSearch: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                  >
                    {submitLoading && (
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        size={18}
                        className="animate-spin"
                      />
                    )}
                    {modal === "create" ? "Create plan" : "Save changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
            >
              <p className="text-gray-800 font-medium">
                Delete plan &quot;{deleteConfirm}&quot;?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This cannot be undone. Users on this plan may need to be
                reassigned.
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={submitLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
                >
                  {submitLoading ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
