import { Metadata } from "next";
import HsnPageClient from "./HsnPageClient";

export const metadata: Metadata = {
  title: "HS Code Lookup | HSN Code Details With Tax Rates - SCM Insights",
  description:
    "Search HS codes with descriptions and GST tax rates. Find HSN codes for import-export and customs.",
  keywords: [
    "hs code lookup",
    "hsn code search",
    "harmonized system",
    "gst tax rates",
    "hs code database",
  ],
};

export default function HsnPage() {
  return <HsnPageClient />;
}
