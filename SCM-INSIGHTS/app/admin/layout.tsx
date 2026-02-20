"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare02Icon,
  UserGroupIcon,
  Logout01Icon,
  ArrowRight01Icon,
  Menu01Icon,
  Cancel01Icon,
  Ticket01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { logout } from "@/lib/store";
import { selectUser } from "@/lib/store";

const SIDEBAR_WIDTH = 280;
const NAVBAR_OFFSET = 72;

const navLinks = [
  {
    label: "Dashboard",
    icon: DashboardSquare02Icon,
    path: "/admin",
    description: "Overview & stats",
  },
  {
    label: "Users",
    icon: UserGroupIcon,
    path: "/admin/users",
    description: "User management",
  },
  {
    label: "Assign License",
    icon: Ticket01Icon,
    path: "/admin/assign-license",
    description: "Search users and assign plan",
  },
  {
    label: "Plans",
    icon: Ticket01Icon,
    path: "/admin/plans",
    description: "Plans & pricing",
  },
  {
    label: "Contacts",
    icon: Message01Icon,
    path: "/admin/contacts",
    description: "Contact form submissions",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const userData = useAppSelector(selectUser);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = userData?.user_details?.Role === "ADMIN";

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (userData && !isAdmin) {
      router.replace("/");
    }
  }, [userData, isAdmin, router]);

  const handleSignOut = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const token =
      userData?.session_token ??
      (typeof window !== "undefined"
        ? localStorage.getItem("session_token")
        : null);
    if (token && backendUrl) {
      try {
        await fetch(`${backendUrl}/logout`, {
          method: "POST",
          headers: { "Session-Token": token, "X-Client": "scm-insights" },
        });
      } catch {
        /* ignore */
      }
    }
    dispatch(logout());
    router.push("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header - touches top of sidebar */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <HugeiconsIcon
              icon={DashboardSquare02Icon}
              size={18}
              className="text-white"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight leading-tight">
              Admin Portal
            </h2>
            <span className="text-xs text-gray-500 font-medium block">
              SCM Insights
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <div className="px-2 mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Navigation
          </span>
        </div>

        {navLinks.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`group flex items-center w-full p-2.5 rounded-xl transition-all duration-200 relative overflow-hidden ${
                isActive
                  ? "bg-linear-to-br from-blue-600 via-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                  : "text-gray-500 hover:bg-gray-50 hover:pl-3 transition-all"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors shrink-0 ${
                  isActive
                    ? "bg-white/20"
                    : "bg-gray-100 group-hover:bg-gray-200"
                }`}
              >
                <HugeiconsIcon
                  icon={link.icon}
                  size={18}
                  className={isActive ? "text-white" : "text-gray-500"}
                />
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm block truncate ${isActive ? "font-semibold text-white" : "font-medium text-gray-700"}`}
                >
                  {link.label}
                </span>
              </div>
              {isActive && (
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  className="text-white/80 shrink-0"
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer / Sign Out */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mr-3 shrink-0">
            <HugeiconsIcon icon={Logout01Icon} size={18} />
          </div>
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-gray-50 overflow-hidden"
      style={{ paddingTop: NAVBAR_OFFSET }}
    >
      {/* Mobile: Admin bar with menu toggle */}
      <div
        className="lg:hidden fixed left-0 right-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm"
        style={{ top: NAVBAR_OFFSET }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <HugeiconsIcon
              icon={DashboardSquare02Icon}
              size={18}
              className="text-white"
            />
          </div>
          <span className="font-bold text-gray-800">Admin Portal</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <HugeiconsIcon
            icon={isMobileMenuOpen ? Cancel01Icon : Menu01Icon}
            size={20}
          />
        </button>
      </div>

      <div className="flex min-h-[calc(100vh-72px)]">
        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:block shrink-0 fixed left-0 bottom-0 z-20"
          style={{
            width: SIDEBAR_WIDTH,
            top: NAVBAR_OFFSET,
            height: `calc(100vh - ${NAVBAR_OFFSET}px)`,
          }}
        >
          <SidebarContent />
        </aside>

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            style={{ top: NAVBAR_OFFSET }}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden
          />
        )}

        {/* Mobile Sidebar drawer */}
        <div
          className={`lg:hidden fixed bottom-0 left-0 z-50 max-w-[85vw] bg-white border-r border-gray-100 transform transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            width: SIDEBAR_WIDTH,
            top: NAVBAR_OFFSET,
            height: `calc(100vh - ${NAVBAR_OFFSET}px)`,
          }}
        >
          <SidebarContent />
        </div>

        {/* Main content - spacing below navbar/admin bar (mobile) and from sidebar */}
        <main
          className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden px-4 pt-30 pb-8 md:px-6 md:pt-8 lg:ml-[280px] lg:pt-8 lg:pl-8 lg:pr-8"
          style={{ minHeight: `calc(100vh - ${NAVBAR_OFFSET}px)` }}
        >
          <div className="max-w-6xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
