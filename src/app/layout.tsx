import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Bundle Events — Le trajet, l'hôtel, l'événement. Un bundle.",
  description:
    "Planifiez votre transport et hébergement pour vos concerts et événements. Comparez train, avion, voiture, et trouvez l'hôtel à côté de la scène.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Charge les fichiers de police ; les constantes font-family vivent dans src/styles/theme.css (@theme). */}
        <link
          href="https://fonts.googleapis.com/css2?family=Allan:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
