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
  UserIcon,
  SmartPhone01Icon,
  Building02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  InformationCircleIcon,
  BoatIcon,
} from "@hugeicons/core-free-icons";
import axios from "axios";
import {
  useAppSelector,
  selectIsLoggedIn,
  selectSessionChecked,
} from "@/lib/store";

// Toast Component
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
        <HugeiconsIcon
          icon={icons[status]}
          size={20}
          className={iconColors[status]}
        />
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

export default function SignupPage() {
  const router = useRouter();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const sessionChecked = useAppSelector(selectSessionChecked);

  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
  const [toast, setToast] = useState<{
    title: string;
    description: string;
    status: "success" | "error" | "warning" | "info";
  } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const countryCodes = [
    { code: "+91", country: "India" },
    { code: "+84", country: "Vietnam" },
    { code: "+62", country: "Indonesia" },
    { code: "+1", country: "USA" },
    { code: "+971", country: "UAE" },
    { code: "+44", country: "UK" },
    { code: "+86", country: "China" },
  ];

  // Redirect if already logged in
  useEffect(() => {
    if (sessionChecked && isLoggedIn) {
      router.replace("/");
    }
  }, [router, isLoggedIn, sessionChecked]);

  const showToast = (
    title: string,
    description: string,
    status: "success" | "error" | "warning" | "info",
  ) => {
    setToast({ title, description, status });
  };

  const passwordRules = [
    { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { id: "upper", label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
    { id: "lower", label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
    { id: "digit", label: "One number (0-9)", test: (p: string) => /\d/.test(p) },
    { id: "special", label: "One special character (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const validateForm = () => {
    let newErrors: Record<string, string> = {};

    if (!formValues.fullName.trim())
      newErrors.fullName = "Full name is required";

    if (!formValues.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formValues.email))
      newErrors.email = "Invalid email address";

    if (!formValues.mobileNumber.trim())
      newErrors.mobileNumber = "Phone number is required";
    else if (!/^\d{6,15}$/.test(formValues.mobileNumber.replace(/\D/g, "")))
      newErrors.mobileNumber = "Invalid phone number";

    if (!formValues.password) {
      newErrors.password = "Password is required";
    } else {
      const failed = passwordRules.filter((r) => !r.test(formValues.password));
      if (failed.length > 0)
        newErrors.password = `Password needs: ${failed.map((r) => r.label).join(", ")}`;
    }

    if (formValues.password !== formValues.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (!formValues.agreeTerms)
      newErrors.agreeTerms = "You must agree to the terms";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast("Almost There", "Please complete all required fields.", "info");
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === "checkbox") {
      setFormValues((prev) => ({ ...prev, [name]: checked }));
      if (checked && errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    } else {
      setFormValues((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const cleanPhoneNumber = formValues.mobileNumber.replace(/\D/g, "");

      const signupData = {
        email: formValues.email.toLowerCase(),
        password: formValues.password,
        name: formValues.fullName.toLowerCase(),
        companyName: (formValues.companyName || "").toLowerCase(),
        phoneNumber: cleanPhoneNumber,
        phoneNumberCountryCode: selectedCountryCode.replace("+", ""),
        licenseType: "trial",
      };

      await axios.post(`${backendUrl}/signup`, signupData, {
        headers: { "X-Requested-With": "XMLHttpRequest", "X-Client": "scm-insights" },
      });

      showToast(
        "Account Created!",
        "Please check your email (including spam) for the activation link.",
        "success",
      );

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      const msg = error.response?.data?.message;

      if (msg === "EMAIL_EXISTS") {
        showToast(
          "Email Already Registered",
          "This email is already in use. Try logging in.",
          "info",
        );
      } else if (msg === "PHONE_EXISTS") {
        showToast(
          "Phone Already Registered",
          "This phone number is already in use.",
          "info",
        );
      } else {
        showToast(
          "Something Went Wrong",
          error.response?.data?.error || "Please try again later.",
          "error",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
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
      <div className="hidden lg:flex w-1/2 bg-blue-900 relative items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2070&auto=format&fit=crop"
          alt="Global Logistics"
          fill
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-linear-to-br from-blue-900/40 to-black/70" />

        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-xl space-y-5 text-white">
          <div className="p-4 bg-white/20 backdrop-blur-md rounded-full">
            <HugeiconsIcon
              icon={BoatIcon}
              size={32}
              className="text-blue-200"
            />
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Join SCM INSIGHTS
          </h1>
          <p className="text-lg text-blue-100 font-medium">
            Access comprehensive global trade data, verified buyers and
            suppliers instantly.
          </p>
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 md:p-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm mb-6"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            Back to Home
          </Link>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </h2>
            <p className="text-gray-500">
              Enter your details below to start your free trial.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Row 1: Name & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HugeiconsIcon
                      icon={UserIcon}
                      size={16}
                      className="text-gray-400"
                    />
                  </div>
                  <input
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formValues.fullName}
                    onChange={handleInputChange}
                    className={`block w-full h-11 pl-11 pr-4 border ${errors.fullName ? "border-red-300" : "border-gray-200"} rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HugeiconsIcon
                      icon={Mail01Icon}
                      size={16}
                      className="text-gray-400"
                    />
                  </div>
                  <input
                    name="email"
                    type="email"
                    placeholder="john@company.com"
                    value={formValues.email}
                    onChange={handleInputChange}
                    className={`block w-full h-11 pl-11 pr-4 border ${errors.email ? "border-red-300" : "border-gray-200"} rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Row 2: Phone & Company */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                    className="h-11 px-3 border border-r-0 border-gray-200 bg-gray-50 text-gray-600 text-sm rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white w-20"
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    name="mobileNumber"
                    type="tel"
                    placeholder="9876543210"
                    value={formValues.mobileNumber}
                    onChange={handleInputChange}
                    className={`block w-full h-11 px-4 border ${errors.mobileNumber ? "border-red-300" : "border-gray-200"} rounded-r-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                </div>
                {errors.mobileNumber && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.mobileNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HugeiconsIcon
                      icon={Building02Icon}
                      size={16}
                      className="text-gray-400"
                    />
                  </div>
                  <input
                    name="companyName"
                    type="text"
                    placeholder="Your Company"
                    value={formValues.companyName}
                    onChange={handleInputChange}
                    className="block w-full h-11 pl-11 pr-4 border border-gray-200 rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Password & Confirm */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HugeiconsIcon
                      icon={LockPasswordIcon}
                      size={16}
                      className="text-gray-400"
                    />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formValues.password}
                    onChange={handleInputChange}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className={`block w-full h-11 pl-11 pr-11 border ${errors.password ? "border-red-300" : "border-gray-200"} rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <HugeiconsIcon
                      icon={showPassword ? ViewOffIcon : ViewIcon}
                      size={16}
                    />
                  </button>
                </div>
                {(passwordFocused || formValues.password) && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                    {passwordRules.map((rule) => {
                      const met = rule.test(formValues.password);
                      return (
                        <div key={rule.id} className={`flex items-center gap-1.5 text-xs ${met ? "text-emerald-600" : "text-gray-400"}`}>
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${met ? "bg-emerald-500" : "bg-gray-300"}`}>
                            {met ? "✓" : "·"}
                          </span>
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                )}
                {errors.password && !passwordFocused && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HugeiconsIcon
                      icon={LockPasswordIcon}
                      size={16}
                      className="text-gray-400"
                    />
                  </div>
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formValues.confirmPassword}
                    onChange={handleInputChange}
                    className={`block w-full h-11 pl-11 pr-11 border ${errors.confirmPassword ? "border-red-300" : "border-gray-200"} rounded-xl text-sm placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <HugeiconsIcon
                      icon={showConfirmPassword ? ViewOffIcon : ViewIcon}
                      size={16}
                    />
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start mt-4">
              <input
                id="agreeTerms"
                name="agreeTerms"
                type="checkbox"
                checked={formValues.agreeTerms}
                onChange={handleInputChange}
                className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
              <div className="ml-3 text-sm">
                <label
                  htmlFor="agreeTerms"
                  className="text-gray-700 cursor-pointer"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms-of-use"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    terms and conditions
                  </Link>
                </label>
                {errors.agreeTerms && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.agreeTerms}
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={18}
                    className="animate-spin"
                  />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </>
              )}
            </button>

            {/* Footer */}
            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
