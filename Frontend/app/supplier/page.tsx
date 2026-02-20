import { Metadata } from "next";
import SupplierPageClient from "./SupplierPageClient";

export const metadata: Metadata = {
  title: "Global Suppliers Database | Find Verified Exporters",
  description:
    "Search verified suppliers & exporters from 209+ countries. Access supplier contact details, export history, product categories & trade verification for global sourcing.",
  keywords: [
    "suppliers database",
    "verified exporters",
    "global suppliers",
    "exporter directory",
    "supplier leads",
    "export data",
    "supplier contact details",
    "exporters list",
    "trade suppliers",
    "global sourcing",
  ],
  openGraph: {
    title: "Global Suppliers Database | Find Verified Exporters - SCM INSIGHTS",
    description:
      "Search verified suppliers & exporters from 209+ countries. Access supplier contact details & export history.",
    url: "https://scminsights.com/supplier",
    type: "website",
  },
  alternates: {
    canonical: "https://scminsights.com/supplier",
  },
};

export default function SupplierPage() {
  return <SupplierPageClient />;
}
