import { Metadata } from "next";
import PlanPageClient from "./PlanPageClient";

export const metadata: Metadata = {
  title: "My Plan | License & Upgrade",
  description: "View your current plan, trial limits, and upgrade options for SCM Insights.",
};

export default function PlanPage() {
  return <PlanPageClient />;
}
