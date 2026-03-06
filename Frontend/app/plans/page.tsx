import { Metadata } from "next";
import PlansPageClient from "./PlansPageClient";

const baseUrl = "https://scminsights.ai";

export const metadata: Metadata = {
  title: "Plans & Pricing | SCM INSIGHTS – Trade Intelligence Platform",
  description:
    "Compare SCM INSIGHTS pricing plans. Access verified buyers directory, supplier search, HS code lookup, and global import-export data from 209+ countries. Free trial available – no credit card required.",
  keywords: [
    "SCM INSIGHTS pricing",
    "scminsights plans",
    "trade data plans",
    "trade intelligence pricing",
    "buyer supplier data access",
    "import export data pricing",
    "global trade platform plans",
    "free trial trade data",
    "trade data subscription India",
    "verified buyer access pricing",
    "global sourcing platform pricing",
  ],
  openGraph: {
    title: "Plans & Pricing | SCM INSIGHTS – Trade Intelligence Platform",
    description:
      "Compare SCM INSIGHTS plans. Access verified buyers, suppliers, HS codes, and trade analytics from 209+ countries. Free trial available.",
    url: `${baseUrl}/plans`,
    type: "website",
    siteName: "SCM INSIGHTS",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SCM INSIGHTS Plans & Pricing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@scminsights",
    creator: "@scminsights",
    title: "Plans & Pricing | SCM INSIGHTS",
    description:
      "Compare SCM INSIGHTS plans. Access verified buyers, suppliers, and 209+ country trade data. Free trial available.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/plans`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const plansJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "SCM INSIGHTS Plans & Pricing",
  description: "Pricing plans for SCM INSIGHTS trade intelligence platform.",
  url: `${baseUrl}/plans`,
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Plans & Pricing", item: `${baseUrl}/plans` },
    ],
  },
};

const plansFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does SCM INSIGHTS offer a free trial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, SCM INSIGHTS offers a free trial plan that lets you explore buyers and suppliers data without a credit card. You can upgrade to a paid plan anytime for full access to all 50M+ trade records.",
      },
    },
    {
      "@type": "Question",
      name: "What payment methods does SCM INSIGHTS accept?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SCM INSIGHTS accepts all major payment methods via Razorpay, including UPI, credit cards, debit cards, net banking, and wallets for Indian users.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel my SCM INSIGHTS subscription?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, you can cancel your subscription at any time. Please refer to our Refund Policy page for detailed terms on cancellations and refunds.",
      },
    },
  ],
};

export default function PlansPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(plansJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(plansFaqJsonLd) }}
      />
      <PlansPageClient />
    </>
  );
}
