"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Mail01Icon,
  CallIcon,
  Building02Icon,
  Calendar01Icon,
  SecurityCheckIcon,
  Loading03Icon,
  PencilEdit01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  Delete01Icon,
  LockPasswordIcon,
  AlertCircleIcon,
  Invoice01Icon,
  CreditCardIcon,
  Tick02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type Payment = {
  order_id: string;
  plan: string;
  amount_inr: number;
  currency: string;
  status: string;
  date: string | null;
  updated: string | null;
  invoice_number: string | null;
};

// ─── Invoice generator (browser print → Save as PDF) ──────────────────────────

function generateInvoiceHTML(payment: Payment, user: { name: string; email: string; company: string }): string {
  const planLabels: Record<string, string> = {
    TRIAL: "Trial Plan",
    DIRECTORY: "Directory Plan",
    TRADE: "Buyers & Suppliers Plan",
    BUNDLE: "Unlimited Bundle Plan",
  };
  const planLabel = planLabels[payment.plan] ?? payment.plan;
  const dateStr = payment.date ? new Date(payment.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";
  const invoiceNo = payment.invoice_number || `INV-${payment.order_id?.slice(-8).toUpperCase()}`;
  const base = payment.amount_inr / 1.18;
  const gst = payment.amount_inr - base;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${invoiceNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 48px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #3b5bdb; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo-box { width: 44px; height: 44px; background: #3b5bdb; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; font-weight: 900; }
  .brand-name { font-size: 20px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: #6b7280; margin-top: 1px; }
  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 22px; font-weight: 800; color: #3b5bdb; letter-spacing: 1px; text-transform: uppercase; }
  .invoice-no { font-size: 13px; color: #374151; margin-top: 4px; font-weight: 600; }
  .invoice-date { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
  .party h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #9ca3af; margin-bottom: 10px; }
  .party p { font-size: 13px; color: #374151; line-height: 1.7; }
  .party .name { font-weight: 700; font-size: 14px; color: #1a1a2e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f0f4ff; color: #374151; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
  thead th:last-child { text-align: right; }
  tbody td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  .totals { margin-left: auto; width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280; }
  .totals-row.total { border-top: 2px solid #e5e7eb; margin-top: 6px; padding-top: 10px; font-size: 15px; font-weight: 800; color: #1a1a2e; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #d1fae5; color: #065f46; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-left { font-size: 11px; color: #9ca3af; line-height: 1.8; }
  .footer-right { font-size: 11px; color: #9ca3af; text-align: right; }
  .tax-note { margin-top: 16px; padding: 10px 14px; background: #f9fafb; border-radius: 8px; font-size: 11px; color: #6b7280; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo-box">S</div>
      <div>
        <div class="brand-name">SCM Insights</div>
        <div class="brand-sub">Aashita Technosoft Pvt. Ltd.</div>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">Invoice</div>
      <div class="invoice-no">${invoiceNo}</div>
      <div class="invoice-date">Date: ${dateStr}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p class="name">Aashita Technosoft Pvt. Ltd.</p>
      <p>SCM Insights Platform</p>
      <p>Email: billing@aashita.ai</p>
      <p>Website: scminsights.ai</p>
    </div>
    <div class="party">
      <h3>Billed To</h3>
      <p class="name">${user.name || "Valued Customer"}</p>
      ${user.company ? `<p>${user.company}</p>` : ""}
      <p>Email: ${user.email}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>HSN/SAC</th>
        <th>Period</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>
          <strong>${planLabel}</strong><br/>
          <span style="font-size:12px;color:#6b7280;">Trade Intelligence Platform Subscription</span>
        </td>
        <td style="font-family:monospace;">998314</td>
        <td>Annual</td>
        <td>₹${base.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal (excl. GST)</span><span>₹${base.toFixed(2)}</span></div>
    <div class="totals-row"><span>IGST @ 18%</span><span>₹${gst.toFixed(2)}</span></div>
    <div class="totals-row total"><span>Total</span><span>₹${payment.amount_inr.toFixed(2)}</span></div>
  </div>

  <div class="tax-note">
    <strong>Note:</strong> This is a computer-generated invoice. GST (IGST @ 18%) is applicable on digital services.
    SAC Code: 998314 — Data processing and management services.
    Payment processed securely via Razorpay.
    Order ID: <span style="font-family:monospace;">${payment.order_id}</span>
    &nbsp;&nbsp;Status: <span class="status-badge">${payment.status}</span>
  </div>

  <div class="footer">
    <div class="footer-left">
      <strong>Aashita Technosoft Pvt. Ltd.</strong><br/>
      This invoice is valid without signature as per applicable law.<br/>
      For billing queries: billing@aashita.ai
    </div>
    <div class="footer-right">
      Generated on ${new Date().toLocaleDateString("en-IN")}<br/>
      Thank you for your business!
    </div>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
}

function openInvoicePrint(payment: Payment, user: { name: string; email: string; company: string }) {
  const html = generateInvoiceHTML(payment, user);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─── Plan label helper ────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  BUNDLE: "bg-indigo-50 text-indigo-700",
  TRADE: "bg-purple-50 text-purple-700",
  DIRECTORY: "bg-blue-50 text-blue-700",
  TRIAL: "bg-amber-50 text-amber-700",
};

function PlanBadge({ plan }: { plan: string }) {
  const cls = PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    captured: "bg-emerald-50 text-emerald-700",
    created: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-700",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status?.toLowerCase() === "captured" ? "bg-emerald-500" : status?.toLowerCase() === "failed" ? "bg-red-500" : "bg-amber-400"}`} />
      {status}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "profile" | "orders";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "profile", label: "Profile & Security", icon: UserIcon },
  { id: "orders", label: "Orders & Billing", icon: CreditCardIcon },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, sessionChecked, sessionToken } = useUser({ redirectTo: "/login" });

  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile edit
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", companyName: "", phoneNumber: "" });

  // Payment history
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  // Data export
  const [isExporting, setIsExporting] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Deletion cooling-off state
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);
  const [cancelDeletionError, setCancelDeletionError] = useState("");

  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();

  // Fetch deletion status on mount
  useEffect(() => {
    if (!sessionToken || !backendUrl) return;
    fetch(`${backendUrl}/api/user/deletion-status`, {
      headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" },
    })
      .then((r) => r.json())
      .then((data) => setDeletionScheduledAt(data.deletion_scheduled_at ?? null))
      .catch(() => {});
  }, [sessionToken, backendUrl]);

  // Fetch payment history when Orders tab is opened
  useEffect(() => {
    if (activeTab !== "orders" || !sessionToken || !backendUrl || payments.length > 0) return;
    setPaymentsLoading(true);
    setPaymentsError("");
    fetch(`${backendUrl}/api/user/payment-history`, {
      headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" },
    })
      .then((r) => r.json())
      .then((data) => setPayments(data.payments ?? []))
      .catch(() => setPaymentsError("Failed to load payment history."))
      .finally(() => setPaymentsLoading(false));
  }, [activeTab, sessionToken, backendUrl, payments.length]);

  if (isLoading || !sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <HugeiconsIcon icon={Loading03Icon} size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  const userName = user?.name || user?.user_details?.Name || "User";
  const userEmail = user?.user_id || "";
  const companyName = user?.user_details?.CompanyName || "";
  const phoneNumber = user?.user_details?.PhoneNumber || "";
  const sessionExpiry = user?.session_expiration_time
    ? new Date(user.session_expiration_time).toLocaleString()
    : "N/A";

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.charAt(0).toUpperCase();
  };

  const handleEditOpen = () => {
    setEditForm({ name: userName === "User" ? "" : userName, companyName, phoneNumber });
    setSaveError(""); setSaveSuccess(false); setIsEditing(true);
  };

  const handleSave = async () => {
    if (!sessionToken) return;
    setIsSaving(true); setSaveError("");
    try {
      await axios.put(
        `${backendUrl}/api/profile`,
        { name: editForm.name.trim(), companyName: editForm.companyName.trim(), phoneNumber: editForm.phoneNumber.trim() },
        { headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" } },
      );
      setSaveSuccess(true); setIsEditing(false);
      setTimeout(() => { setSaveSuccess(false); router.refresh(); }, 1500);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataExport = async (format: "json" | "csv") => {
    if (!sessionToken) return;
    setIsExporting(true);
    try {
      const res = await fetch(`${backendUrl}/api/user/data-export?format=${format}`, {
        headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "csv" ? "my_data_export.csv" : "my_data_export.json";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert("Failed to export data. Please try again."); }
    finally { setIsExporting(false); }
  };

  const handleDeleteAccount = async () => {
    if (!sessionToken || deleteConfirmText !== "DELETE") return;
    setIsDeleting(true); setDeleteError("");
    try {
      const res = await axios.post(
        `${backendUrl}/api/user/delete-account`,
        { password: deletePassword },
        { headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" } },
      );
      setDeletionScheduledAt(res.data?.deletion_scheduled_at ?? null);
      setShowDeleteModal(false);
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || "Failed to schedule account deletion. Please try again.");
    } finally { setIsDeleting(false); }
  };

  const handleCancelDeletion = async () => {
    if (!sessionToken) return;
    setIsCancellingDeletion(true); setCancelDeletionError("");
    try {
      await axios.post(
        `${backendUrl}/api/user/cancel-deletion`,
        {},
        { headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" } },
      );
      setDeletionScheduledAt(null);
    } catch (err: any) {
      setCancelDeletionError(err.response?.data?.error || "Failed to cancel. Please try again.");
    } finally { setIsCancellingDeletion(false); }
  };

  const daysUntilDeletion = deletionScheduledAt
    ? Math.max(0, Math.ceil((new Date(deletionScheduledAt).getTime() - Date.now()) / 86_400_000))
    : null;

  const userForInvoice = { name: userName, email: userEmail, company: companyName };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Profile header card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8">
              <div className="flex items-center gap-5 flex-wrap">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold border-4 border-white/30 shrink-0">
                  {getInitials(userName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white capitalize truncate">{userName}</h1>
                  <p className="text-blue-100 text-sm">{userEmail}</p>
                  {companyName && <p className="text-blue-200 text-xs mt-0.5">{companyName}</p>}
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-colors relative ${
                    activeTab === tab.id
                      ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <HugeiconsIcon icon={tab.icon} size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── PROFILE TAB ───────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-5">

                {/* Deletion Pending Banner */}
                {deletionScheduledAt && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                    <HugeiconsIcon icon={Clock01Icon} size={18} className="text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-800">Account deletion scheduled</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Your account will be permanently deleted in <strong>{daysUntilDeletion} day{daysUntilDeletion !== 1 ? "s" : ""}</strong> (on {new Date(deletionScheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}). Cancel to keep your account.
                      </p>
                      {cancelDeletionError && <p className="text-xs text-red-700 mt-1">{cancelDeletionError}</p>}
                    </div>
                    <button
                      onClick={handleCancelDeletion}
                      disabled={isCancellingDeletion}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isCancellingDeletion ? "Cancelling…" : "Cancel Deletion"}
                    </button>
                  </div>
                )}

                {/* Success Banner */}
                {saveSuccess && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-emerald-500" />
                    Profile updated successfully!
                  </div>
                )}

                {/* Account Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">Account Information</h2>
                    {!isEditing && (
                      <button onClick={handleEditOpen} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                        <HugeiconsIcon icon={PencilEdit01Icon} size={13} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="p-6">
                    {isEditing ? (
                      <div className="space-y-4 max-w-md">
                        {[
                          { label: "Full Name", key: "name" as const, type: "text", placeholder: "Your full name" },
                          { label: "Company Name", key: "companyName" as const, type: "text", placeholder: "Your company" },
                          { label: "Phone Number", key: "phoneNumber" as const, type: "tel", placeholder: "+91 98765 43210" },
                        ].map((f) => (
                          <div key={f.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                            <input
                              type={f.type}
                              value={editForm[f.key]}
                              onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="w-full h-10 px-3.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                          </div>
                        ))}
                        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                        <div className="flex gap-2.5 pt-1">
                          <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {isSaving ? <HugeiconsIcon icon={Loading03Icon} size={15} className="animate-spin" /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />}
                            {isSaving ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => setIsEditing(false)} disabled={isSaving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                            <HugeiconsIcon icon={Cancel01Icon} size={15} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-5">
                        {[
                          { icon: UserIcon, color: "bg-blue-100 text-blue-600", label: "Full Name", value: userName, capitalize: true },
                          { icon: Mail01Icon, color: "bg-emerald-100 text-emerald-600", label: "Email Address", value: userEmail },
                          { icon: Building02Icon, color: "bg-amber-100 text-amber-600", label: "Company Name", value: companyName || "Not specified", capitalize: true },
                          { icon: CallIcon, color: "bg-indigo-100 text-indigo-600", label: "Phone Number", value: phoneNumber || "Not specified" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                              <HugeiconsIcon icon={item.icon} size={17} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                              <p className={`text-gray-900 font-medium text-sm ${item.capitalize ? "capitalize" : ""}`}>{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Info */}
                {!isEditing && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h2 className="text-base font-semibold text-gray-900">Session</h2>
                    </div>
                    <div className="p-6 grid sm:grid-cols-2 gap-5">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <HugeiconsIcon icon={Calendar01Icon} size={17} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Session Expires</p>
                          <p className="text-gray-900 font-medium text-sm">{sessionExpiry}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <HugeiconsIcon icon={SecurityCheckIcon} size={17} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Account Status</p>
                          <p className="text-emerald-600 font-medium text-sm">Active</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Rights Card */}
                {!isEditing && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h2 className="text-base font-semibold text-gray-900">Your Data Rights</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Under the DPDP Act, 2023 — right to access, correct and erase your personal data.</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <HugeiconsIcon icon={Download01Icon} size={17} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Download My Data</p>
                            <p className="text-xs text-gray-500">Export all personal data we hold (DPDP §11 — Right to Access).</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDataExport("json")} disabled={isExporting} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {isExporting ? "Exporting…" : "JSON"}
                          </button>
                          <button onClick={() => handleDataExport("csv")} disabled={isExporting} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">CSV</button>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-4 flex-wrap pt-3 border-t border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <HugeiconsIcon icon={Delete01Icon} size={17} className="text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Delete My Account</p>
                            <p className="text-xs text-gray-500">Request account deletion with a 30-day cancellation window. Payment records are retained for 7 years as required by GST law.</p>
                          </div>
                        </div>
                        {deletionScheduledAt ? (
                          <span className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-100 text-red-400 bg-red-50 cursor-not-allowed">
                            Deletion Pending
                          </span>
                        ) : (
                          <button onClick={() => { setShowDeleteModal(true); setDeleteError(""); setDeletePassword(""); setDeleteConfirmText(""); }} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                            Delete Account
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 pt-1">Data Protection Officer: privacy@aashita.ai · Response within 48 business hours.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── ORDERS TAB ──────────────────────────────────────────────────── */}
            {activeTab === "orders" && (
              <motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Invoice01Icon} size={17} className="text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Orders & Billing</h2>
                      <p className="text-xs text-gray-500">Your subscription history. Download invoices as PDF.</p>
                    </div>
                  </div>

                  {paymentsLoading ? (
                    <div className="flex justify-center py-16">
                      <HugeiconsIcon icon={Loading03Icon} size={28} className="text-indigo-600 animate-spin" />
                    </div>
                  ) : paymentsError ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-red-600 mb-3">{paymentsError}</p>
                      <button onClick={() => { setPayments([]); setActiveTab("profile"); setTimeout(() => setActiveTab("orders"), 100); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">Retry</button>
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <HugeiconsIcon icon={CreditCardIcon} size={26} className="text-gray-400" />
                      </div>
                      <p className="text-gray-700 font-semibold mb-1">No orders yet</p>
                      <p className="text-sm text-gray-500">Your billing history will appear here after your first purchase.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3 text-left font-semibold">Date</th>
                              <th className="px-5 py-3 text-left font-semibold">Plan</th>
                              <th className="px-5 py-3 text-left font-semibold">Order ID</th>
                              <th className="px-5 py-3 text-right font-semibold">Amount</th>
                              <th className="px-5 py-3 text-left font-semibold">Status</th>
                              <th className="px-5 py-3 text-center font-semibold">Invoice</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {payments.map((p, i) => (
                              <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                                  {p.date ? new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                </td>
                                <td className="px-5 py-3.5"><PlanBadge plan={p.plan} /></td>
                                <td className="px-5 py-3.5 font-mono text-xs text-gray-500 truncate max-w-[160px]" title={p.order_id}>{p.order_id || "—"}</td>
                                <td className="px-5 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                                  ₹{Number(p.amount_inr).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                                <td className="px-5 py-3.5 text-center">
                                  {p.status?.toLowerCase() === "captured" ? (
                                    <button
                                      onClick={() => openInvoicePrint(p, userForInvoice)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                    >
                                      <HugeiconsIcon icon={Invoice01Icon} size={13} /> PDF
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden divide-y divide-gray-100">
                        {payments.map((p, i) => (
                          <div key={i} className="px-5 py-4 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <PlanBadge plan={p.plan} />
                              <StatusBadge status={p.status} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-500">{p.date ? new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                                <p className="font-semibold text-gray-900 text-base tabular-nums">₹{Number(p.amount_inr).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                              </div>
                              {p.status?.toLowerCase() === "captured" && (
                                <button onClick={() => openInvoicePrint(p, userForInvoice)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                  <HugeiconsIcon icon={Invoice01Icon} size={13} /> Download PDF
                                </button>
                              )}
                            </div>
                            {p.order_id && <p className="font-mono text-xs text-gray-400 truncate">{p.order_id}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Summary row */}
                  {payments.length > 0 && (
                    <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs text-gray-500">{payments.filter(p => p.status === "captured").length} successful payment{payments.filter(p => p.status === "captured").length !== 1 ? "s" : ""}</span>
                      <span className="text-sm font-bold text-gray-900">
                        Total paid: ₹{payments.filter(p => p.status === "captured").reduce((s, p) => s + Number(p.amount_inr), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Delete Account Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Delete Account</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">Your account will be <strong>scheduled for deletion in 30 days</strong>. You can cancel within that period. After 30 days, your account and personal data will be permanently deleted. Payment records will be anonymized (kept 7 years per GST law).</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm your password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <HugeiconsIcon icon={LockPasswordIcon} size={16} className="text-gray-400" />
                    </div>
                    <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Enter your password" className="w-full h-11 pl-10 pr-4 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm</label>
                  <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())} placeholder="DELETE" className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono" />
                </div>
                {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={handleDeleteAccount} disabled={isDeleting || !deletePassword || deleteConfirmText !== "DELETE"} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isDeleting ? "Scheduling…" : "Schedule Deletion"}
                  </button>
                  <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
