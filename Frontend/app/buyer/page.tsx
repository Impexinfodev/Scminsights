import { Metadata } from "next";
import BuyerPageClient from "./BuyerPageClient";

const baseUrl = "https://scminsights.ai";

export const metadata: Metadata = {
  title: "Search Buyers | Find Verified Importers Worldwide – SCM INSIGHTS",
  description:
    "Search verified buyers and importers from 209+ countries on SCM INSIGHTS. Filter by country, HS code, product, and trade volume. Access importer contact details, IEC codes, and shipment history.",
  keywords: [
    "search buyers",
    "find importers",
    "verified importers",
    "buyers database",
    "global buyers",
    "importer directory",
    "buyer leads",
    "import data",
    "buyer contact details",
    "importers list",
    "trade buyers",
    "b2b buyers",
    "import export buyers",
    "IEC code importer",
    "buyer HS code search",
    "international importers",
    "buyer trade history",
    "buyer search India",
    "SCM INSIGHTS buyers",
  ],
  openGraph: {
    title: "Search Buyers | Find Verified Importers – SCM INSIGHTS",
    description:
      "Find verified importers from 209+ countries. Search by country, HS code, or product. Access buyer contact details and import history on SCM INSIGHTS.",
    url: `${baseUrl}/buyer`,
    type: "website",
    siteName: "SCM INSIGHTS",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Search Buyers – SCM INSIGHTS Global Trade Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@scminsights",
    creator: "@scminsights",
    title: "Search Buyers | Find Verified Importers – SCM INSIGHTS",
    description:
      "Find verified importers from 209+ countries by country, HS code, or product. Access buyer contact details and trade history.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/buyer`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const buyerSearchJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Search Buyers – SCM INSIGHTS",
  description: "Search verified buyers and importers from 209+ countries on SCM INSIGHTS.",
  url: `${baseUrl}/buyer`,
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Search Buyers", item: `${baseUrl}/buyer` },
    ],
  },
};

export default function BuyerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buyerSearchJsonLd) }}
      />
      <BuyerPageClient />
    </>
  );
}
