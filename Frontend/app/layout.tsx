import React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";
import ReduxProvider from "@/components/providers/ReduxProvider";
import CookieConsent from "@/components/CookieConsent";

const baseUrl = "https://scminsights.ai";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "SCM INSIGHTS | Global Trade Intelligence Platform",
    template: "%s | SCM INSIGHTS",
  },
  description:
    "SCM INSIGHTS by Aashita Technosoft – Verified buyer and supplier data from 209+ countries. Discover importers, exporters, HS codes and trade analytics. Trusted global trade intelligence platform.",
  keywords: [
    "SCM INSIGHTS",
    "scminsights",
    "scminsights.ai",
    "global trade intelligence",
    "buyers directory",
    "suppliers database",
    "verified importers",
    "verified exporters",
    "import export data",
    "trade analytics",
    "buyer search",
    "supplier search",
    "international trade",
    "trade partners",
    "global sourcing",
    "supply chain intelligence",
    "trade data platform",
    "business directory",
    "Aashita Technosoft",
    "HS code search",
    "HSN code lookup",
    "IEC code search",
  ],
  authors: [{ name: "Aashita Technosoft Pvt. Ltd.", url: "https://aashita.ai" }],
  creator: "Aashita Technosoft Pvt. Ltd.",
  publisher: "SCM INSIGHTS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", rel: "icon" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", rel: "icon" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: baseUrl,
    siteName: "SCM INSIGHTS",
    title: "SCM INSIGHTS | Global Trade Intelligence Platform",
    description:
      "Access verified buyer and supplier data from 209+ countries. Discover importers, exporters with comprehensive trade analytics. A product by Aashita Technosoft Pvt. Ltd.",
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
      "Access verified buyer and supplier data from 209+ countries. Find trade partners with comprehensive analytics.",
    images: [`${baseUrl}/og-image.png`],
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
  alternates: {
    canonical: baseUrl,
    languages: {
      "en-IN": baseUrl,
      "en": baseUrl,
    },
  },
  category: "business",
};

// Organization JSON-LD – rich entity data for Google Knowledge Graph
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${baseUrl}/#organization`,
  name: "SCM INSIGHTS",
  legalName: "Aashita Technosoft Pvt. Ltd.",
  alternateName: ["SCMInsights", "scminsights.ai"],
  url: baseUrl,
  logo: {
    "@type": "ImageObject",
    url: `${baseUrl}/favicon.svg`,
    width: "512",
    height: "512",
  },
  image: `${baseUrl}/og-image.png`,
  description:
    "Global Trade Intelligence Platform providing verified buyer and supplier data from 209+ countries. HS code lookup, import-export analytics, and trade partner discovery. A product by Aashita Technosoft Pvt. Ltd.",
  foundingDate: "2024",
  country: "IN",
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.linkedin.com/company/scminsights",
    "https://x.com/scminsights",
    "https://aashita.ai",
  ],
  parentOrganization: {
    "@type": "Organization",
    name: "Aashita Technosoft Pvt. Ltd.",
    url: "https://aashita.ai",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `${baseUrl}/contact`,
      availableLanguage: ["English"],
    },
    {
      "@type": "ContactPoint",
      contactType: "technical support",
      url: `${baseUrl}/contact`,
      availableLanguage: ["English"],
    },
  ],
};

// WebSite JSON-LD – enables Google Sitelinks Search Box
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  name: "SCM INSIGHTS",
  alternateName: "scminsights.ai",
  url: baseUrl,
  description:
    "Access verified buyer and supplier data from 209+ countries. Discover importers, exporters, and trade partners with comprehensive analytics.",
  publisher: {
    "@id": `${baseUrl}/#organization`,
  },
  inLanguage: "en-IN",
  potentialAction: [
    {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/buyer?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/supplier?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  ],
};

// SoftwareApplication JSON-LD – helps in app search results
const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SCM INSIGHTS",
  alternateName: "SCMInsights Trade Intelligence Platform",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Trade Intelligence",
  operatingSystem: "Web",
  url: baseUrl,
  author: {
    "@id": `${baseUrl}/#organization`,
  },
  publisher: {
    "@id": `${baseUrl}/#organization`,
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    category: "Free Trial",
    url: `${baseUrl}/plans`,
  },
  featureList: [
    "209+ Country Trade Data Coverage",
    "Verified Buyers Database",
    "Verified Suppliers Database",
    "HS Code / HSN Code Lookup",
    "Import Export Analytics",
    "Trade Partner Discovery",
    "IEC Code Search",
    "Shipment History",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Hreflang for India targeting */}
        <link rel="alternate" hrefLang="en-IN" href={baseUrl} />
        <link rel="alternate" hrefLang="en" href={baseUrl} />
        <link rel="alternate" hrefLang="x-default" href={baseUrl} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
      </head>
      <body className="font-[SFPRO] antialiased bg-white text-gray-900" suppressHydrationWarning>
        <noscript>
          <div style={{ padding: "16px", background: "#fff3cd", color: "#856404", textAlign: "center", fontFamily: "sans-serif" }}>
            SCM INSIGHTS requires JavaScript to be enabled. Please enable JavaScript in your browser settings and reload the page.
          </div>
        </noscript>
        <ReduxProvider>
          <ClientLayout>{children}</ClientLayout>
          <CookieConsent />
        </ReduxProvider>
      </body>
    </html>
  );
}
