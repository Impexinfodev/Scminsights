import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://scminsights.com";
  const currentDate = new Date().toISOString();

  // Main pages with high priority
  const mainPages = [
    { url: "", priority: 1.0, changeFrequency: "daily" as const },
    {
      url: "/buyers-directory",
      priority: 0.95,
      changeFrequency: "daily" as const,
    },
    { url: "/buyer", priority: 0.9, changeFrequency: "daily" as const },
    { url: "/supplier", priority: 0.9, changeFrequency: "daily" as const },
    { url: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/about", priority: 0.7, changeFrequency: "monthly" as const },
  ];

  // Legal pages
  const legalPages = [
    { url: "/policy", priority: 0.3, changeFrequency: "yearly" as const },
    { url: "/terms-of-use", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  const allPages = [...mainPages, ...legalPages];

  return allPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: currentDate,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
