import { Suspense } from "react";
import { Metadata } from "next";
import CheckoutPageClient from "./CheckoutPageClient";

export const metadata: Metadata = {
  title: "Checkout | Pay with Razorpay",
  description: "Complete your plan purchase securely with Razorpay (INR).",
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <span className="text-gray-500">Loading checkout…</span>
        </div>
      }
    >
      <CheckoutPageClient />
    </Suspense>
  );
}
