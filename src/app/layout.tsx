import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
  title: "Bundle Events — Ton trajet, ton hôtel et ton retour, au même endroit",
  description:
    "Ton trajet de porte à porte, ton hôtel près de la salle et ton retour, au même endroit. On te propose un voyage complet pour ton concert, ton match ou ton festival, tu modifies ce que tu veux.",
  icons: {
    icon: [
      { url: "/favicon/logo-star.svg", type: "image/svg+xml" },
      { url: "/favicon/logo-star-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon/logo-star-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon/logo-star-96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon/logo-star.ico", sizes: "16x16 32x32 48x48" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${figtree.variable} ${bricolage.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
