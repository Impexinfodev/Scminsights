"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Mail01Icon,
  CallIcon,
  Building02Icon,
  Calendar01Icon,
  SecurityCheckIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, sessionChecked } = useUser({ redirectTo: "/login" });

  // Show loading while checking auth
  if (isLoading || !sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <HugeiconsIcon icon={Loading03Icon} size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  // Get user details
  const userName = user?.name || user?.user_details?.Name || "User";
  const userEmail = user?.user_id || "";
  const companyName = user?.user_details?.CompanyName || "Not specified";
  const phoneNumber = user?.user_details?.PhoneNumber || "Not specified";
  const sessionExpiry = user?.session_expiration_time
    ? new Date(user.session_expiration_time).toLocaleString()
    : "N/A";

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600">Manage your account information</p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Profile Header */}
            <div className="bg-linear-to-r from-blue-600 to-blue-700 px-8 py-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold border-4 border-white/30">
                  {getInitials(userName)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white capitalize">{userName}</h2>
                  <p className="text-blue-100">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Information</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={UserIcon} size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Full Name</p>
                    <p className="text-gray-900 font-medium capitalize">{userName}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Mail01Icon} size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email Address</p>
                    <p className="text-gray-900 font-medium">{userEmail}</p>
                  </div>
                </div>

                {/* Company */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Building02Icon} size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Company Name</p>
                    <p className="text-gray-900 font-medium capitalize">{companyName}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={CallIcon} size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                    <p className="text-gray-900 font-medium">{phoneNumber}</p>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Session Information</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Calendar01Icon} size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Session Expires</p>
                      <p className="text-gray-900 font-medium">{sessionExpiry}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={SecurityCheckIcon} size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Account Status</p>
                      <p className="text-emerald-600 font-medium">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
