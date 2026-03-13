"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Ticket01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import axios from "axios";
import { useUser } from "@/hooks/useUser";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      on: (event: string, handler: (response: Record<string, string>) => void) => void;
      open: () => void;
    };
  }
}

const VALID_PLANS = ["DIRECTORY", "TRADE", "BUNDLE"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") || "").trim().toUpperCase();
  const licenseType = VALID_PLANS.includes(planParam) ? planParam : null;

  const { sessionToken, isLoading: userLoading } = useUser({ redirectTo: "/login" });

  // UI state
  const [step, setStep] = useState<"idle" | "creating" | "ready" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Razorpay state
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [razorpayError, setRazorpayError] = useState(false);
  const [orderPayload, setOrderPayload] = useState<{
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    amount_rupees: number;
    transaction_id?: string;
  } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // ── Redirect if no valid plan ─────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && sessionToken && !licenseType) {
      router.replace("/plans");
    }
  }, [userLoading, sessionToken, licenseType, router]);

  // ── Create Razorpay order ─────────────────────────────────────────────────
  const createRazorpayOrder = useCallback(() => {
    if (!sessionToken || !backendUrl || !licenseType) return;
    setStep("creating");
    setError(null);
    axios
      .post(
        `${backendUrl}/api/payment/create-order`,
        { license_type: licenseType },
        { headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" } }
      )
      .then((res) => { setOrderPayload(res.data); setStep("ready"); })
      .catch((err) => { setError(err.response?.data?.error || "Failed to create order"); setStep("error"); });
  }, [sessionToken, backendUrl, licenseType]);

  useEffect(() => {
    if (step === "idle" && sessionToken && licenseType && !orderPayload && !userLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      createRazorpayOrder();
    }
  }, [step, sessionToken, licenseType, orderPayload, userLoading, createRazorpayOrder]);

  // ── Open Razorpay checkout ────────────────────────────────────────────────
  const openRazorpay = useCallback(() => {
    if (!orderPayload?.order_id || !orderPayload?.key_id || !window.Razorpay) {
      setError("Payment not ready. Please refresh.");
      return;
    }
    setStep("processing");
    setError(null);
    const options = {
      key: orderPayload.key_id,
      amount: orderPayload.amount,
      currency: orderPayload.currency,
      order_id: orderPayload.order_id,
      name: "SCM Insights",
      description: `Plan: ${licenseType}`,
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        axios
          .post(
            `${backendUrl}/api/payment/verify`,
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              license_type: licenseType,
            },
            { headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" } }
          )
          .then(() => {
            setStep("done");
            setTimeout(() => router.push("/plan?payment=success"), 1200);
          })
          .catch((err) => {
            setError(err.response?.data?.error || "Verification failed");
            setStep("error");
          });
      },
      prefill: {},
      theme: { color: "#2563eb" },
    };
    const rzp = new window.Razorpay!(options);
    rzp.on("payment.failed", () => {
      setError("Payment failed or was cancelled.");
      setStep("error");
    });
    rzp.open();
  }, [orderPayload, licenseType, backendUrl, sessionToken, router]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (userLoading || (!licenseType)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Main checkout UI ──────────────────────────────────────────────────────
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => { setRazorpayReady(true); setRazorpayError(false); }}
        onError={() => { setRazorpayReady(false); setRazorpayError(true); }}
      />

      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-lg mx-auto px-4">
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm mb-6"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
            Back to Plans
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <HugeiconsIcon icon={Ticket01Icon} size={24} className="text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
                  <p className="text-sm text-gray-500">Plan: {licenseType}</p>
                </div>
              </div>

              {/* GST breakdown */}
              {orderPayload && (() => {
                const total = orderPayload.amount_rupees;
                const base = Math.round(total / 1.18);
                const gst  = total - base;
                return (
                  <div className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Base price</span>
                      <span>₹{base.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>IGST @18% (SAC 998314)</span>
                      <span>₹{gst.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1">
                      <span>Total (INR)</span>
                      <span>₹{total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Body */}
            <div className="p-6">

              {/* Creating / starting up */}
              {(step === "creating" || step === "idle") && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
                  <p className="text-gray-500 text-sm">Preparing payment…</p>
                </div>
              )}

              {/* Ready to pay */}
              {step === "ready" && orderPayload && (
                <div className="space-y-4">
                  {razorpayError ? (
                    <p className="text-sm text-red-600 text-center py-2">
                      Failed to load Razorpay. Please disable any ad-blockers and reload.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={openRazorpay}
                      disabled={!razorpayReady}
                      className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {razorpayReady
                        ? `Pay ₹${orderPayload.amount_rupees.toLocaleString("en-IN")} – Continue to Razorpay`
                        : "Loading payment gateway…"}
                    </button>
                  )}
                  <p className="text-center text-xs text-gray-400">UPI · Net Banking · Cards · Wallets · EMI</p>
                  <Link href="/plans" className="block text-center text-sm text-gray-500 hover:text-gray-700">
                    Cancel — back to plans
                  </Link>
                </div>
              )}

              {/* In-flight */}
              {step === "processing" && (
                <p className="text-center text-gray-500 text-sm py-6">
                  Complete payment in the Razorpay window.
                </p>
              )}

              {/* Done */}
              {step === "done" && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-2xl font-bold">✓</span>
                  </div>
                  <p className="text-green-700 font-semibold">Payment successful!</p>
                  <p className="text-sm text-gray-400">Redirecting to your plan…</p>
                </div>
              )}

              {/* Error */}
              {step === "error" && (
                <div className="space-y-4">
                  <p className="text-red-600 text-sm">{error}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("idle");
                        setOrderPayload(null);
                        setError(null);
                        createRazorpayOrder();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                      Try again
                    </button>
                    <Link
                      href="/plans"
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Back to Plans
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Secure payment powered by Razorpay. Amount in INR.
          </p>
        </div>
      </div>
    </>
  );
}
