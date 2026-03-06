import { Metadata } from "next";
import HsnPageClient from "./HsnPageClient";

const baseUrl = "https://scminsights.ai";

export const metadata: Metadata = {
  title: "HS Code Lookup | HSN Code Search with GST Tax Rates – SCM INSIGHTS",
  description:
    "Free HS code lookup and HSN code search tool by SCM INSIGHTS. Find harmonized system codes with descriptions, GST tax rates, import duties, and trade classification for customs and import-export.",
  keywords: [
    "HS code lookup",
    "HSN code search",
    "harmonized system code",
    "GST tax rates",
    "HS code database",
    "HSN code finder",
    "import duty HS code",
    "customs tariff code",
    "product HS code",
    "HS code India",
    "HSN code India",
    "chapter heading HS",
    "commodity code search",
    "trade classification code",
    "HS code description",
    "export HS code",
    "import HS code",
    "GST HSN code",
    "SCM INSIGHTS HSN",
    "scminsights HS code",
  ],
  openGraph: {
    title: "HS Code Lookup | HSN Code Search with GST Rates – SCM INSIGHTS",
    description:
      "Free HS code and HSN code search with descriptions, GST rates, and trade data. Powered by SCM INSIGHTS – Global Trade Intelligence Platform.",
    url: `${baseUrl}/hsn`,
    type: "website",
    siteName: "SCM INSIGHTS",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "HS Code Lookup – SCM INSIGHTS Trade Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@scminsights",
    creator: "@scminsights",
    title: "HS Code Lookup | HSN Code Search – SCM INSIGHTS",
    description:
      "Free HSN/HS code lookup with GST rates and trade classification. Powered by SCM INSIGHTS.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/hsn`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HsnPage() {
  return <HsnPageClient />;
}
