# Référencement web et IA

Tout ce qui rend le site trouvable par les moteurs de recherche et compréhensible par les IA. La logique est dans `src/utils/seo.ts` (fonctions pures, testées dans `src/__tests__/seo.test.ts`) ; les fichiers de `src/app/` ne font que l'exposer.

## URL du site

`siteConfig.url` (`src/config/site.ts`) sert de base à toutes les URL absolues (canonical, sitemap, Open Graph, JSON-LD, `llms.txt`). Ordre de priorité :

1. `NEXT_PUBLIC_SITE_URL` (à mettre sur l'URL de production dans Vercel, ex. `https://bundleevent.me`) ;
2. sinon `VERCEL_PROJECT_PRODUCTION_URL`, fournie automatiquement par Vercel ;
3. sinon `http://localhost:3000`.

Le titre, la description, l'accroche, les mots-clés et les couleurs du site sont aussi dans `siteConfig`.

## Fichiers servis

| URL | Source | Rôle |
| --- | --- | --- |
| `/robots.txt` | `src/app/robots.ts` → `buildRobots` | Tout le site est ouvert, sauf `/api/` et `/auth/`. Un bloc autorise explicitement les robots des IA (`AI_CRAWLERS` : GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Meta-ExternalAgent, MistralAI-User), `/llms.txt` compris. Pointe vers le sitemap. |
| `/sitemap.xml` | `src/app/sitemap.ts` → `buildSitemap` | L'accueil, `/evenements`, `/actualites` et chaque article (`lastModified` = date de mise à jour de l'article). Les voyages partagés n'y figurent jamais. |
| `/manifest.webmanifest` | `src/app/manifest.ts` → `buildManifest` | Nom « Bundle Events », langue `fr`, couleurs de la charte, icônes `/favicon/web-app-manifest-*.png` et l'étoile SVG. Remplace l'ancien `public/favicon/site.webmanifest` (qui s'appelait « MyWebSite » et pointait vers des icônes inexistantes). |
| `/opengraph-image` | `src/app/opengraph-image.tsx` | Image de partage 1200×630 générée avec `ImageResponse` : étoile claire (`logo-star-light.svg`) sur fond `nuit`, accroche et nom du site. Sert aussi d'image Twitter/X. |
| `/llms.txt` | `src/app/llms.txt/route.ts` → `buildLlmsTxt` | Résumé du site au format [llms.txt](https://llmstxt.org) pour les IA : ce que fait le site, la page publique, une FAQ, le contact. Statique (`force-static`). |

## Métadonnées des pages

- `src/app/layout.tsx` : `metadataBase`, titre par défaut et modèle `%s · Bundle Events`, description, mots-clés, Open Graph (`fr_FR`, `website`), carte Twitter `summary_large_image`, `robots` index/follow, `theme-color` (via `viewport`).
- `src/app/page.tsx` (accueil) : `canonical` sur `/`. Il n'est pas dans le layout, pour ne pas être hérité par les voyages partagés.
- `src/app/[uuid]/[[...step]]/page.tsx` (voyage partagé) : titre « Ton voyage » et `noindex, nofollow`. Ces liens sont privés : ils ne doivent jamais apparaître dans un moteur ou une IA.

## Données structurées (JSON-LD)

Le layout insère un `<script type="application/ld+json">` construit par `buildJsonLd` : un graphe `Organization` (logo, Instagram en `sameAs`), `WebSite` et `WebApplication` (catégorie `TravelApplication`, gratuite). C'est le seul `dangerouslySetInnerHTML` autorisé du projet, comme le recommande la doc Next : le contenu est statique et `serializeJsonLd` échappe `<` pour qu'aucune donnée ne puisse fermer la balise. Vérifier avec le [Rich Results Test](https://search.google.com/test/rich-results) ou le [Schema Markup Validator](https://validator.schema.org/).

## À maintenir

- Une nouvelle page publique → l'ajouter à `buildSitemap`. Les articles s'y ajoutent seuls (voir [news-and-events.md](./news-and-events.md)).
- Une fonctionnalité visible qui change (nouveau mode de transport, catégories d'événements, adresses dans le champ événement, comptes…) → mettre à jour le texte de `buildLlmsTxt`, qui décrit le site aux IA et ne doit décrire que ce qui existe en production.
- Un nouveau robot d'IA à autoriser → l'ajouter à `AI_CRAWLERS`.
- Après la mise en ligne : déclarer `https://<domaine>/sitemap.xml` dans Google Search Console et Bing Webmaster Tools.
