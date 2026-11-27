import type { MetadataRoute } from "next";
import { buildRobots } from "@/src/utils/seo";

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
