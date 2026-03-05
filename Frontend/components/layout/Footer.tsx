"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Linkedin01Icon,
  NewTwitterIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="font-bold text-xl">
                <span className="text-gray-900">SCM</span>
                <span className="text-blue-600"> INSIGHTS</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Global trade intelligence platform by Aashita Technosoft Pvt. Ltd. helping businesses discover verified trade partners worldwide.
            </p>

            {/* Social Icons */}
            <div className="flex gap-2">
              {[
                { icon: Linkedin01Icon, href: "https://www.linkedin.com/company/scminsights", label: "LinkedIn", external: true },
                { icon: NewTwitterIcon, href: "https://x.com/scminsights", label: "X (Twitter)", external: true },
                { icon: Mail01Icon, href: "/contact", label: "Contact us", external: false },
              ].map((social, index) =>
                social.external ? (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                  >
                    <HugeiconsIcon icon={social.icon} size={18} />
                  </a>
                ) : (
                  <Link
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                  >
                    <HugeiconsIcon icon={social.icon} size={18} />
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-5">Product</h4>
            <ul className="space-y-3">
              {[
                { label: "Buyers Directory", href: "/buyers-directory" },
                { label: "Search Buyers", href: "/buyer" },
                { label: "Search Suppliers", href: "/supplier" },
                { label: "Plans & Pricing", href: "/plans" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-5">Company</h4>
            <ul className="space-y-3">
              {[
                { label: "About Us", href: "/about" },
                { label: "Contact", href: "/contact" },
                { label: "HSN Codes", href: "/hsn" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-5">Legal</h4>
            <ul className="space-y-3">
              {[
                { label: "Privacy Policy", href: "/policy" },
                { label: "Terms of Service", href: "/terms-of-use" },
                { label: "Refund & Cancellation", href: "/refund-policy" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 p-3 bg-white rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 leading-relaxed">
                Payments by <span className="font-semibold text-gray-700">Razorpay</span>.
                UPI · Net Banking · Cards · Wallets
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-white border-t border-gray-100 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} SCM INSIGHTS by Aashita Technosoft Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/policy" className="hover:text-blue-600 transition-colors">Privacy</Link>
              <Link href="/terms-of-use" className="hover:text-blue-600 transition-colors">Terms</Link>
              <Link href="/refund-policy" className="hover:text-blue-600 transition-colors">Refunds</Link>
              <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
