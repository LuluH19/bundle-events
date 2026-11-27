const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const siteConfig = {
  name: "Bundle Events",
  shortName: "Bundle Events",
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (vercelProductionUrl ? `https://${vercelProductionUrl}` : "http://localhost:3000")
  ).replace(/\/+$/, ""),
  title: "Bundle Events — Ton trajet, ton hôtel et ton retour, au même endroit",
  description:
    "Ton trajet de porte à porte, ton hôtel près de la salle et ton retour, au même endroit. On te propose un voyage complet pour ton concert, ton match ou ton festival, tu modifies ce que tu veux.",
  tagline: "Tu as ton billet ? On s'occupe du reste.",
  locale: "fr_FR",
  language: "fr",
  themeColor: "#16153a",
  backgroundColor: "#ffffff",
  keywords: [
    "voyage concert",
    "trajet festival",
    "hôtel près de la salle",
    "train concert",
    "bus festival",
    "déplacement match",
    "aller-retour événement",
    "organiser un voyage",
    "SNCF",
    "FlixBus",
    "BlaBlaCar Bus",
  ],
};
