import type { MetadataRoute } from "next";
import { siteConfig, socialConfig } from "@/src/config";

export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "MistralAI-User",
];

const PRIVATE_PATHS = ["/api/", "/auth/"];

export function buildRobots(baseUrl: string = siteConfig.url): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: PRIVATE_PATHS },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

export function buildSitemap(baseUrl: string = siteConfig.url, now: Date = new Date()): MetadataRoute.Sitemap {
  return [{ url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 }];
}

export function buildManifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    lang: siteConfig.language,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: siteConfig.backgroundColor,
    theme_color: siteConfig.themeColor,
    categories: ["travel", "entertainment"],
    icons: [
      { src: "/favicon/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/favicon/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon/logo-star.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}

export function buildJsonLd(baseUrl: string = siteConfig.url) {
  const organization = {
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: siteConfig.name,
    url: `${baseUrl}/`,
    logo: `${baseUrl}/favicon/web-app-manifest-512x512.png`,
    sameAs: [socialConfig.instagram.url],
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: `${baseUrl}/`,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: siteConfig.language,
        publisher: { "@id": `${baseUrl}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${baseUrl}/#app`,
        name: siteConfig.name,
        url: `${baseUrl}/`,
        description: siteConfig.description,
        applicationCategory: "TravelApplication",
        operatingSystem: "Web",
        inLanguage: siteConfig.language,
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        publisher: { "@id": `${baseUrl}/#organization` },
      },
    ],
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildLlmsTxt(baseUrl: string = siteConfig.url): string {
  return `# ${siteConfig.name}

> ${siteConfig.name} organise le voyage complet pour aller à un concert, un match ou un festival en France : le trajet de porte à porte, un hôtel près de la salle et le retour, proposés en une seule recherche et modifiables.

${siteConfig.name} est une application web gratuite, en français. Ce n'est pas une agence : on ne vend ni billets ni chambres. On compare et on assemble, puis chaque réservation se fait chez le transporteur ou l'hôtel via un lien direct. C'est un projet étudiant.

## Ce que fait le site

- Recherche en une fois : le point de départ (adresse, gare ou ville), l'événement (salle, stade ou festival) et les dates (aller simple, aller-retour ou aller-retour dans la journée).
- Trajets porte à porte en train (SNCF), bus (FlixBus, BlaBlaCar Bus), avion et voiture, avec les horaires et les prix quand ils sont disponibles. L'avion n'est pas proposé quand un train relie les deux villes en moins de 2 h 30.
- Un hôtel proposé près de la salle (prix par nuit), changeable, ou aucun pour un aller-retour dans la journée.
- Trois critères pour le voyage proposé : le plus rapide, le moins cher ou le plus vert (CO2).
- Réservation par liens directs : Trainline pour le train, FlixBus pour le bus, Kayak pour l'avion, Booking.com pour l'hôtel, Google Maps sinon.
- Partage du voyage par lien, QR code ou e-mail, sans compte.
- Idées de sortie par ville (concerts, festivals, spectacles, matchs à venir).

## Pages

- [Accueil et recherche](${baseUrl}/) : la seule page publique ; tout le parcours (recherche, ton voyage, réservation) part d'ici.
- Les voyages partagés ont une adresse privée de la forme ${baseUrl}/<identifiant> : ils ne sont pas indexés.

## Questions fréquentes

- Est-ce payant ? Non, le site est gratuit ; on paie seulement les billets et l'hôtel chez les partenaires.
- Peut-on réserver directement sur ${siteConfig.name} ? Non, chaque bouton « Réserver » ouvre le site du transporteur ou de l'hôtel, prérempli.
- Quels pays ? La France métropolitaine.

## Contact

- [Instagram](${socialConfig.instagram.url})
`;
}
