"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  Home01Icon,
  Database01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  Logout01Icon,
  UserIcon,
  ArrowDown01Icon,
  CallIcon,
  DashboardSquare02Icon,
  Ticket01Icon,
} from "@hugeicons/core-free-icons";
import {
  useAppDispatch,
  useAppSelector,
  logout,
  selectIsLoggedIn,
  selectUser,
  selectSessionChecked,
} from "@/lib/store";

const getUserDisplayInfo = (
  name: string | null | undefined,
  email: string | null | undefined,
) => {
  let displayName = "User";
  let fullName = "User";
  let avatarText = "U";

  if (name && name.trim() && name.trim().toLowerCase() !== "user") {
    fullName = name.trim().replace(/\b\w/g, (c) => c.toUpperCase());
    displayName = fullName.split(" ")[0];
    const nameParts = name.trim().split(" ").filter(Boolean);
    avatarText =
      nameParts.length >= 2
        ? (
            nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
          ).toUpperCase()
        : name.trim().charAt(0).toUpperCase();
  } else if (email && email.trim()) {
    const emailUsername = email.split("@")[0];
    displayName =
      emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
    fullName = displayName;
    avatarText = email.trim().charAt(0).toUpperCase();
  }

  return { displayName, fullName, avatarText };
};

const MenuItems = [
  { title: "Home", href: "/", icon: Home01Icon },
  { title: "Directory", href: "/buyers-directory", icon: Database01Icon },
  { title: "Buyers", href: "/buyer", icon: UserAdd01Icon },
  { title: "Suppliers", href: "/supplier", icon: UserGroupIcon },
  { title: "Plans", href: "/plans", icon: Ticket01Icon },
  { title: "Contact", href: "/contact", icon: CallIcon },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Redux state
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const userData = useAppSelector(selectUser);
  const sessionChecked = useAppSelector(selectSessionChecked);

  const pathname = usePathname();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = lastScrollY.current;

    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }

    setScrolled(latest > 50);
    lastScrollY.current = latest;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const token =
      userData?.session_token ??
      (typeof window !== "undefined"
        ? localStorage.getItem("session_token")
        : null);
    if (token) {
      try {
        await fetch(`${backendUrl}/logout`, {
          method: "POST",
          headers: { "Session-Token": token, "X-Client": "scm-insights" },
        });
      } catch {
        /* ignore; clear local session anyway */
      }
    }
    dispatch(logout());
    setIsProfileOpen(false);
    setIsOpen(false);
    router.push("/login");
  };

  const { displayName, fullName, avatarText } = getUserDisplayInfo(
    userData?.name || userData?.user_details?.Name,
    userData?.user_id,
  );

  const isAdmin = userData?.user_details?.Role === "ADMIN";
  const isAdminRoute = pathname?.startsWith("/admin");

  // Don't render auth section until session is checked
  const showAuthSection = sessionChecked;

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: hidden ? -100 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-0 left-0 right-0 z-50 w-full"
      >
        <div
          className={`transition-all duration-300 w-full ${scrolled ? "py-3" : "py-4"}`}
        >
          <div
            className={`w-full px-4 sm:px-6 lg:px-8 ${isAdminRoute ? "" : "max-w-7xl mx-auto"}`}
          >
            <div
              className={`flex items-center justify-between rounded-2xl px-6 py-3 transition-all duration-300 ${
                scrolled
                  ? "bg-white/95 backdrop-blur-xl border border-gray-200 shadow-lg shadow-gray-200/50"
                  : "bg-white/80 backdrop-blur-md border border-gray-100"
              }`}
            >
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:shadow-blue-600/40 transition-shadow">
                  <span className="font-logo text-white text-xl">S</span>
                </div>
                <span className="font-logo text-2xl hidden sm:block tracking-wide">
                  <span className="text-gray-900">SCM</span>
                  <span className="bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    INSIGHTS
                  </span>
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {MenuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <HugeiconsIcon icon={item.icon} size={16} />
                      {item.title}
                    </Link>
                  );
                })}
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="lg:hidden p-2.5 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  <HugeiconsIcon
                    icon={isOpen ? Cancel01Icon : Menu01Icon}
                    size={20}
                  />
                </button>

                {/* Auth */}
                <div className="hidden lg:block relative" ref={profileMenuRef}>
                  {!showAuthSection ? (
                    <div className="w-24 h-10 bg-gray-100 rounded-xl animate-pulse" />
                  ) : !isLoggedIn ? (
                    <Link
                      href="/login"
                      className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-5"
                    >
                      Sign In
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                          isProfileOpen
                            ? "bg-gray-100 border border-gray-200"
                            : "bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-sm font-semibold shadow-md">
                          {avatarText}
                        </div>
                        <span className="text-sm font-medium text-gray-700 hidden md:block">
                          {displayName}
                        </span>
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          size={14}
                          className={`text-gray-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {isProfileOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-3 w-72 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl"
                          >
                            {/* User Info Header */}
                            <div className="p-4 border-b border-gray-100 bg-linear-to-br from-blue-50 to-gray-50">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-lg font-semibold shadow-md">
                                  {avatarText}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {fullName}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {userData?.user_id}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Admin Dashboard - only for admins */}
                            {isAdmin && (
                              <div className="p-2">
                                <Link
                                  href="/admin"
                                  onClick={() => setIsProfileOpen(false)}
                                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <HugeiconsIcon
                                      icon={DashboardSquare02Icon}
                                      size={16}
                                      className="text-indigo-600"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      Admin Dashboard
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Manage users and overview
                                    </p>
                                  </div>
                                </Link>
                              </div>
                            )}

                            {/* Profile Link */}
                            <div className="p-2">
                              <Link
                                href="/profile"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all"
                              >
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <HugeiconsIcon
                                    icon={UserIcon}
                                    size={16}
                                    className="text-blue-600"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium">My Profile</p>
                                  <p className="text-xs text-gray-500">
                                    View and edit your profile
                                  </p>
                                </div>
                              </Link>
                            </div>

                            {/* Plan Link */}
                            <div className="p-2">
                              <Link
                                href="/plan"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all"
                              >
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                  <HugeiconsIcon
                                    icon={Ticket01Icon}
                                    size={16}
                                    className="text-indigo-600"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium">My Plan</p>
                                  <p className="text-xs text-gray-500">
                                    View your license and upgrade
                                  </p>
                                </div>
                              </Link>
                            </div>

                            {/* Sign Out */}
                            <div className="p-2 border-t border-gray-100">
                              <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all"
                              >
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                  <HugeiconsIcon
                                    icon={Logout01Icon}
                                    size={16}
                                    className="text-red-600"
                                  />
                                </div>
                                <div className="text-left">
                                  <p className="font-medium">Sign Out</p>
                                  <p className="text-xs text-red-400">
                                    Logout from your account
                                  </p>
                                </div>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <span className="font-bold text-xl text-gray-900">Menu</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-2">
                  {MenuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        <HugeiconsIcon icon={item.icon} size={20} />
                        {item.title}
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  {!showAuthSection ? (
                    <div className="w-full h-12 bg-gray-100 rounded-xl animate-pulse" />
                  ) : isLoggedIn ? (
                    <div className="space-y-3">
                      {/* User Info */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-linear-to-br from-blue-50 to-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-sm font-semibold shadow-md">
                          {avatarText}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {fullName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {userData?.user_id}
                          </p>
                        </div>
                      </div>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <HugeiconsIcon
                              icon={DashboardSquare02Icon}
                              size={16}
                              className="text-indigo-600"
                            />
                          </div>
                          <div>
                            <p className="font-medium">Admin Dashboard</p>
                            <p className="text-xs text-gray-500">
                              Manage users and overview
                            </p>
                          </div>
                        </Link>
                      )}

                      {/* Profile Link */}
                      <Link
                        href="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <HugeiconsIcon
                            icon={UserIcon}
                            size={16}
                            className="text-blue-600"
                          />
                        </div>
                        <div>
                          <p className="font-medium">My Profile</p>
                          <p className="text-xs text-gray-500">
                            View and edit your profile
                          </p>
                        </div>
                      </Link>

                      {/* Sign Out */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <HugeiconsIcon
                            icon={Logout01Icon}
                            size={16}
                            className="text-red-600"
                          />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Sign Out</p>
                          <p className="text-xs text-red-400">
                            Logout from your account
                          </p>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                    >
                      Sign In
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
