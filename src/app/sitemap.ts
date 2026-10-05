import type { MetadataRoute } from "next";

import { INDEXABLE_PATHS, absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: "daily" as const,
    priority: path === "/" ? 1 : 0.8,
  }));
}
