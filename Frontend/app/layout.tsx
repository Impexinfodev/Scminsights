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
    "Access verified buyer and supplier data from 209+ countries. Discover importers, exporters with comprehensive trade analytics and contact details. Trusted by 10,000+ businesses worldwide.",
  keywords: [
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
        alt: "SCM INSIGHTS – Global Trade Intelligence Platform",
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
  },
  category: "business",
};

// JSON-LD Structured Data
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SCM INSIGHTS",
  legalName: "Aashita Technosoft Pvt. Ltd.",
  url: baseUrl,
  logo: `${baseUrl}/favicon.svg`,
  description:
    "Global Trade Intelligence Platform providing verified buyer and supplier data from 209+ countries. A product by Aashita Technosoft Pvt. Ltd.",
  foundingDate: "2024",
  sameAs: [
    "https://www.linkedin.com/company/scminsights",
    "https://x.com/scminsights",
  ],
  parentOrganization: {
    "@type": "Organization",
    name: "Aashita Technosoft Pvt. Ltd.",
    url: "https://aashita.ai",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    url: `${baseUrl}/contact`,
    availableLanguage: ["English"],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SCM INSIGHTS",
  url: baseUrl,
  description:
    "Access verified buyer and supplier data from 209+ countries. Discover importers, exporters, and trade partners with comprehensive analytics.",
  publisher: {
    "@type": "Organization",
    name: "Aashita Technosoft Pvt. Ltd.",
    url: "https://aashita.ai",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${baseUrl}/buyer?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SCM INSIGHTS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: baseUrl,
  author: {
    "@type": "Organization",
    name: "Aashita Technosoft Pvt. Ltd.",
    url: "https://aashita.ai",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    category: "Free Trial",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />

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
