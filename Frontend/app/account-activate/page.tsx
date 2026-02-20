"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
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

function Toast({
  title,
  description,
  status,
  onClose,
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
    >
      <div className="flex gap-3">
        <HugeiconsIcon icon={icons[status]} size={20} className={iconColors[status]} />
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-sm opacity-80 mt-0.5">{description}</p>
        </div>
        <button onClick={onClose} className="opacity-60 hover:opacity-100">
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function AccountActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">("loading");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{
    title: string;
    description: string;
    status: "success" | "error" | "warning" | "info";
  } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!token.trim()) {
      setStatus("missing");
      return;
    }

    const activate = async () => {
      try {
        const res = await axios.post(
          `${backendUrl}/api/auth/account-activate?token=${encodeURIComponent(token)}`
        );
        setMessage(res.data?.message || "Account activated successfully.");
        setStatus("success");
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { error?: string }; status?: number } };
        const errorMsg =
          ax.response?.data?.error || "This link may have expired. Please request a new one.";
        setMessage(errorMsg);
        setStatus("error");
        setToast({
          title: "Activation Failed",
          description: errorMsg,
          status: "error",
        });
      }
    };

    activate();
  }, [token, backendUrl]);

  const handleGoToLogin = () => router.push("/login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
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
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm mb-6"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            Back to Login
          </Link>

          {status === "loading" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={Loading03Icon} size={32} className="text-blue-600 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Activating your account</h1>
              <p className="text-gray-500 text-sm">Please wait a moment...</p>
            </div>
          )}

          {status === "missing" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={AlertCircleIcon} size={32} className="text-amber-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid link</h1>
              <p className="text-gray-500 text-sm mb-6">
                This activation link is invalid or missing a token. Please use the link from your
                email or request a new one from the signup page.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Go to Login
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </Link>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Account activated</h1>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <button
                onClick={handleGoToLogin}
                className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Sign In
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={Cancel01Icon} size={32} className="text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Activation failed</h1>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  Go to Login
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </Link>
                <Link
                  href="/signup"
                  className="w-full h-12 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all"
                >
                  Sign up again
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/" className="font-semibold text-blue-600 hover:text-blue-700">
            Back to Home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function AccountActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AccountActivateContent />
    </Suspense>
  );
}
