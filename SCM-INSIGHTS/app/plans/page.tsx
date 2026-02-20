import { Metadata } from "next";
import PlansPageClient from "./PlansPageClient";

export const metadata: Metadata = {
  title: "Plans & Pricing | SCM Insights",
  description: "View all plans and pricing. Directory, Buyers and Suppliers access. Sign up or upgrade.",
};

export default function PlansPage() {
  return <PlansPageClient />;
}
