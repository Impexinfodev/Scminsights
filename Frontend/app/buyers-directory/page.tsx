import { Metadata } from "next";
import BuyersDirectoryPageClient from "./BuyersDirectoryPageClient";

export const metadata: Metadata = {
  title: "Buyers Directory | Global Importers Database",
  description:
    "Browse comprehensive buyers directory with importers worldwide. Filter by country, product, HS code & industry. Access verified buyer contacts & trade history from 209+ countries.",
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
  ],
  openGraph: {
    title: "Buyers Directory | Global Importers Database - SCM INSIGHTS",
    description:
      "Browse comprehensive buyers directory with importers worldwide. Filter by country, product, HS code & industry.",
    url: "https://scminsights.com/buyers-directory",
    type: "website",
  },
  alternates: {
    canonical: "https://scminsights.com/buyers-directory",
  },
};

export default function BuyersDirectoryPage() {
  return <BuyersDirectoryPageClient />;
}
