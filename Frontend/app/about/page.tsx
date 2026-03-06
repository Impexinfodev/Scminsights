import { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

const baseUrl = "https://scminsights.ai";

export const metadata: Metadata = {
  title: "About SCM INSIGHTS | Global Trade Intelligence by Aashita Technosoft",
  description:
    "Learn about SCM INSIGHTS – a global trade intelligence platform by Aashita Technosoft Pvt. Ltd. (aashita.ai). We provide verified buyer & supplier data from 209+ countries, HS code lookup, and import-export analytics for businesses worldwide.",
  keywords: [
    "about SCM INSIGHTS",
    "scminsights about",
    "Aashita Technosoft",
    "aashita.ai",
    "global trade intelligence company",
    "import export data company",
    "trade data provider India",
    "supply chain intelligence platform",
    "verified buyers suppliers company",
    "international trade platform",
    "trade intelligence India",
    "who is scminsights",
    "scminsights company",
  ],
  openGraph: {
    title: "About SCM INSIGHTS | Global Trade Intelligence by Aashita Technosoft",
    description:
      "SCM INSIGHTS by Aashita Technosoft Pvt. Ltd. – Verified buyers & suppliers data from 209+ countries with real-time trade analytics, HS code lookup, and import-export intelligence.",
    url: `${baseUrl}/about`,
    type: "website",
    siteName: "SCM INSIGHTS",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "About SCM INSIGHTS – Global Trade Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@scminsights",
    creator: "@scminsights",
    title: "About SCM INSIGHTS | Global Trade Intelligence by Aashita Technosoft",
    description:
      "SCM INSIGHTS by Aashita Technosoft – verified trade data from 209+ countries for importers, exporters, and global sourcing professionals.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/about`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About SCM INSIGHTS",
  description:
    "SCM INSIGHTS is a global trade intelligence platform by Aashita Technosoft Pvt. Ltd. providing verified buyer and supplier data from 209+ countries.",
  url: `${baseUrl}/about`,
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "About Us", item: `${baseUrl}/about` },
    ],
  },
  mainEntity: {
    "@type": "Organization",
    name: "SCM INSIGHTS",
    legalName: "Aashita Technosoft Pvt. Ltd.",
    url: baseUrl,
    foundingDate: "2024",
    description:
      "Global Trade Intelligence Platform providing verified buyer and supplier data from 209+ countries.",
    parentOrganization: {
      "@type": "Organization",
      name: "Aashita Technosoft Pvt. Ltd.",
      url: "https://aashita.ai",
    },
    sameAs: [
      "https://www.linkedin.com/company/scminsights",
      "https://x.com/scminsights",
      "https://aashita.ai",
    ],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <AboutPageClient />
    </>
  );
}
