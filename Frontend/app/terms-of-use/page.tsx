"use client";

import React from "react";
import { motion } from "framer-motion";
import Footer from "@/components/layout/Footer";

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-linear-to-b from-blue-50/50 to-white border-b border-gray-100 pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-600">
              Last updated: January 2026
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="prose prose-gray max-w-none"
        >
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              By accessing and using SCM INSIGHTS services, you accept and agree to be bound by
              these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Use of Services</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Our services are provided for business intelligence and trade data analysis purposes.
              You agree to use our services only for lawful purposes and in accordance with these terms.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>You must not use automated systems to access the service</li>
              <li>You must not redistribute or resell our data without permission</li>
              <li>You must maintain the confidentiality of your account credentials</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              To access certain features, you must register for an account. You agree to provide
              accurate and complete information and to keep this information up to date.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              All content, features, and functionality of our services are owned by SCM INSIGHTS
              and are protected by international copyright, trademark, and other intellectual
              property laws.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              SCM INSIGHTS shall not be liable for any indirect, incidental, special, consequential,
              or punitive damages resulting from your use of or inability to use the services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to modify these terms at any time. We will notify users of
              any material changes by posting the new terms on this page.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For any questions regarding these Terms of Service, please contact us at{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 hover:text-blue-700">
                aashita@aashita.ai
              </a>
            </p>
          </section>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
