"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  CallIcon,
  Location01Icon,
  ArrowRight01Icon,
  Loading03Icon,
  CheckmarkCircle02Icon,
  UserIcon,
  Message01Icon,
  Cancel01Icon,
  AlertCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import Footer from "@/components/layout/Footer";

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

export default function ContactPageClient() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description: string;
    status: "success" | "error" | "warning" | "info";
  } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const contactApiUrl = `${backendUrl}/api/contact`;

  const showToast = (
    title: string,
    description: string,
    status: "success" | "error" | "warning" | "info",
  ) => {
    setToast({ title, description, status });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    // Phone: only allow digits, +, spaces, and dashes
    const sanitized = name === "phone" ? value.replace(/[^\d+\s-]/g, "") : value;
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Contact number is required";
    } else if (
      !/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/[\s-]/g, ""))
    ) {
      newErrors.phone = "Invalid phone number";
    }

    if (!formData.message.trim()) newErrors.message = "Message is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast(
        "Missing Information",
        "Please complete all required fields.",
        "info",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(contactApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-Client": "scm-insights",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        showToast(
          "Message Sent!",
          "Thank you for contacting us. We'll get back to you soon.",
          "success",
        );
        setFormData({ name: "", email: "", phone: "", message: "" });
        setTimeout(() => setIsSubmitted(false), 5000);
      } else {
        throw new Error(
          data?.error || data?.message || "Failed to submit your request.",
        );
      }
    } catch (error: any) {
      showToast(
        "Something Went Wrong",
        error.message || "Unable to send your message. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
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

      {/* Header */}
      <div className="bg-linear-to-b from-blue-50/50 to-white border-b border-gray-100 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Contact Us
            </h1>
            <p className="text-gray-600 text-lg">
              Have questions? We&apos;d love to hear from you. Send us a message
              and we&apos;ll respond as soon as possible.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Get in Touch
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    size={20}
                    className="text-blue-600"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Email
                  </h3>
                  <p className="text-gray-600 text-sm">
                    aashita@aashita.ai
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                  <HugeiconsIcon
                    icon={CallIcon}
                    size={20}
                    className="text-teal-600"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Phone
                  </h3>
                  <p className="text-gray-600 text-sm">+91 98765 43210</p>
                  <p className="text-gray-600 text-sm">
                    Mon - Fri, 9am - 6pm IST
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <HugeiconsIcon
                    icon={Location01Icon}
                    size={20}
                    className="text-indigo-600"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Office
                  </h3>
                  <p className="text-gray-600 text-sm">
                    123 Business Park,
                    <br />
                    Mumbai, Maharashtra 400001,
                    <br />
                    India
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
              {isSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 flex items-center gap-3"
                >
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={20}
                    className="text-emerald-500"
                  />
                  <span className="font-medium text-sm">
                    Thank you for reaching out! Our team will connect with you
                    shortly.
                  </span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <HugeiconsIcon
                        icon={UserIcon}
                        size={18}
                        className="text-gray-400"
                      />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      maxLength={100}
                      className={`w-full h-12 pl-12 pr-4 bg-gray-50 border ${
                        errors.name ? "border-red-300" : "border-gray-200"
                      } rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 transition-all`}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1.5">{errors.name}</p>
                  )}
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <HugeiconsIcon
                          icon={Mail01Icon}
                          size={18}
                          className="text-gray-400"
                        />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className={`w-full h-12 pl-12 pr-4 bg-gray-50 border ${
                          errors.email ? "border-red-300" : "border-gray-200"
                        } rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 transition-all`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1.5">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <HugeiconsIcon
                          icon={CallIcon}
                          size={18}
                          className="text-gray-400"
                        />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={`w-full h-12 pl-12 pr-4 bg-gray-50 border ${
                          errors.phone ? "border-red-300" : "border-gray-200"
                        } rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 transition-all`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1.5">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-4 left-4 pointer-events-none">
                      <HugeiconsIcon
                        icon={Message01Icon}
                        size={18}
                        className="text-gray-400"
                      />
                    </div>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your trade data needs or questions..."
                      rows={5}
                      className={`w-full pl-12 pr-4 py-4 bg-gray-50 border ${
                        errors.message ? "border-red-300" : "border-gray-200"
                      } rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 transition-all resize-none`}
                    />
                  </div>
                  {errors.message && (
                    <p className="text-red-500 text-sm mt-1.5">
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto h-12 px-8 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
                >
                  {isSubmitting ? (
                    <>
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        size={18}
                        className="animate-spin"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 mt-2">
                  By submitting this form, you agree to our privacy policy and
                  consent to being contacted regarding your inquiry.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
