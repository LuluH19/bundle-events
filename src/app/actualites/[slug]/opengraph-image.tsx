import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/src/config";
import { getAllNews, getNewsBySlug } from "@/src/services/news";
import { formatNewsDate } from "@/src/utils/news";

export const alt = "Actualité Bundle Events";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllNews().map((a) => ({ slug: a.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = getNewsBySlug((await params).slug);
  const star = await readFile(join(process.cwd(), "public/favicon/logo-star-light.svg"));
  const starSrc = `data:image/svg+xml;base64,${star.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: siteConfig.themeColor,
          padding: "64px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={starSrc} width={84} height={84} alt="" />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#F96C1A", letterSpacing: 4, textTransform: "uppercase" }}>Actualités</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: "#ffffff", lineHeight: 1.1, display: "flex" }}>
          {article?.title ?? siteConfig.name}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#c9c8e0" }}>
          <span>{article ? formatNewsDate(article.publishedAt) : ""}</span>
          <span style={{ color: "#ffffff", fontWeight: 700 }}>{siteConfig.name}</span>
        </div>
      </div>
    ),
    size
  );
}
