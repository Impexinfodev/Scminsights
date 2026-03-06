import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

const baseUrl = "https://scminsights.ai";

export const metadata: Metadata = {
  title: "SCM INSIGHTS | Global Trade Intelligence Platform – Buyers & Suppliers Data",
  description:
    "SCM INSIGHTS by Aashita Technosoft – Access verified importers and exporters data from 209+ countries. Find buyers, suppliers, HS codes, and trade analytics. Trusted global trade intelligence platform.",
  keywords: [
    "SCM INSIGHTS",
    "scminsights",
    "scminsights.ai",
    "Aashita Technosoft",
    "global trade intelligence",
    "buyers database",
    "suppliers database",
    "verified importers",
    "verified exporters",
    "import export data",
    "trade analytics platform",
    "buyer search",
    "supplier search",
    "international trade platform",
    "HS code search",
    "HSN code lookup",
    "trade data India",
    "import export intelligence",
    "supply chain insights",
    "global sourcing platform",
    "IEC code importer",
    "trade partner finder",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: baseUrl,
    siteName: "SCM INSIGHTS",
    title: "SCM INSIGHTS | Global Trade Intelligence Platform",
    description:
      "Access verified buyer and supplier data from 209+ countries. Discover importers, exporters, trade analytics and HS code data. A product by Aashita Technosoft Pvt. Ltd.",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SCM INSIGHTS – Global Trade Intelligence Platform by Aashita Technosoft",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@scminsights",
    creator: "@scminsights",
    title: "SCM INSIGHTS | Global Trade Intelligence Platform",
    description:
      "Access verified buyer and supplier data from 209+ countries. Find trade partners with HS code analytics.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      "en-IN": baseUrl,
      "en": baseUrl,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// FAQ structured data for homepage – helps rank for "what is SCM INSIGHTS" and related queries
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is SCM INSIGHTS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SCM INSIGHTS is a global trade intelligence platform by Aashita Technosoft Pvt. Ltd. It provides verified buyer and supplier data from 209+ countries, including importer/exporter contact details, HS codes, shipment history, and real-time trade analytics.",
      },
    },
    {
      "@type": "Question",
      name: "How can I find buyers for my products using SCM INSIGHTS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use the Buyers Directory or Search Buyers feature on SCM INSIGHTS. Filter by country, HS code, product category, or company name to find verified importers with contact details and trade history from 209+ countries.",
      },
    },
    {
      "@type": "Question",
      name: "How can I find verified exporters and suppliers on SCM INSIGHTS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use the Search Suppliers feature to discover verified exporters by product, HS code, country, or trade volume. Access detailed supplier profiles with export history and contact information.",
      },
    },
    {
      "@type": "Question",
      name: "What countries does SCM INSIGHTS cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SCM INSIGHTS covers 209+ countries worldwide, including major trading nations like USA, China, Germany, India, UK, Japan, UAE, and more. The platform provides comprehensive import-export data across all continents.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial available on SCM INSIGHTS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, SCM INSIGHTS offers a free trial plan. You can sign up and explore verified buyers and suppliers data without a credit card. Paid plans are available for full access to all 50M+ trade records.",
      },
    },
    {
      "@type": "Question",
      name: "Who is behind SCM INSIGHTS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SCM INSIGHTS is a product of Aashita Technosoft Pvt. Ltd. (aashita.ai), an Indian technology company specializing in trade intelligence and supply chain analytics.",
      },
    },
    {
      "@type": "Question",
      name: "What is an HS code and how do I look it up on SCM INSIGHTS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An HS (Harmonized System) code is an internationally standardized system for classifying traded products. On SCM INSIGHTS, use the HSN Code Lookup tool to search HS codes with descriptions, GST rates, and import-export data.",
      },
    },
  ],
};

// BreadcrumbList for homepage
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: baseUrl,
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
