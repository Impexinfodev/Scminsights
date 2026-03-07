"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Mail01Icon,
  CallIcon,
  Building02Icon,
  Calendar01Icon,
  SecurityCheckIcon,
  Loading03Icon,
  PencilEdit01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import axios from "axios";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, sessionChecked, sessionToken } = useUser({ redirectTo: "/login" });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", companyName: "", phoneNumber: "" });

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (isLoading || !sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <HugeiconsIcon icon={Loading03Icon} size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  const userName = user?.name || user?.user_details?.Name || "User";
  const userEmail = user?.user_id || "";
  const companyName = user?.user_details?.CompanyName || "";
  const phoneNumber = user?.user_details?.PhoneNumber || "";
  const sessionExpiry = user?.session_expiration_time
    ? new Date(user.session_expiration_time).toLocaleString()
    : "N/A";

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleEditOpen = () => {
    setEditForm({
      name: userName === "User" ? "" : userName,
      companyName,
      phoneNumber,
    });
    setSaveError("");
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!sessionToken) return;
    setIsSaving(true);
    setSaveError("");
    try {
      await axios.put(
        `${backendUrl}/api/profile`,
        {
          name: editForm.name.trim(),
          companyName: editForm.companyName.trim(),
          phoneNumber: editForm.phoneNumber.trim(),
        },
        { headers: { "Session-Token": sessionToken, "X-Client": "scm-insights" } },
      );
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => {
        setSaveSuccess(false);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
          <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
              <p className="text-gray-600">Manage your account information</p>
            </div>
            {!isEditing && (
              <button
                onClick={handleEditOpen}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Success Banner */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium"
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-emerald-500" />
                Profile updated successfully!
              </motion.div>
            )}
          </AnimatePresence>

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

              {isEditing ? (
                <div className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      maxLength={200}
                      placeholder="Your full name"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                    <input
                      type="text"
                      value={editForm.companyName}
                      onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))}
                      maxLength={300}
                      placeholder="Your company"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phoneNumber}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          phoneNumber: e.target.value.replace(/[^\d+\s-]/g, ""),
                        }))
                      }
                      placeholder="+91 98765 43210"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                      ) : (
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                      )}
                      {isSaving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={UserIcon} size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Full Name</p>
                      <p className="text-gray-900 font-medium capitalize">{userName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Mail01Icon} size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Email Address</p>
                      <p className="text-gray-900 font-medium">{userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Building02Icon} size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Company Name</p>
                      <p className="text-gray-900 font-medium capitalize">{companyName || "Not specified"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={CallIcon} size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                      <p className="text-gray-900 font-medium">{phoneNumber || "Not specified"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Session Info */}
              {!isEditing && (
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
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
