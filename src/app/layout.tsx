import type { Metadata } from "next";
import { Inter, Allan } from "next/font/google";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const allan = Allan({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-allan",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bundle Events — Le trajet, l'hôtel, l'événement. Un bundle.",
  description:
    "Planifiez votre transport et hébergement pour vos concerts et événements. Comparez train, avion, voiture, et trouvez l'hôtel à côté de la scène.",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon/favicon-48x48.png", type: "image/png", sizes: "48x48" },
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
    <html lang="fr" className={`${inter.variable} ${allan.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
