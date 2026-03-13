"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const COOKIE_KEY = "scm_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!consent) setVisible(true);
    } catch {
      // localStorage unavailable (SSR, private mode)
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(COOKIE_KEY, "accepted");
    } catch {}
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem(COOKIE_KEY, "declined");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-xl md:border"
    >
      <p className="text-sm text-gray-700 mb-3">
        We use essential cookies to keep you logged in and to remember your
        preferences. By continuing, you agree to our{" "}
        <Link href="/policy" className="text-blue-600 hover:underline">
          Privacy Policy
        </Link>
        . We do not use advertising or tracking cookies.
      </p>
      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={decline}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
