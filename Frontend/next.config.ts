import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
const isDev = process.env.NODE_ENV !== "production";

// Build connect-src entries from the configured backend URL
function getConnectSrcEntries(url: string): string {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin; // e.g. http://localhost:5001 or https://api.scminsights.ai
    // In dev also allow ws/wss for Turbopack HMR
    const wsOrigin = origin.replace(/^http/, "ws");
    return `${origin} ${wsOrigin}`;
  } catch {
    return "http://localhost:5001 ws://localhost:5001";
  }
}

const backendConnectSrc = getConnectSrcEntries(backendUrl);

// Turbopack dev server uses eval() for HMR; allow it only in development
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src ${scriptSrc};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://images.unsplash.com https://flagcdn.com https://*.unsplash.com;
  font-src 'self' data:;
  connect-src 'self' ${backendConnectSrc} https://api.scminsights.ai https://checkout.razorpay.com wss://api.razorpay.com${isDev ? " ws://localhost:* wss://localhost:*" : ""};
  frame-src https://checkout.razorpay.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
