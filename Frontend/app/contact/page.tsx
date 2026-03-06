import { Metadata } from "next";
import ContactPageClient from "./ContactPageClient";

const baseUrl = "https://scminsights.ai";

export const metadata: Metadata = {
  title: "Contact Us | SCM INSIGHTS – Aashita Technosoft",
  description:
    "Contact SCM INSIGHTS by Aashita Technosoft Pvt. Ltd. for trade data inquiries, partnership opportunities, or support. Get in touch about verified buyer & supplier data from 209+ countries.",
  keywords: [
    "contact SCM INSIGHTS",
    "scminsights contact",
    "Aashita Technosoft contact",
    "trade data support",
    "global trade help",
    "import export inquiries",
    "SCM INSIGHTS support",
    "buyer supplier data contact",
    "trade intelligence support",
  ],
  openGraph: {
    title: "Contact Us | SCM INSIGHTS – Aashita Technosoft",
    description:
      "Get in touch with SCM INSIGHTS for trade intelligence support, partnerships, or inquiries about verified buyer & supplier data from 209+ countries.",
    url: `${baseUrl}/contact`,
    type: "website",
    siteName: "SCM INSIGHTS",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Contact SCM INSIGHTS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@scminsights",
    creator: "@scminsights",
    title: "Contact Us | SCM INSIGHTS",
    description:
      "Get in touch with SCM INSIGHTS for trade intelligence support, partnerships, or data inquiries.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/contact`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact SCM INSIGHTS",
  description: "Contact page for SCM INSIGHTS – Global Trade Intelligence Platform by Aashita Technosoft Pvt. Ltd.",
  url: `${baseUrl}/contact`,
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Contact", item: `${baseUrl}/contact` },
    ],
  },
  mainEntity: {
    "@type": "Organization",
    name: "SCM INSIGHTS",
    legalName: "Aashita Technosoft Pvt. Ltd.",
    url: baseUrl,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `${baseUrl}/contact`,
      availableLanguage: ["English"],
    },
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <ContactPageClient />
    </>
  );
}
