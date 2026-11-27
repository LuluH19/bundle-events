import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { siteConfig } from "@/src/config";
import { buildJsonLd, serializeJsonLd } from "@/src/utils/seo";
import "../styles/globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: siteConfig.keywords,
  category: "travel",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  icons: {
    icon: [
      { url: "/favicon/logo-star.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/favicon/logo-star-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon/logo-star-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon/logo-star-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon/logo-star-96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon/logo-star.ico", sizes: "16x16 32x32 48x48" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${figtree.variable} ${bricolage.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildJsonLd()) }} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
