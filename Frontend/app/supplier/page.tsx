import { Metadata } from "next";
import SupplierPageClient from "./SupplierPageClient";

const baseUrl = "https://scminsights.ai";

export const metadata: Metadata = {
  title: "Search Suppliers | Find Verified Exporters & Manufacturers – SCM INSIGHTS",
  description:
    "Search verified suppliers and exporters from 209+ countries on SCM INSIGHTS. Filter by country, HS code, product category, and export volume. Access supplier contact details, export history, and trade data.",
  keywords: [
    "search suppliers",
    "find exporters",
    "verified exporters",
    "suppliers database",
    "global suppliers",
    "exporter directory",
    "supplier leads",
    "export data",
    "supplier contact details",
    "exporters list",
    "trade suppliers",
    "global sourcing",
    "manufacturer search",
    "export HS code search",
    "supplier trade history",
    "international exporters",
    "supplier verification",
    "SCM INSIGHTS suppliers",
    "b2b suppliers",
    "sourcing platform India",
  ],
  openGraph: {
    title: "Search Suppliers | Find Verified Exporters – SCM INSIGHTS",
    description:
      "Find verified suppliers and exporters from 209+ countries. Search by country, HS code, or product. Access supplier contact details and export history on SCM INSIGHTS.",
    url: `${baseUrl}/supplier`,
    type: "website",
    siteName: "SCM INSIGHTS",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Search Suppliers – SCM INSIGHTS Global Trade Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@scminsights",
    creator: "@scminsights",
    title: "Search Suppliers | Find Verified Exporters – SCM INSIGHTS",
    description:
      "Find verified exporters from 209+ countries by country, HS code, or product. Access supplier contact details and export history.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/supplier`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const supplierSearchJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Search Suppliers – SCM INSIGHTS",
  description: "Search verified suppliers and exporters from 209+ countries on SCM INSIGHTS.",
  url: `${baseUrl}/supplier`,
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Search Suppliers", item: `${baseUrl}/supplier` },
    ],
  },
};

export default function SupplierPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(supplierSearchJsonLd) }}
      />
      <SupplierPageClient />
    </>
  );
}
