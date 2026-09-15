import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://semio360.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://semio360.com/login",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://semio360.com/signup",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
