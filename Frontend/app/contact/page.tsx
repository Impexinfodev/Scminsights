import { Metadata } from "next";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us | SCM INSIGHTS – Get in Touch",
  description:
    "Contact SCM INSIGHTS for trade data inquiries, partnership opportunities, or support. We help businesses access verified buyer & supplier data from 209+ countries. A product by Aashita Technosoft Pvt. Ltd.",
  keywords: [
    "contact scm insights",
    "trade data support",
    "global trade help",
    "import export inquiries",
    "scm insights support",
    "buyer supplier data contact",
  ],
  openGraph: {
    title: "Contact Us | SCM INSIGHTS",
    description:
      "Get in touch with SCM INSIGHTS for trade intelligence support, partnerships, or inquiries about verified buyer & supplier data.",
    url: "https://scminsights.ai/contact",
    type: "website",
  },
  alternates: {
    canonical: "https://scminsights.ai/contact",
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
