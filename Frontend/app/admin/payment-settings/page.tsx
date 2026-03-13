"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { Toast, useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GatewayConfig {
  gatewayId: string;
  isActive: boolean;
  keyId: string;
  keySecretMasked: string | null;
  webhookSecretMasked: string | null;
  extraConfig: Record<string, string>;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface FormState {
  isActive: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  extraConfig: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(cfg?: GatewayConfig): FormState {
  return {
    isActive: cfg?.isActive ?? false,
    keyId: cfg?.keyId ?? "",
    keySecret: cfg?.keySecretMasked ?? "",
    webhookSecret: cfg?.webhookSecretMasked ?? "",
    extraConfig: cfg?.extraConfig ?? {},
  };
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

// ─── Sub-component: Field ─────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Sub-component: GatewayCard ───────────────────────────────────────────────

function GatewayCard({
  gatewayId,
  cfg,
  title,
  description,
  currency,
  sessionToken,
  backendUrl,
  onSaved,
}: {
  gatewayId: "razorpay";
  cfg: GatewayConfig | undefined;
  title: string;
  description: string;
  currency: string;
  sessionToken: string | null;
  backendUrl: string;
  onSaved: (msg: string, type: "success" | "error") => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm(cfg));
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  useEffect(() => {
    setForm(emptyForm(cfg));
  }, [cfg]);

  const set = (key: keyof Omit<FormState, "extraConfig">, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/payment-gateway-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Session-Token": sessionToken ?? "",
          "X-Client": "scm-insights",
        },
        body: JSON.stringify({
          gatewayId,
          isActive: form.isActive,
          keyId: form.keyId,
          keySecret: form.keySecret,
          webhookSecret: form.webhookSecret,
          extraConfig: form.extraConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(data.message || "Saved successfully", "success");
    } catch (e: unknown) {
      onSaved(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              {currency}
            </span>
            {form.isActive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">Active</span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        {/* Enable toggle */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => set("isActive", !form.isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              form.isActive ? "bg-green-500" : "bg-gray-300"
            }`}
            aria-label={`Toggle ${title}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-[10px] text-gray-400">{form.isActive ? "On" : "Off"}</span>
        </div>
      </div>

      {/* Fields */}
      <div className="px-6 py-5 space-y-4">
        <Field
          label="Key ID"
          hint={
            gatewayId === "razorpay"
              ? "Starts with rzp_test_ (sandbox) or rzp_live_ (production)"
              : "Starts with pk_sbox_ (sandbox) or pk_ (production)"
          }
        >
          <input
            type="text"
            value={form.keyId}
            onChange={(e) => set("keyId", e.target.value)}
            placeholder={gatewayId === "razorpay" ? "rzp_test_..." : "pk_sbox_..."}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="Secret Key" hint="Leave unchanged (shows ****xxxx) to keep existing stored value.">
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={form.keySecret}
              onChange={(e) => set("keySecret", e.target.value)}
              placeholder={gatewayId === "razorpay" ? "Enter secret key…" : "sk_sbox_..."}
              className="w-full px-3 py-2 pr-16 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              {showSecret ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <Field label="Webhook Secret" hint="Leave unchanged to keep existing value. Strongly recommended in production.">
          <div className="relative">
            <input
              type={showWebhook ? "text" : "password"}
              value={form.webhookSecret}
              onChange={(e) => set("webhookSecret", e.target.value)}
              placeholder="Enter webhook secret…"
              className="w-full px-3 py-2 pr-16 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowWebhook((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              {showWebhook ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        {/* Last updated */}
        {cfg?.updatedAt && (
          <p className="text-xs text-gray-400">
            Last updated: {fmtDate(cfg.updatedAt)}
            {cfg.updatedBy ? ` by ${cfg.updatedBy}` : ""}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Webhook endpoint hint */}
      <div className="px-6 py-3 border-t border-gray-50 bg-gray-50">
        <p className="text-xs text-gray-500">
          Webhook URL:{" "}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
            /api/payment/webhook
          </code>
        </p>
      </div>
    </div>
  );
}

// ─── Mode detection helpers ────────────────────────────────────────────────────

function detectMode(cfg: GatewayConfig | undefined): "test" | "live" | "unknown" {
  if (!cfg?.keyId) return "unknown";
  const k = cfg.keyId.trim();
  if (k.startsWith("rzp_test_") || k.startsWith("pk_sbox_")) return "test";
  if (k.startsWith("rzp_live_") || (k.startsWith("pk_") && !k.startsWith("pk_sbox_"))) return "live";
  return "unknown";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentSettingsPage() {
  const { sessionToken } = useUser({ redirectTo: "/login" });
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();

  const [configs, setConfigs] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useToast();

  // Clear test transactions state
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    if (!sessionToken || !backendUrl) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${backendUrl}/api/admin/payment-gateway-config`, {
        headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GatewayConfig[] = await res.json();
      setConfigs(data);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "Failed to load configs");
    } finally {
      setLoading(false);
    }
  }, [sessionToken, backendUrl]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const razorpayCfg = configs.find((c) => c.gatewayId === "razorpay");

  const rzpMode = detectMode(razorpayCfg);
  const anyTestMode = rzpMode === "test";

  const handleSaved = (msg: string, type: "success" | "error") => {
    showToast(msg, type);
    if (type === "success") fetchConfigs();
  };

  const handleClearTest = async () => {
    setIsClearing(true);
    setClearResult(null);
    try {
      const res = await fetch(`${backendUrl}/api/admin/transactions/clear-test`, {
        method: "DELETE",
        headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setClearResult(data.message);
      showToast(data.message, "success");
      setShowClearModal(false);
    } catch (e: unknown) {
      setClearResult(e instanceof Error ? e.message : "Failed to clear test transactions");
    } finally {
      setIsClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600 text-sm mb-4">{fetchError}</p>
        <button onClick={fetchConfigs} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage Razorpay (INR) payment gateway keys.
          </p>
        </div>
        {/* Clear test transactions button */}
        <button
          onClick={() => { setClearResult(null); setShowClearModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          Clear Test Transactions
        </button>
      </div>

      {/* Test mode banner */}
      {anyTestMode && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-amber-800">Test / Sandbox Mode Active</span>
            <span className="text-xs text-amber-700 ml-2">
              Razorpay (rzp_test_...) — no real money will be charged.
            </span>
          </div>
          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold tracking-wide">TEST</span>
        </div>
      )}

      {/* Live mode confirmation */}
      {rzpMode === "live" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold text-emerald-800">Live Mode — real payments enabled.</span>
          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold tracking-wide">LIVE</span>
        </div>
      )}

      <div className="max-w-xl">
        <GatewayCard
          gatewayId="razorpay"
          cfg={razorpayCfg}
          title="Razorpay"
          description="Indian customers — UPI, Net Banking, Cards, Wallets, EMI"
          currency="₹ INR"
          sessionToken={sessionToken}
          backendUrl={backendUrl}
          onSaved={handleSaved}
        />
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">Quick guide</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Test mode is auto-detected from the Key ID prefix (<code className="bg-blue-100 px-1 rounded">rzp_test_</code>).</li>
          <li>Secret keys are never shown in full — leaving the masked value (****xxxx) unchanged keeps the stored key.</li>
          <li>Razorpay webhook URL: <code className="bg-blue-100 px-1 rounded">/api/payment/webhook</code></li>
        </ul>
      </div>

      {/* Clear Test Transactions Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Clear Test Transactions</h2>
              <p className="text-sm text-gray-500 mt-1">
                This will permanently delete <strong>all transactions</strong> flagged as test/sandbox mode (<code className="bg-gray-100 px-1 rounded text-xs">IsTestMode = true</code>). Live transactions will not be affected.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {clearResult && <p className="text-sm text-red-600">{clearResult}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleClearTest}
                  disabled={isClearing}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isClearing ? "Clearing…" : "Yes, Clear Test Records"}
                </button>
                <button
                  onClick={() => setShowClearModal(false)}
                  disabled={isClearing}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  );
}
