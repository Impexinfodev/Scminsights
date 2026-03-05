import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | SCM INSIGHTS",
  description:
    "Refund and Cancellation Policy for SCM INSIGHTS by Aashita Technosoft Pvt. Ltd. Understand our 7-day refund window and cancellation process.",
  alternates: { canonical: "https://scminsights.ai/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-blue-50/50 to-white border-b border-gray-100 pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: March 2026 &nbsp;|&nbsp; Effective: March 2026
          </p>
          <p className="text-gray-600 mt-3 text-sm leading-relaxed">
            This policy governs refunds and cancellations for paid subscriptions on SCM INSIGHTS, operated by{" "}
            <strong>Aashita Technosoft Pvt. Ltd.</strong> This policy is in compliance with the{" "}
            <strong>Consumer Protection Act 2019</strong> and the{" "}
            <strong>Consumer Protection (E-Commerce) Rules 2020</strong> of India.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10 text-gray-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Overview</h2>
          <p>
            SCM INSIGHTS offers subscription-based plans for access to trade intelligence data. All payments are processed in Indian Rupees (INR) through Razorpay. This policy explains your rights and our obligations with respect to refunds and cancellations.
          </p>
          <div className="mt-4 bg-blue-50 rounded-xl p-5 border border-blue-100">
            <p className="font-semibold text-blue-900 mb-2">Quick Summary</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>7-day full refund window if no data has been accessed</li>
              <li>Full refund for technical failures on our part</li>
              <li>Full refund for duplicate payments</li>
              <li>No refund once data records have been accessed or downloaded</li>
              <li>Cancel anytime — access continues until end of billing period</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Cancellation Policy</h2>
          <p>You may cancel your subscription at any time by:</p>
          <ul className="list-disc list-inside mt-3 space-y-2">
            <li>Emailing us at{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>{" "}
              with subject &quot;Cancellation Request – [Registered Email]&quot;
            </li>
            <li>Using the contact form at{" "}
              <Link href="/contact" className="text-blue-600 underline">scminsights.ai/contact</Link>
            </li>
          </ul>
          <p className="mt-3">
            Upon cancellation, your access to paid features will continue until the <strong>end of the current billing period</strong>. No automatic renewals occur after cancellation.
          </p>
          <p className="mt-2 text-gray-500">
            Note: SCM INSIGHTS plans are currently one-time annual subscriptions without auto-renewal. We will notify you before any recurring billing model is introduced.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Refund Eligibility</h2>

          <div className="space-y-5">
            <div className="border border-emerald-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200">
                <h3 className="font-semibold text-emerald-800">Eligible for Full Refund</h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="font-medium text-gray-900">7-Day No-Usage Refund</p>
                  <p className="text-gray-600 mt-1">
                    If you request a refund within <strong>7 calendar days</strong> of payment AND you have not accessed, viewed, or downloaded any data records under the paid plan, you are eligible for a full refund.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Technical Failure</p>
                  <p className="text-gray-600 mt-1">
                    If your payment was successfully debited but the plan was not activated due to a technical error on our part, a full refund will be initiated within 7 working days.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Duplicate Payment</p>
                  <p className="text-gray-600 mt-1">
                    If you were charged more than once for the same plan due to a payment gateway error, the duplicate amount will be refunded in full within 7 working days after verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-red-200 rounded-xl overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                <h3 className="font-semibold text-red-800">Not Eligible for Refund</h3>
              </div>
              <div className="p-4">
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>After any data records have been accessed, viewed, or exported under the paid plan</li>
                  <li>After the 7-day refund window has expired</li>
                  <li>Requests citing dissatisfaction with the volume or type of data available (please review our free TRIAL plan before purchasing)</li>
                  <li>Requests due to change of mind after data access</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. How to Request a Refund</h2>
          <p>To request a refund, please:</p>
          <ol className="list-decimal list-inside mt-3 space-y-2">
            <li>Email{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>{" "}
              with subject: <code className="bg-gray-100 px-1 rounded">Refund Request – [Razorpay Order ID]</code>
            </li>
            <li>Include your registered email address and the reason for the refund request</li>
            <li>Our team will review and respond within <strong>2 working days</strong></li>
            <li>If approved, the refund will be processed within <strong>5–7 working days</strong> to your original payment method</li>
          </ol>
          <p className="mt-3 text-gray-500">
            Razorpay refunds are reflected in your bank account within 5–7 business days depending on your bank. UPI refunds may take up to 3 business days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Partial Refunds</h2>
          <p>
            We do not issue partial refunds for unused days of a subscription period. If you cancel mid-period, your access continues until the period end and no partial refund is issued. This is because subscription plans are billed as a whole period.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Free Trial Plan</h2>
          <p>
            SCM INSIGHTS offers a <strong>free TRIAL plan</strong> that allows you to explore the platform with limited access before purchasing. We strongly recommend using the TRIAL plan to evaluate the platform before making a payment.
          </p>
          <p className="mt-2">
            The TRIAL plan incurs no cost and no payment is required. No refund requests are applicable to the TRIAL plan.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. GST on Refunds</h2>
          <p>
            Refunds are processed for the full amount paid, inclusive of GST. The Company will reverse the corresponding GST transaction as per applicable GST regulations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Consumer Rights</h2>
          <p>
            This policy does not limit your statutory rights under the <strong>Consumer Protection Act 2019</strong>. If you believe you have a valid consumer grievance, you may also file a complaint with the appropriate Consumer Forum in India.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contact for Refund Disputes</h2>
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-1">
            <p><strong>Email:</strong>{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>
            </p>
            <p><strong>Response time:</strong> 2 working days</p>
            <p><strong>Refund processing time:</strong> 5–7 working days after approval</p>
            <p className="mt-2 text-xs text-gray-500">
              For unresolved disputes, refer to our{" "}
              <Link href="/terms-of-use" className="text-blue-600 underline">Terms of Service</Link>{" "}
              for the dispute resolution process.
            </p>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}
