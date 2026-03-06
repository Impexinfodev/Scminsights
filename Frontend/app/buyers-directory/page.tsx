import { Metadata } from "next";
import BuyersDirectoryPageClient from "./BuyersDirectoryPageClient";

const baseUrl = "https://scminsights.ai";

export const metadata: Metadata = {
  title: "Buyers Directory | Global Importers Database – SCM INSIGHTS",
  description:
    "Browse SCM INSIGHTS comprehensive buyers directory with verified importers worldwide. Filter by country, product, HS code, and industry. Access buyer contacts, IEC codes, and trade history from 209+ countries.",
  keywords: [
    "buyers directory",
    "importers database",
    "global buyers list",
    "verified buyers",
    "buyer contacts",
    "importer search",
    "trade directory",
    "b2b importers",
    "international buyers",
    "buyer verification",
    "IEC code database",
    "import company list",
    "buyer directory India",
    "verified importer list",
    "global trade directory",
    "buyers by HS code",
    "importers by country",
    "SCM INSIGHTS directory",
  ],
  openGraph: {
    title: "Buyers Directory | Global Importers Database – SCM INSIGHTS",
    description:
      "Browse verified importers worldwide. Filter by country, product, HS code, and industry. Access buyer contacts and trade history on SCM INSIGHTS.",
    url: `${baseUrl}/buyers-directory`,
    type: "website",
    siteName: "SCM INSIGHTS",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Buyers Directory – SCM INSIGHTS Global Importers Database",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@scminsights",
    creator: "@scminsights",
    title: "Buyers Directory | Global Importers Database – SCM INSIGHTS",
    description:
      "Browse verified importers worldwide filtered by country, HS code, and product on SCM INSIGHTS.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/buyers-directory`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const directoryJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Buyers Directory – SCM INSIGHTS",
  description: "Comprehensive buyers directory with verified importers from 209+ countries.",
  url: `${baseUrl}/buyers-directory`,
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Buyers Directory", item: `${baseUrl}/buyers-directory` },
    ],
  },
};

export default function BuyersDirectoryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directoryJsonLd) }}
      />
      <BuyersDirectoryPageClient />
    </>
  );
}
