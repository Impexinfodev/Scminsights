import { Metadata } from "next";
import PlansPageClient from "./PlansPageClient";

export const metadata: Metadata = {
  title: "Plans & Pricing | SCM INSIGHTS – Trade Intelligence Platform",
  description:
    "Compare SCM INSIGHTS plans and pricing. Get access to verified buyers directory, supplier search, and global import-export data from 209+ countries. Free trial available.",
  keywords: [
    "scm insights pricing",
    "trade data plans",
    "buyer supplier access",
    "import export data pricing",
    "global trade platform plans",
    "trade intelligence pricing",
    "free trial trade data",
  ],
  openGraph: {
    title: "Plans & Pricing | SCM INSIGHTS",
    description:
      "Compare plans for SCM INSIGHTS. Access verified buyers, suppliers, and trade data from 209+ countries.",
    url: "https://scminsights.ai/plans",
    type: "website",
  },
  alternates: {
    canonical: "https://scminsights.ai/plans",
  },
};

export default function PlansPage() {
  return <PlansPageClient />;
}
