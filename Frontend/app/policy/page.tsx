"use client";

import React from "react";
import { motion } from "framer-motion";
import Footer from "@/components/layout/Footer";

export default function PolicyPage() {
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
              Privacy Policy
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We collect information you provide directly to us, such as when you create an account,
              subscribe to our services, or contact us for support. This may include your name, email
              address, phone number, company name, and payment information.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the information we collect to provide, maintain, and improve our services,
              process transactions, send you technical notices and support messages, and respond
              to your comments and questions.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Data Security</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We take reasonable measures to help protect your personal information from loss, theft,
              misuse, unauthorized access, disclosure, alteration, and destruction. All data is
              encrypted in transit and at rest.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We retain your personal information for as long as necessary to provide services
              to you and fulfill the purposes described in this policy. We may also retain and
              use this information to comply with our legal obligations.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              You have the right to access, update, or delete your personal information at any time.
              You can do this through your account settings or by contacting us directly.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{" "}
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
