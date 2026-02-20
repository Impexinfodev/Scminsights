import React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";
import ReduxProvider from "@/components/providers/ReduxProvider";

const baseUrl = "https://scminsights.com";

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
  authors: [{ name: "SCM INSIGHTS", url: baseUrl }],
  creator: "SCM INSIGHTS",
  publisher: "SCM INSIGHTS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      {
        rel: "android-chrome",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
      },
      {
        rel: "android-chrome",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
      },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "SCM INSIGHTS",
    title: "SCM INSIGHTS | Global Trade Intelligence Platform",
    description:
      "Access verified buyer and supplier data from 209+ countries. Discover importers, exporters with comprehensive trade analytics. Trusted by 10,000+ businesses.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SCM INSIGHTS - Global Trade Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SCM INSIGHTS | Global Trade Intelligence Platform",
    description:
      "Access verified buyer and supplier data from 209+ countries. Find trade partners with comprehensive analytics.",
    images: ["/og-image.png"],
    creator: "@scminsights",
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
  url: baseUrl,
  logo: `${baseUrl}/android-chrome-512x512.png`,
  description:
    "Global Trade Intelligence Platform providing verified buyer and supplier data from 209+ countries",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["English"],
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/buyer?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SCM INSIGHTS",
  url: baseUrl,
  description:
    "Access verified buyer and supplier data from 209+ countries. Discover trade partners with comprehensive analytics and contact details.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/buyer?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SCM INSIGHTS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "2150",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        
        <link rel="canonical" href={baseUrl} />
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
      <body className="font-[SFPRO] antialiased bg-white text-gray-900">
        <ReduxProvider>
          <ClientLayout>{children}</ClientLayout>
        </ReduxProvider>
      </body>
    </html>
  );
}
