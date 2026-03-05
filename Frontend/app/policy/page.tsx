import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | SCM INSIGHTS",
  description:
    "Privacy Policy of SCM INSIGHTS by Aashita Technosoft Pvt. Ltd. – compliant with India's Digital Personal Data Protection (DPDP) Act 2023.",
  alternates: { canonical: "https://scminsights.ai/policy" },
  robots: { index: true, follow: true },
};

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-blue-50/50 to-white border-b border-gray-100 pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: March 2026 &nbsp;|&nbsp; Effective: March 2026
          </p>
          <p className="text-gray-600 mt-3 text-sm leading-relaxed">
            This Privacy Policy is issued in compliance with India&apos;s{" "}
            <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>{" "}
            and the Information Technology Act, 2000 and rules framed thereunder.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10 text-gray-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Data Fiduciary – Who We Are</h2>
          <p>
            <strong>Aashita Technosoft Pvt. Ltd.</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;,
            or &quot;our&quot;) is the <strong>Data Fiduciary</strong> as defined under the
            DPDP Act 2023. We operate <strong>SCM INSIGHTS</strong> at{" "}
            <Link href="https://scminsights.ai" className="text-blue-600 underline">
              scminsights.ai
            </Link>
            .
          </p>
          <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1">
            <p><strong>Company:</strong> Aashita Technosoft Pvt. Ltd., India</p>
            <p><strong>Email:</strong>{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">
                aashita@aashita.ai
              </a>
            </p>
            <p><strong>Grievance Officer:</strong> See Section 14 below</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Personal Data We Collect</h2>
          <p>We collect personal data only to the extent necessary for the purposes described in Section 3. Categories we may collect:</p>
          <ul className="list-disc list-inside mt-3 space-y-2">
            <li><strong>Account data:</strong> Full name, email address, mobile number (with country code), company name, GST number (optional)</li>
            <li><strong>Authentication data:</strong> Hashed passwords, session tokens, account activation codes</li>
            <li><strong>Payment data:</strong> Plan selected, Razorpay order ID and payment ID. We do not store card numbers or UPI PINs — these are handled by Razorpay (PCI-DSS certified).</li>
            <li><strong>Usage data:</strong> Pages visited, HS code search queries, IP address, browser type, device type, session timestamps</li>
            <li><strong>Communication data:</strong> Messages submitted through our contact form, including name, email, and phone number</li>
            <li><strong>Business data:</strong> Company name, trade-related preferences</li>
          </ul>
          <p className="mt-3">We do <strong>not</strong> collect sensitive personal data such as caste, religion, health information, biometric data, or financial credentials beyond payment confirmation IDs.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Purpose of Processing &amp; Legal Basis</h2>
          <p>Under the DPDP Act 2023, we process your personal data only for the following specified purposes:</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b border-gray-200">Purpose</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b border-gray-200">Legal Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-3 px-4">Creating and managing your account</td><td className="py-3 px-4">Consent / Contractual necessity</td></tr>
                <tr><td className="py-3 px-4">Providing trade intelligence services</td><td className="py-3 px-4">Contractual necessity</td></tr>
                <tr><td className="py-3 px-4">Processing payments and issuing GST invoices</td><td className="py-3 px-4">Contractual necessity / Legal obligation</td></tr>
                <tr><td className="py-3 px-4">Sending transactional emails (activation, password reset)</td><td className="py-3 px-4">Contractual necessity</td></tr>
                <tr><td className="py-3 px-4">Responding to contact form inquiries</td><td className="py-3 px-4">Consent (explicit submission)</td></tr>
                <tr><td className="py-3 px-4">Improving our platform through analytics</td><td className="py-3 px-4">Legitimate interest</td></tr>
                <tr><td className="py-3 px-4">Complying with legal obligations under Indian law</td><td className="py-3 px-4">Legal obligation</td></tr>
                <tr><td className="py-3 px-4">Detecting and preventing fraud and security threats</td><td className="py-3 px-4">Legitimate interest / Legal obligation</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">We will not use your personal data for any purpose not listed above without obtaining fresh, specific consent from you.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Consent &amp; Withdrawal</h2>
          <p>
            By registering on SCM INSIGHTS, you provide free, specific, informed, and unambiguous consent for processing your personal data for the purposes listed above.
          </p>
          <p className="mt-2"><strong>Withdrawing consent:</strong> You may withdraw consent at any time by:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Emailing our Grievance Officer at{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>
            </li>
            <li>Requesting account deletion through your profile page</li>
          </ul>
          <p className="mt-2">
            Withdrawal of consent will not affect the legality of processing carried out before withdrawal. Withdrawal may prevent us from providing certain services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
          <p>We retain personal data only for as long as necessary for the stated purpose or as required by Indian law:</p>
          <ul className="list-disc list-inside mt-3 space-y-2">
            <li><strong>Account data:</strong> Duration of active account + 3 years after last activity</li>
            <li><strong>Payment/transaction records:</strong> 8 years (as required under GST Act, 2017 and Income Tax Act, 1961)</li>
            <li><strong>Session tokens:</strong> 30 days from session creation</li>
            <li><strong>Contact form submissions:</strong> 2 years from date of inquiry</li>
            <li><strong>Usage/analytics data:</strong> 12 months in aggregated, anonymised form</li>
          </ul>
          <p className="mt-3">After the retention period, data is securely deleted or anonymised.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Sharing of Personal Data</h2>
          <p>We do <strong>not</strong> sell your personal data. We may share it only with:</p>
          <ul className="list-disc list-inside mt-3 space-y-2">
            <li><strong>Razorpay Financial Solutions Pvt. Ltd.</strong> — Payment processing (PCI-DSS certified)</li>
            <li><strong>Email service providers</strong> — For transactional emails only (e.g., account activation, password reset)</li>
            <li><strong>Cloud infrastructure providers</strong> — For hosting the platform (data stored on servers in India wherever possible)</li>
            <li><strong>Legal / regulatory authorities</strong> — When required by law, court order, or directive of a competent Indian authority</li>
          </ul>
          <p className="mt-3">All processors are contractually bound to protect your data in accordance with applicable law.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cross-Border Data Transfers</h2>
          <p>
            We primarily store and process personal data on servers located in India. To the extent any data is transferred outside India (e.g., through certain email or analytics providers), such transfers are carried out in accordance with Section 16 of the DPDP Act 2023 and applicable government notifications, with appropriate contractual safeguards.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data Security</h2>
          <p>We implement reasonable security practices as required under Rule 3 of the IT (Reasonable Security Practices and Procedures) Rules 2011, including:</p>
          <ul className="list-disc list-inside mt-3 space-y-2">
            <li>TLS/HTTPS encryption for all data in transit</li>
            <li>bcrypt hashing for all user passwords (never stored in plaintext)</li>
            <li>HTTP-only, Secure, SameSite session cookies</li>
            <li>Rate limiting on authentication and sensitive endpoints</li>
            <li>CORS restrictions limiting API access to authorised origins</li>
            <li>Regular internal security reviews</li>
          </ul>
          <p className="mt-3">
            In the event of a personal data breach, we will notify affected Data Principals and report to the Data Protection Board of India within the timeframe mandated by applicable rules.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Your Rights as a Data Principal</h2>
          <p>Under the DPDP Act 2023, you have the following rights:</p>
          <ul className="list-disc list-inside mt-3 space-y-2">
            <li><strong>Right to information:</strong> Know what personal data we hold and how it is processed</li>
            <li><strong>Right to access:</strong> Obtain a summary of your personal data we process</li>
            <li><strong>Right to correction &amp; erasure:</strong> Correct inaccurate data or request deletion of your data (subject to lawful retention requirements)</li>
            <li><strong>Right to grievance redressal:</strong> File a complaint with our Grievance Officer (see Section 14)</li>
            <li><strong>Right to nominate:</strong> Nominate a person to exercise your rights in case of death or incapacity</li>
          </ul>
          <p className="mt-3">
            To exercise any right, contact our Grievance Officer. We will respond within <strong>30 days</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Cookies &amp; Tracking</h2>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li><strong>Essential cookies:</strong> HTTP-only session authentication cookies. Required for login functionality.</li>
            <li><strong>Analytics:</strong> Aggregated, anonymised usage data to improve our platform. No cross-site tracking or third-party ad targeting.</li>
          </ul>
          <p className="mt-3">You may manage cookies through your browser settings. Disabling essential cookies will prevent you from logging in.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Children&apos;s Data</h2>
          <p>
            SCM INSIGHTS is a B2B platform intended solely for business users who are 18 years of age or older. We do not knowingly collect personal data from minors. As required by the DPDP Act 2023, we will not process data of a child without verifiable parental consent. If you believe we have inadvertently collected such data, please contact us immediately for deletion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Third-Party Links</h2>
          <p>Our platform may contain links to external websites. We are not responsible for the privacy practices of third-party websites. We encourage you to review their privacy policies independently.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to This Policy</h2>
          <p>
            We may update this Policy from time to time. Material changes will be notified by email or a prominent notice on our platform at least 7 days before taking effect. Continued use of our services after the effective date constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Grievance Officer</h2>
          <p>
            In accordance with the DPDP Act 2023 and the IT Act 2000, Aashita Technosoft Pvt. Ltd. has designated the following Grievance Officer:
          </p>
          <div className="mt-3 bg-blue-50 rounded-xl p-5 border border-blue-100 space-y-1">
            <p><strong>Name:</strong> Grievance Officer, Aashita Technosoft Pvt. Ltd.</p>
            <p><strong>Email:</strong>{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>
            </p>
            <p><strong>Response timeframe:</strong> Within 30 days of receiving a complaint</p>
            <p className="mt-2 text-xs text-gray-600">
              If unsatisfied with our response, you may escalate to the{" "}
              <strong>Data Protection Board of India</strong> once constituted under the DPDP Act 2023.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Contact Us</h2>
          <p>For questions, concerns, or to exercise your rights under this policy:</p>
          <div className="mt-3 space-y-1">
            <p><strong>Email:</strong>{" "}
              <a href="mailto:aashita@aashita.ai" className="text-blue-600 underline">aashita@aashita.ai</a>
            </p>
            <p><strong>Contact form:</strong>{" "}
              <Link href="/contact" className="text-blue-600 underline">scminsights.ai/contact</Link>
            </p>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}
