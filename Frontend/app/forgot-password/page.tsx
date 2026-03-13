"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Loading03Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  InformationCircleIcon,
  LockPasswordIcon,
} from "@hugeicons/core-free-icons";
import axios from "axios";

// Toast Component
function Toast({ 
  title, 
  description, 
  status, 
  onClose 
}: { 
  title: string; 
  description: string; 
  status: "success" | "error" | "warning" | "info"; 
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: CheckmarkCircle02Icon,
    error: Cancel01Icon,
    warning: AlertCircleIcon,
    info: InformationCircleIcon,
  };

  const colors = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const iconColors = {
    success: "text-emerald-500",
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-blue-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      className={`fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-xl border shadow-lg ${colors[status]}`}
      role="alert"
      aria-live={status === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="flex gap-3">
        <HugeiconsIcon icon={icons[status]} size={20} className={iconColors[status]} aria-hidden="true" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-sm opacity-80 mt-0.5">{description}</p>
        </div>
        <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss notification">
          <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ title: string; description: string; status: "success" | "error" | "warning" | "info" } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const showToast = (title: string, description: string, status: "success" | "error" | "warning" | "info") => {
    setToast({ title, description, status });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(
        `${backendUrl}/forgot-password`,
        { email: email.toLowerCase() },
        { headers: { "X-Requested-With": "XMLHttpRequest", "X-Client": "scm-insights" } }
      );

      setIsSubmitted(true);
      showToast("Email Sent!", "Check your inbox for password reset instructions.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const errorMsg = err.response?.data?.error || err.response?.data?.message;

      if (err.response?.status === 404 || errorMsg === "USER_NOT_FOUND") {
        showToast("Email Not Found", "No account exists with this email address.", "error");
      } else {
        showToast("Something Went Wrong", errorMsg || "Please try again later.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            title={toast.title}
            description={toast.description}
            status={toast.status}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Back Link */}
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm mb-6"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            Back to Login
          </Link>

          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={LockPasswordIcon} size={32} className="text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                <p className="text-gray-500 text-sm">
                  No worries! Enter your email and we&apos;ll send you reset instructions.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <HugeiconsIcon icon={Mail01Icon} size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="name@company.com"
                      className={`block w-full h-12 pl-12 pr-4 border ${
                        error ? "border-red-300" : "border-gray-200"
                      } rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                    />
                  </div>
                  {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
              <p className="text-gray-500 text-sm mb-6">
                We&apos;ve sent a link to <strong className="text-gray-700">{email}</strong>. Click
                it to set a new password, then sign in.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Try Another Email
                </button>
                
                <Link
                  href="/login"
                  className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Back to Login
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </Link>
              </div>

              <p className="text-xs text-gray-400 mt-6">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  try again
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
