"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";
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

// Message type sent from popup → parent window
const MSG_SUCCESS = "CKO_SUCCESS";
const MSG_FAILED  = "CKO_FAILED";

type GatewayChoice = "razorpay" | "checkout" | null;

// ─── Popup close page ────────────────────────────────────────────────────────
// Rendered ONLY when this page is loaded inside the Checkout.com return popup.
// Posts a message to the opener then closes itself.

function PopupCloser({ result, txnId }: { result: "success" | "failed"; txnId: string | null }) {
  useEffect(() => {
    const type = result === "success" ? MSG_SUCCESS : MSG_FAILED;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type, txn: txnId }, window.location.origin);
      }
    } catch {
      // Cross-origin guard — should not happen since same origin
    }
    // Give the parent a moment to receive the message, then close
    const t = setTimeout(() => {
      window.close();
    }, 300);
    return () => clearTimeout(t);
  }, [result, txnId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-xs w-full text-center space-y-4">
        {result === "success" ? (
          <>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <span className="text-green-600 text-2xl font-bold">✓</span>
            </div>
            <p className="text-gray-800 font-semibold">Payment successful!</p>
            <p className="text-sm text-gray-500">Closing this window…</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <span className="text-red-600 text-2xl font-bold">✕</span>
            </div>
            <p className="text-gray-800 font-semibold">Payment declined</p>
            <p className="text-sm text-gray-500">Closing this window…</p>
          </>
        )}
        <button
          type="button"
          onClick={() => window.close()}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Close manually
        </button>
      </div>
    </div>
  );
}

// ─── Gateway Picker Modal ─────────────────────────────────────────────────────

function GatewayPickerModal({
  plan,
  onChoose,
  onCancel,
}: {
  plan: string;
  onChoose: (gw: "razorpay" | "checkout") => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Choose Payment Currency</h2>
          <p className="text-sm text-gray-500 mt-0.5">Plan: {plan}</p>
        </div>
        <div className="p-6 space-y-3">
          <button
            type="button"
            onClick={() => onChoose("razorpay")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
          >
            <span className="text-2xl">₹</span>
            <div>
              <p className="font-semibold text-gray-900">Pay in INR</p>
              <p className="text-xs text-gray-500">Razorpay — UPI, Cards, Net Banking</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onChoose("checkout")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left"
          >
            <span className="text-2xl">$</span>
            <div>
              <p className="font-semibold text-gray-900">Pay in USD</p>
              <p className="text-xs text-gray-500">Checkout.com — Visa, Mastercard, AMEX</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") || "").trim().toUpperCase();
  const licenseType = VALID_PLANS.includes(planParam) ? planParam : null;

  // Checkout.com return params: /checkout?payment=success&txn=<id>
  const paymentResult = searchParams.get("payment") as "success" | "failed" | null;
  const txnId = searchParams.get("txn");

  // ── Popup detection: is this page loaded inside the Checkout.com return popup?
  // If yes, render PopupCloser which posts message to parent then self-closes.
  const isInPopup =
    typeof window !== "undefined" &&
    window.opener != null &&
    !window.opener.closed &&
    paymentResult != null;

  const { sessionToken, isLoading: userLoading } = useUser({ redirectTo: "/login" });

  // Gateway availability
  const [activeGateways, setActiveGateways] = useState<{ razorpay: boolean; checkout: boolean } | null>(null);
  const [gatewaysLoading, setGatewaysLoading] = useState(true);

  // UI state
  const [showPicker, setShowPicker] = useState(false);
  const [chosenGateway, setChosenGateway] = useState<GatewayChoice>(null);
  const [step, setStep] = useState<"idle" | "creating" | "ready" | "processing" | "polling" | "done" | "error">("idle");
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

  // Checkout.com state
  const [checkoutTxnId, setCheckoutTxnId] = useState<string | null>(null);
  const [checkoutAmountUsd, setCheckoutAmountUsd] = useState<number | null>(null);
  const pollIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupWatchRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupRef        = useRef<Window | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // ── Cleanup helpers ───────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current)  { clearInterval(pollIntervalRef.current);  pollIntervalRef.current  = null; }
    if (popupWatchRef.current)    { clearInterval(popupWatchRef.current);    popupWatchRef.current    = null; }
  }, []);

  const closePopup = useCallback(() => {
    try { popupRef.current?.close(); } catch { /* ignore */ }
    popupRef.current = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Same-tab fallback: /checkout?payment=success (no opener) ─────────────
  // Used when browser blocks the popup — Checkout.com redirected the main tab.
  useEffect(() => {
    if (isInPopup) return; // handled by PopupCloser below
    if (paymentResult === "success" && txnId) {
      setCheckoutTxnId(txnId);
      setStep("polling");
    } else if (paymentResult === "failed") {
      setError("Payment was declined or cancelled.");
      setStep("error");
    }
  }, [paymentResult, txnId, isInPopup]);

  // ── Listen for postMessage from the popup ─────────────────────────────────
  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
      if (evt.origin !== window.location.origin) return;
      const { type, txn } = evt.data || {};
      if (type === MSG_SUCCESS) {
        stopPolling();
        closePopup();
        setStep("done");
        setTimeout(() => router.push("/plan?payment=success"), 1200);
      } else if (type === MSG_FAILED) {
        stopPolling();
        closePopup();
        setError("Payment was declined or cancelled.");
        setStep("error");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router, stopPolling, closePopup]);

  // ── Fetch active gateways ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionToken || !backendUrl) return;
    axios
      .get(`${backendUrl}/api/payment/active-gateways`, {
        headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" },
      })
      .then((res) => setActiveGateways(res.data))
      .catch(() => setActiveGateways({ razorpay: true, checkout: false }))
      .finally(() => setGatewaysLoading(false));
  }, [sessionToken, backendUrl]);

  // ── Redirect if no valid plan ─────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && sessionToken && !licenseType && !paymentResult) {
      router.replace("/plans");
    }
  }, [userLoading, sessionToken, licenseType, paymentResult, router]);

  // ── Auto-select gateway if only one is active ─────────────────────────────
  useEffect(() => {
    if (!activeGateways || gatewaysLoading || chosenGateway || !licenseType) return;
    const { razorpay, checkout } = activeGateways;
    if (razorpay && checkout) {
      setShowPicker(true);
    } else if (razorpay) {
      setChosenGateway("razorpay");
    } else if (checkout) {
      setChosenGateway("checkout");
    } else {
      setError("No payment gateway is currently active. Please contact support.");
      setStep("error");
    }
  }, [activeGateways, gatewaysLoading, chosenGateway, licenseType]);

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
    if (chosenGateway === "razorpay" && step === "idle" && sessionToken && licenseType && !orderPayload) {
      createRazorpayOrder();
    }
  }, [chosenGateway, step, sessionToken, licenseType, orderPayload, createRazorpayOrder]);

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

  // ── Checkout.com: API status polling ─────────────────────────────────────
  const startPolling = useCallback(
    (txn: string) => {
      if (!sessionToken || !backendUrl) return;
      stopPolling();

      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await axios.get(
            `${backendUrl}/api/payment/checkout/status/${txn}`,
            { headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" } }
          );
          const status: string = (res.data.status || "").replace(/ /g, "").toLowerCase();
          if (["completed", "paymentreceived", "paid"].includes(status)) {
            stopPolling();
            closePopup();
            setStep("done");
            setTimeout(() => router.push("/plan?payment=success"), 1200);
          } else if (["failed", "cancelled", "expired"].includes(status)) {
            stopPolling();
            closePopup();
            setError("Payment was declined or cancelled.");
            setStep("error");
          }
        } catch {
          // Silent — keep polling
        }
      }, 3000);

      // Fallback: watch for popup being closed manually (user closed the Checkout.com window)
      popupWatchRef.current = setInterval(() => {
        if (popupRef.current?.closed) {
          clearInterval(popupWatchRef.current!);
          popupWatchRef.current = null;
          // Popup closed without postMessage — do one final API check
          axios
            .get(`${backendUrl}/api/payment/checkout/status/${txn}`, {
              headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" },
            })
            .then((res) => {
              const status: string = (res.data.status || "").replace(/ /g, "").toLowerCase();
              if (["completed", "paymentreceived", "paid"].includes(status)) {
                stopPolling();
                setStep("done");
                setTimeout(() => router.push("/plan?payment=success"), 1200);
              } else {
                stopPolling();
                setError("Payment was not completed. If you were charged, please contact support@scminsights.ai");
                setStep("error");
              }
            })
            .catch(() => {
              stopPolling();
              setError("Could not verify payment status. Please check your email or contact support.");
              setStep("error");
            });
        }
      }, 800);
    },
    [sessionToken, backendUrl, router, stopPolling, closePopup]
  );

  // ── Start Checkout.com session + open popup ───────────────────────────────
  const startCheckout = useCallback(() => {
    if (!sessionToken || !backendUrl || !licenseType) return;
    setStep("creating");
    setError(null);
    stopPolling();

    // Must open popup BEFORE any async call — browsers block popups in async callbacks
    const popup = window.open("about:blank", "_blank", "width=540,height=720,left=200,top=80");
    popupRef.current = popup;

    axios
      .post(
        `${backendUrl}/api/payment/checkout/create-session`,
        { license_type: licenseType, frontend_url: window.location.origin },
        { headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" } }
      )
      .then((res) => {
        const { redirect_url, transaction_id, amount_usd } = res.data;
        setCheckoutTxnId(transaction_id);
        if (amount_usd) setCheckoutAmountUsd(amount_usd);

        if (popup && !popup.closed) {
          popup.location.href = redirect_url;
          setStep("processing");
          startPolling(transaction_id);
        } else {
          // Popup was blocked — redirect same tab
          window.location.href = redirect_url;
        }
      })
      .catch((err) => {
        popup?.close();
        popupRef.current = null;
        setError(err.response?.data?.error || "Failed to start payment. Please try again.");
        setStep("error");
      });
  }, [sessionToken, backendUrl, licenseType, stopPolling, startPolling]);

  // Same-tab fallback: start polling when we land back from Checkout.com
  useEffect(() => {
    if (step === "polling" && checkoutTxnId && sessionToken && backendUrl) {
      startPolling(checkoutTxnId);
    }
  }, [step, checkoutTxnId, sessionToken, backendUrl, startPolling]);

  // Auto-start Checkout.com when gateway chosen
  useEffect(() => {
    if (chosenGateway === "checkout" && step === "idle" && sessionToken && licenseType) {
      startCheckout();
    }
  }, [chosenGateway, step, sessionToken, licenseType, startCheckout]);

  // ── If this is the return popup → render close screen ────────────────────
  if (isInPopup && paymentResult) {
    return <PopupCloser result={paymentResult} txnId={txnId} />;
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (userLoading || gatewaysLoading || (!licenseType && !paymentResult)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Same-tab polling UI (popup was blocked, Checkout.com used this tab) ───
  if (step === "polling") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-24 px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-700 font-semibold">Confirming your payment…</p>
          <p className="text-xs text-gray-400">This may take a few seconds. Please wait.</p>
        </div>
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

      <AnimatePresence>
        {showPicker && licenseType && (
          <GatewayPickerModal
            plan={licenseType}
            onChoose={(gw) => { setShowPicker(false); setChosenGateway(gw); }}
            onCancel={() => router.push("/plans")}
          />
        )}
      </AnimatePresence>

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

              {/* Razorpay — GST breakdown */}
              {orderPayload && chosenGateway === "razorpay" && (() => {
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

              {/* Checkout.com — USD amount */}
              {checkoutAmountUsd && chosenGateway === "checkout" && (
                <p className="text-lg font-semibold text-gray-800 mt-4">
                  Amount: ${checkoutAmountUsd.toFixed(2)} USD
                </p>
              )}
            </div>

            {/* Body */}
            <div className="p-6">

              {/* Creating / starting up */}
              {(step === "creating" || step === "idle") && !showPicker && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
                  <p className="text-gray-500 text-sm">
                    {chosenGateway === "checkout" ? "Opening payment window…" : "Preparing payment…"}
                  </p>
                </div>
              )}

              {/* Razorpay — ready to pay */}
              {step === "ready" && chosenGateway === "razorpay" && orderPayload && (
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

              {/* Razorpay — in-flight */}
              {step === "processing" && chosenGateway === "razorpay" && (
                <p className="text-center text-gray-500 text-sm py-6">
                  Complete payment in the Razorpay window.
                </p>
              )}

              {/* Checkout.com — popup open */}
              {step === "processing" && chosenGateway === "checkout" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent" />
                    <p className="text-gray-600 text-sm font-medium">Complete payment in the popup window.</p>
                    <p className="text-xs text-gray-400 text-center">
                      Keep this tab open — it will update automatically once payment is confirmed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCheckout}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Popup closed? Reopen payment window
                  </button>
                </div>
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
                        if (chosenGateway === "razorpay") createRazorpayOrder();
                        else if (chosenGateway === "checkout") startCheckout();
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
            {chosenGateway === "checkout"
              ? "Secure payment powered by Checkout.com. Amount in USD."
              : "Secure payment powered by Razorpay. Amount in INR."}
          </p>
        </div>
      </div>
    </>
  );
}
