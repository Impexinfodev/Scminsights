import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | SCM INSIGHTS",
  description:
    "Terms of Service for SCM INSIGHTS by Aashita Technosoft Pvt. Ltd. Governing law: India. Includes refund policy, GST disclosure, and dispute resolution.",
  alternates: { canonical: "https://scminsights.ai/terms-of-use" },
};

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-blue-50/50 to-white border-b border-gray-100 pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: March 2026 &nbsp;|&nbsp; Effective: March 2026
          </p>
          <p className="text-gray-600 mt-3 text-sm leading-relaxed">
            These Terms of Service (&quot;Terms&quot;) govern your use of SCM INSIGHTS operated by{" "}
            <strong>Aashita Technosoft Pvt. Ltd.</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;). By
            accessing or using our platform, you agree to be bound by these Terms.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10 text-gray-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing, registering, or using SCM INSIGHTS (the &quot;Platform&quot;), you confirm that you are at least 18 years of age, have the legal authority to enter into these Terms, and agree to be bound by them. If you are accessing the Platform on behalf of a business entity, you represent that you have authority to bind that entity to these Terms.
          </p>
          <p className="mt-2">
            If you do not agree to these Terms, you must not use our Platform or services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. About the Platform</h2>
          <p>
            SCM INSIGHTS is a B2B trade intelligence platform that provides access to import-export trade data, buyer and supplier directories, HS code information, and analytics tools. The Platform is operated by:
          </p>
          <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1">
            <p><strong>Aashita Technosoft Pvt. Ltd.</strong></p>
            <p>Email:{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>
            </p>
            <p>Website:{" "}
              <Link href="https://scminsights.ai" className="text-blue-600 underline">scminsights.ai</Link>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Registration</h2>
          <p>
            To access paid or restricted features, you must register for an account. You agree to:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li>Provide accurate, complete, and up-to-date information</li>
            <li>Maintain the confidentiality of your login credentials</li>
            <li>Notify us immediately of any unauthorised access to your account</li>
            <li>Not share your account with any third party</li>
            <li>Not create multiple accounts for the same individual or entity without prior written consent</li>
          </ul>
          <p className="mt-2">
            We reserve the right to suspend or terminate accounts that violate these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Permitted Use &amp; Restrictions</h2>
          <p>
            SCM INSIGHTS grants you a limited, non-exclusive, non-transferable, revocable licence to use the Platform for lawful B2B trade intelligence purposes. You agree not to:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li>Use automated scripts, bots, scrapers, or crawlers to access the Platform</li>
            <li>Redistribute, resell, sublicense, or commercially exploit data obtained from the Platform without our prior written consent</li>
            <li>Use the Platform for any unlawful purpose, including violation of the IT Act 2000 or any other applicable Indian law</li>
            <li>Reverse engineer, decompile, or attempt to extract source code from the Platform</li>
            <li>Upload or transmit malware, viruses, or any harmful code</li>
            <li>Attempt to gain unauthorised access to our systems or databases</li>
            <li>Use the data obtained to harass, spam, or contact individuals without lawful basis</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Plans, Pricing &amp; Payments</h2>
          <p>
            SCM INSIGHTS offers subscription plans with different levels of access. All prices are displayed in Indian Rupees (INR) inclusive of applicable taxes unless otherwise stated.
          </p>
          <ul className="list-disc list-inside mt-3 space-y-2">
            <li>Payments are processed securely through <strong>Razorpay</strong>. Accepted payment methods include UPI, Net Banking, Credit/Debit Cards, and Wallets.</li>
            <li>Subscriptions are activated upon successful payment confirmation.</li>
            <li>We issue GST-compliant tax invoices upon request. Please ensure your GST number is correctly entered in your profile to receive B2B invoices.</li>
            <li>Plan prices are subject to change. We will provide at least 30 days&apos; notice before any price change takes effect for existing subscribers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Refund &amp; Cancellation Policy</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="font-semibold text-amber-800 mb-1">Important: Please read this section carefully before making a purchase.</p>
          </div>
          <p><strong>Cancellation:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li>You may cancel your subscription at any time by contacting us at{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>.
            </li>
            <li>Upon cancellation, access to paid features continues until the end of the current billing period. No prorated refund is issued for unused days in the current period.</li>
          </ul>
          <p className="mt-4"><strong>Refunds:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li><strong>7-day refund window:</strong> If you have not accessed or downloaded any data records under your paid plan, you may request a full refund within 7 days of payment by emailing us with your order ID.</li>
            <li><strong>Technical failure:</strong> If a payment was charged but the plan was not activated due to a technical error on our part, a full refund will be issued within 7 working days.</li>
            <li><strong>Duplicate payments:</strong> Duplicate charges will be refunded in full within 7 working days upon verification.</li>
            <li><strong>No refund:</strong> Refunds are not applicable once data records have been accessed, downloaded, or exported, or after the 7-day refund window has expired.</li>
          </ul>
          <p className="mt-3">
            To request a refund, email{" "}
            <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>{" "}
            with subject line &quot;Refund Request – [Order ID]&quot;. Refunds are processed to the original payment method within 5-7 working days. See also our{" "}
            <Link href="/refund-policy" className="text-blue-600 underline">Refund &amp; Cancellation Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. GST &amp; Taxation</h2>
          <p>
            All applicable Goods and Services Tax (GST) is included in or added to the displayed price as required by Indian law. SCM INSIGHTS is registered under GST. A GST-compliant tax invoice will be issued for all paid plan purchases. For B2B purchases, please enter your GSTIN in your account profile to receive an appropriate tax invoice for Input Tax Credit (ITC) claims.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
          <p>
            All software, content, trade data compilations, design elements, logos, and features of the Platform are the exclusive intellectual property of Aashita Technosoft Pvt. Ltd. and are protected under applicable Indian and international intellectual property laws, including the Copyright Act 1957 (India).
          </p>
          <p className="mt-2">
            You are granted a limited licence to access and use data for your internal business purposes only. You may not reproduce, distribute, publicly display, or create derivative works from our Platform content without prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Data Accuracy Disclaimer</h2>
          <p>
            Trade data on SCM INSIGHTS is sourced from publicly available import-export records, government databases, and third-party data providers. While we endeavour to maintain accuracy, we do not warrant that all data is complete, accurate, or up to date. The data is provided &quot;as is&quot; for informational and business intelligence purposes only.
          </p>
          <p className="mt-2">
            You are solely responsible for verifying the accuracy of any information before making business decisions based on it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable Indian law, Aashita Technosoft Pvt. Ltd. shall not be liable for:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li>Any indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, business, or data arising from use of or inability to use the Platform</li>
            <li>Decisions made based on data obtained from the Platform</li>
            <li>Interruptions or errors in the Platform</li>
          </ul>
          <p className="mt-2">
            Our total aggregate liability to you for any claim arising from these Terms shall not exceed the amount paid by you to us in the 3 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Aashita Technosoft Pvt. Ltd., its directors, officers, employees, and agents from any claims, damages, losses, and expenses (including reasonable legal fees) arising from your use of the Platform, violation of these Terms, or infringement of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Termination</h2>
          <p>
            We may suspend or terminate your account and access to the Platform at any time, with or without notice, if you violate these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Platform ceases immediately. Provisions of these Terms that by their nature should survive termination shall do so, including Sections 8, 10, 11, 13, 14, and 15.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Privacy</h2>
          <p>
            Your use of the Platform is also governed by our{" "}
            <Link href="/policy" className="text-blue-600 underline">Privacy Policy</Link>, which is incorporated into these Terms by reference and complies with India&apos;s DPDP Act 2023.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Governing Law &amp; Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the <strong>laws of India</strong>, including but not limited to the Information Technology Act 2000, the Contract Act 1872, the Consumer Protection Act 2019, and the DPDP Act 2023.
          </p>
          <p className="mt-2">
            Any dispute arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>India</strong>. Before resorting to litigation, the parties agree to attempt to resolve disputes amicably through negotiation within 30 days of written notice of a dispute.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Dispute Resolution</h2>
          <p>
            If a dispute cannot be resolved amicably within 30 days, either party may refer the matter to arbitration under the <strong>Arbitration and Conciliation Act 1996 (India)</strong>. The arbitration shall be conducted by a sole arbitrator mutually agreed upon by the parties, in the English language, and the seat of arbitration shall be India.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">16. IT Act 2000 Compliance</h2>
          <p>
            We comply with the Information Technology Act, 2000 and the rules framed thereunder, including the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021. In our capacity as an intermediary, we are not liable for third-party content or data unless we have actual knowledge of unlawful content and fail to act expeditiously upon receiving notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">17. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be communicated by email or a prominent notice on the Platform at least 7 days before they take effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">18. Contact &amp; Grievances</h2>
          <p>For questions about these Terms, refund requests, or grievances, contact us:</p>
          <div className="mt-3 space-y-1">
            <p><strong>Email:</strong>{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>
            </p>
            <p><strong>Contact form:</strong>{" "}
              <Link href="/contact" className="text-blue-600 underline">scminsights.ai/contact</Link>
            </p>
            <p><strong>Refund Policy:</strong>{" "}
              <Link href="/refund-policy" className="text-blue-600 underline">scminsights.ai/refund-policy</Link>
            </p>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}
