import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/src/config";

export const alt = "Bundle Events : ton trajet, ton hôtel et ton retour pour ton concert, ton match ou ton festival";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const star = await readFile(join(process.cwd(), "public/favicon/logo-star-light.svg"));
  const starSrc = `data:image/svg+xml;base64,${star.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: siteConfig.themeColor,
          padding: "0 80px",
          gap: 56,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={starSrc} width={300} height={300} alt="" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#F96C1A", letterSpacing: 4, textTransform: "uppercase" }}>
            Concerts · matchs · festivals
          </div>
          <div style={{ fontSize: 78, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, marginTop: 18 }}>
            {siteConfig.tagline}
          </div>
          <div style={{ fontSize: 32, color: "#c9c8e0", marginTop: 26, lineHeight: 1.3 }}>
            Trajet, hôtel près de la salle et retour, au même endroit.
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff", marginTop: 34 }}>{siteConfig.name}</div>
        </div>
      </div>
    ),
    size
  );
}
