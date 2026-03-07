"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  LockPasswordIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Loading03Icon,
  ViewIcon,
  ViewOffIcon,
  Globe02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import axios from "axios";
import {
  useAppDispatch,
  useAppSelector,
  login,
  selectIsLoggedIn,
  selectSessionChecked,
} from "@/lib/store";

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

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const sessionChecked = useAppSelector(selectSessionChecked);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [toast, setToast] = useState<{ title: string; description: string; status: "success" | "error" | "warning" | "info" } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    // Redirect if already logged in (only after session is checked)
    if (sessionChecked && isLoggedIn) {
      router.replace("/");
    }

    // Load remembered email (safely handle legacy JSON-encoded values)
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      let emailValue = savedEmail;
      try {
        const parsed = JSON.parse(savedEmail);
        if (parsed && typeof parsed.email === "string") {
          emailValue = parsed.email;
          localStorage.setItem("rememberedEmail", emailValue);
        }
      } catch {
        // already a plain string, use as-is
      }
      setFormData((prev) => ({ ...prev, email: emailValue }));
      setRememberMe(true);
    }
  }, [router, isLoggedIn, sessionChecked]);

  const showToast = (title: string, description: string, status: "success" | "error" | "warning" | "info") => {
    setToast({ title, description, status });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    let isValid = true;
    let newErrors = { email: "", password: "" };

    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    }
    setErrors(newErrors);

    if (!isValid) {
      showToast("Missing Information", "Please enter your email and password.", "info");
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl?.trim()) {
      showToast("Configuration Error", "Backend URL is not configured. Please check your environment.", "error");
      return;
    }

    setIsLoading(true);

    if (rememberMe) {
      localStorage.setItem("rememberedEmail", formData.email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    try {
      const response = await axios.post(
        `${backendUrl}/login`,
        {
          email: formData.email.toLowerCase(),
          password: formData.password,
        },
        { headers: { "X-Client": "scm-insights" } }
      );

      const { session_token, session_expiration_time } = response.data;

      if (session_token && session_expiration_time) {
        // Dispatch Redux login action
        dispatch(login(response.data));

        showToast("Welcome back!", "You have logged in successfully.", "success");

        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 500);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setErrors({ email: " ", password: " " });
        showToast("Login Failed", "Please check your email and password.", "error");
      } else {
        const errorMessage = error.response?.data?.error || error.message || "Unknown error";
        showToast("Connection Error", `Please try again. ${errorMessage}`, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
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

      {/* Left Section - Image */}
      <div className="hidden lg:flex flex-1 bg-blue-600 relative items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
          alt="Global Trade"
          fill
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/60" />

        <div className="relative z-10 text-white flex flex-col items-center text-center px-12 max-w-[600px] gap-6">
          <HugeiconsIcon icon={Globe02Icon} size={64} className="text-blue-200" />
          <h1 className="text-4xl font-bold leading-tight">
            Global Trade Intelligence
          </h1>
          <p className="text-xl text-blue-100 font-medium">
            Access verified buyers and suppliers data from 209+ countries. Make informed trade decisions.
          </p>
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12 bg-white relative">
        {/* Back Link */}
        <Link
          href="/"
          className="absolute top-8 left-8 hidden md:flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px]"
        >
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="inline-block mb-6">
              <span className="text-2xl font-bold">
                <span className="text-gray-900">SCM</span>
                <span className="text-blue-600"> INSIGHTS</span>
              </span>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Please enter your details to sign in.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <HugeiconsIcon icon={Mail01Icon} size={18} className="text-gray-400" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  autoComplete="email"
                  aria-invalid={!!(errors.email && errors.email !== " ")}
                  aria-describedby={errors.email && errors.email !== " " ? "login-email-error" : undefined}
                  className={`block w-full h-12 pl-12 pr-4 border ${errors.email ? "border-red-300" : "border-gray-200"
                    } rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                />
              </div>
              {errors.email && errors.email !== " " && (
                <p id="login-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  href={`/forgot-password${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ""}`}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <HugeiconsIcon icon={LockPasswordIcon} size={18} className="text-gray-400" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={!!(errors.password && errors.password !== " ")}
                  aria-describedby={errors.password && errors.password !== " " ? "login-password-error" : undefined}
                  className={`block w-full h-12 pl-12 pr-12 border ${errors.password ? "border-red-300" : "border-gray-200"
                    } rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={18} />
                </button>
              </div>
              {errors.password && errors.password !== " " && (
                <p id="login-password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            {/* Submit - disabled when loading to prevent double submit */}
            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
