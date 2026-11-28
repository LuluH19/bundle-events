# Actualités et page Événements

[← Sommaire](../README.md)

Deux sections publiques, faites pour le référencement : `/actualites` (articles) et `/evenements` (événements à venir). Elles partagent le gabarit `PageShell` (`src/components/layout/PageShell.tsx` : en-tête inchangé, fil d'Ariane, `SiteFooter`).

## Actualités

### Où sont les articles

Un article = un fichier JSON dans `src/content/news/<slug>.json`. Pas de base de données ni de lib Markdown : le contenu est une liste de blocs typés (`h2`, `p`, `ul`, type `NewsArticle` dans `src/types/news.ts`), rendus par React, donc sans HTML brut ni risque d'injection.

```json
{
  "slug": "trains-noel-2026-vacances-billets-greves",
  "title": "Trains de Noël 2026 : vacances, billets et grèves, le point",
  "description": "110 à 160 caractères, affichée par Google sous le titre.",
  "publishedAt": "2026-11-28",
  "updatedAt": "2026-12-02",
  "author": "Équipe Bundle Events",
  "tags": ["SNCF", "vacances de Noël 2026"],
  "lead": "Le chapeau, affiché en gras sous le titre.",
  "blocks": [{ "type": "h2", "text": "…" }, { "type": "p", "text": "…" }, { "type": "ul", "items": ["…"] }],
  "sources": [{ "title": "…", "publisher": "…", "url": "https://…" }]
}
```

`updatedAt` est facultatif. `parseNewsArticle` (`src/utils/news.ts`) valide chaque fichier et fait échouer la build et les tests s'il ne respecte pas les règles : slug en minuscules et tirets égal au nom du fichier, titre de 70 caractères au plus, description de 110 à 160 caractères, dates `AAAA-MM-JJ`, au moins un `h2`, au moins deux sources en `https`. `src/__tests__/news.test.ts` charge tous les fichiers réels du dossier, donc un article mal formé est bloqué en CI.

Les articles sont créés avec le skill d'équipe `bundle-news` (dépôt bundle-events-skills), qui cherche l'actualité, recoupe les faits et écrit le fichier.

### Pages

- `/actualites` (`src/app/actualites/page.tsx`) : liste du plus récent au plus ancien (`getAllNews`, `src/services/news.ts`, lu au build).
- `/actualites/<slug>` (`src/app/actualites/[slug]/page.tsx`) : générée au build (`generateStaticParams`, `dynamicParams = false`, un slug inconnu donne 404). Titre sans le suffixe « · Bundle Events » (`title.absolute`) pour rester sous ~60 caractères dans Google. Open Graph `article` avec dates et tags, JSON-LD `NewsArticle` + `BreadcrumbList` (`buildNewsArticleJsonLd`), image de partage propre à l'article (`opengraph-image.tsx` du même dossier), encart « Organiser mon voyage », sources en liens externes, « À lire aussi ».

## Page Événements

`/evenements` (`src/app/evenements/page.tsx`) liste les événements à venir des villes de `EVENT_CITIES` (`src/utils/constants/cities.ts`, les mêmes que les puces de l'accueil), au plus `eventsConfig.eventsPageLimit` (12) par ville, via `listCityEvents` (`src/services/event-search.ts`) : mêmes sources et même cache partagé que « Des idées de sortie ». Rendu côté serveur et régénéré toutes les 6 h (`revalidate = 21600`), donc lisible par les moteurs. Une ville sans résultat est masquée ; si tout échoue, un message renvoie vers la recherche.

Chaque carte est un lien `venueLink(v)` (`src/utils/venue-link.ts`) vers l'accueil : `/?evenement=<nom>&lat=…&lng=…&id=…&ville=…&adresse=…&date=…`. Au chargement de l'accueil, `BundleBuilder` lit ces paramètres (`parseVenueLink` : nom requis, coordonnées valides, textes tronqués à 200 caractères), présélectionne l'événement comme un clic dans la recherche (source analytics `events_page`) puis remet l'URL à `/`.

Sur l'accueil, « Des idées de sortie » a un lien « Voir tous les événements » vers `/evenements`, ou vers `/evenements#<ville>` si une ville est choisie (`cityAnchor`).

## Référencement

Le sitemap contient `/`, `/evenements`, `/actualites` et chaque article (date de mise à jour comme `lastModified`) ; `llms.txt` présente les deux sections. Voir [seo.md](./seo.md).
