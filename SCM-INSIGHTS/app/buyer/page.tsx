import { Metadata } from "next";
import BuyerPageClient from "./BuyerPageClient";

export const metadata: Metadata = {
  title: "Global Buyers Database | Find Verified Importers",
  description:
    "Access comprehensive buyers database with verified importers from 209+ countries. Find buyer contact details, import history, HS codes & shipment data for your business.",
  keywords: [
    "buyers database",
    "verified importers",
    "global buyers",
    "importer directory",
    "buyer leads",
    "import data",
    "buyer contact details",
    "importers list",
    "trade buyers",
    "b2b buyers",
  ],
  openGraph: {
    title: "Global Buyers Database | Find Verified Importers - SCM INSIGHTS",
    description:
      "Access comprehensive buyers database with verified importers from 209+ countries. Find buyer contact details & import history.",
    url: "https://scminsights.com/buyer",
    type: "website",
  },
  alternates: {
    canonical: "https://scminsights.com/buyer",
  },
};

export default function BuyerPage() {
  return <BuyerPageClient />;
}
