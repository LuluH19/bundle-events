import type { MetadataRoute } from "next";
import { buildManifest } from "@/src/utils/seo";

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest();
}
