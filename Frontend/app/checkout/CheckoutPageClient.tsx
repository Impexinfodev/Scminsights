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

export default function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") || "").trim().toUpperCase();
  const licenseType = VALID_PLANS.includes(planParam) ? planParam : null;

  const { sessionToken, isLoading: userLoading } = useUser({
    redirectTo: "/login",
  });

  const [step, setStep] = useState<"idle" | "creating" | "ready" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [orderPayload, setOrderPayload] = useState<{
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    amount_rupees: number;
  } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!userLoading && sessionToken && !licenseType) {
      router.replace("/plans");
    }
  }, [userLoading, sessionToken, licenseType, router]);

  const createOrder = useCallback(() => {
    if (!sessionToken || !backendUrl || !licenseType) return;
    setStep("creating");
    setError(null);
    axios
      .post(
        `${backendUrl}/api/payment/create-order`,
        { license_type: licenseType },
        { headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" } }
      )
      .then((res) => {
        setOrderPayload(res.data);
        setStep("ready");
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Failed to create order");
        setStep("error");
      });
  }, [sessionToken, backendUrl, licenseType]);

  useEffect(() => {
    if (step === "idle" && sessionToken && licenseType && orderPayload === null) {
      createOrder();
    }
  }, [step, sessionToken, licenseType, orderPayload, createOrder]);

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
            { headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" } }
          )
          .then(() => {
            setStep("done");
            setTimeout(() => router.push("/plan?payment=success"), 1500);
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


  if (userLoading || !licenseType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => {}}
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
              {orderPayload && (
                <p className="text-lg font-semibold text-gray-800 mt-4">
                  Amount: ₹{orderPayload.amount_rupees.toLocaleString("en-IN")} (INR)
                </p>
              )}
            </div>

            <div className="p-6">
              {step === "creating" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
                  <p className="text-gray-600 text-sm">Preparing payment…</p>
                </div>
              )}
              {step === "ready" && orderPayload && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={openRazorpay}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Pay ₹{orderPayload.amount_rupees.toLocaleString("en-IN")} – Continue to Razorpay
                  </button>
                  <Link
                    href="/plans"
                    className="block text-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel and go back to plans
                  </Link>
                </div>
              )}
              {step === "processing" && (
                <p className="text-center text-gray-600 text-sm py-4">
                  Complete payment in the Razorpay window.
                </p>
              )}
              {step === "done" && (
                <div className="text-center py-4 text-green-600 font-medium">
                  Payment successful. Redirecting to your plan…
                </div>
              )}
              {step === "error" && (
                <div className="space-y-4">
                  <p className="text-red-600 text-sm">{error}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setStep("idle"); setOrderPayload(null); setError(null); createOrder(); }}
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
            Secure payment by Razorpay. Amount in INR.
          </p>
        </div>
      </div>
    </>
  );
}
