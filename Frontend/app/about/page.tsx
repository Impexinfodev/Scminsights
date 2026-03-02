import { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

export const metadata: Metadata = {
  title: "About Us | SCM INSIGHTS – Global Trade Intelligence by Aashita Technosoft",
  description:
    "Learn about SCM INSIGHTS, a global trade intelligence platform by Aashita Technosoft Pvt. Ltd. (aashita.ai). We provide verified buyer & supplier data from 209+ countries, empowering businesses with import-export analytics.",
  keywords: [
    "about scm insights",
    "global trade intelligence",
    "aashita technosoft",
    "import export data company",
    "trade data provider",
    "supply chain intelligence",
    "verified buyers suppliers",
    "international trade platform",
  ],
  openGraph: {
    title: "About SCM INSIGHTS | Global Trade Intelligence Platform",
    description:
      "SCM INSIGHTS by Aashita Technosoft Pvt. Ltd. helps businesses discover verified buyers & suppliers from 209+ countries with real-time trade analytics.",
    url: "https://scminsights.ai/about",
    type: "website",
  },
  alternates: {
    canonical: "https://scminsights.ai/about",
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
