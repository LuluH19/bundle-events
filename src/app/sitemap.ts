import type { MetadataRoute } from "next";
import { getAllNews } from "@/src/services/news";
import { buildSitemap } from "@/src/utils/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(undefined, new Date(), getAllNews());
}
