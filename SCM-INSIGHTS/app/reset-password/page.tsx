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
  LockPasswordIcon,
  ViewIcon,
  ViewOffIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  InformationCircleIcon,
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

const PASSWORD_RULES = [
  "At least 8 characters",
  "One uppercase letter",
  "One lowercase letter",
  "One number",
];

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [toast, setToast] = useState<{
    title: string;
    description: string;
    status: "success" | "error" | "warning" | "info";
  } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const showToast = (
    title: string,
    description: string,
    status: "success" | "error" | "warning" | "info"
  ) => setToast({ title, description, status });

  const validate = () => {
    const next: { password?: string; confirm?: string } = {};
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(password)) next.password = "Include at least one uppercase letter.";
    else if (!/[a-z]/.test(password)) next.password = "Include at least one lowercase letter.";
    else if (!/\d/.test(password)) next.password = "Include at least one number.";
    if (password !== confirmPassword) next.confirm = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      showToast("Invalid Link", "This reset link is invalid or missing. Request a new one.", "error");
      return;
    }
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await axios.post(
        `${backendUrl}/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        { new_password: password }
      );
      setIsSuccess(true);
      showToast("Password reset", "You can now sign in with your new password.", "success");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string; details?: string[] } } };
      const msg = ax.response?.data?.error || "Something went wrong. Please try again.";
      showToast("Reset failed", msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token.trim()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={AlertCircleIcon} size={32} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid reset link</h1>
          <p className="text-gray-500 text-sm mb-6">
            This link is invalid or has expired. Please request a new password reset from the login
            page.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            Forgot Password
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </Link>
        </motion.div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <AnimatePresence>{toast && <Toast {...toast} onClose={() => setToast(null)} />}</AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h1>
          <p className="text-gray-500 text-sm mb-6">You can now sign in with your new password.</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            Sign In
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <AnimatePresence>{toast && <Toast {...toast} onClose={() => setToast(null)} />}</AnimatePresence>

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

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={LockPasswordIcon} size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set new password</h1>
            <p className="text-gray-500 text-sm">Choose a strong password for your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <HugeiconsIcon icon={LockPasswordIcon} size={18} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={`block w-full h-12 pl-12 pr-12 border ${
                    errors.password ? "border-red-300" : "border-gray-200"
                  } rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={18} />
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
              <ul className="mt-2 text-xs text-gray-500 space-y-1">
                {PASSWORD_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <HugeiconsIcon icon={LockPasswordIcon} size={18} className="text-gray-400" />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`block w-full h-12 pl-12 pr-12 border ${
                    errors.confirm ? "border-red-300" : "border-gray-200"
                  } rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <HugeiconsIcon icon={showConfirm ? ViewOffIcon : ViewIcon} size={18} />
                </button>
              </div>
              {errors.confirm && <p className="mt-1.5 text-sm text-red-600">{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Update password
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Back to Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
