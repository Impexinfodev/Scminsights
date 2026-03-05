"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans antialiased">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <span className="text-6xl font-bold text-red-500">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Critical error
          </h1>
          <p className="text-gray-600 mb-8">
            A critical application error occurred. Please refresh the page. If
            the problem continues, contact{" "}
            <a
              href="mailto:aashita@aashita.ai"
              className="text-blue-600 hover:underline"
            >
              aashita@aashita.ai
            </a>
            .
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Go to homepage
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
