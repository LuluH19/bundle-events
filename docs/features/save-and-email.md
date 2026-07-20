# Sauvegarde et partage du bundle

[← Sommaire](../README.md)

Le bundle est déjà une URL permanente Supabase (`/{uuid}/bundle`). « Sauvegarder pour plus tard » = donner ce lien à l'utilisateur, avec l'email en option.

## UI — `src/components/SaveBundleModal.tsx`

Branché dans `BundleBuilder` sur l'étape `bundle` :
- **Auto-ouverte une fois** (garde `saveAutoShown`) ; la croix la ferme et révèle un **bouton flottant « Sauvegarder mon bundle »** (`IconBookmark`) qui la rouvre.
- **Lien copiable** (construit côté client depuis `window.location.origin` + uuid) + **Partager** (`navigator.share`, mobile) + **QR code** à la demande (image `api.qrserver.com`, `<img>` simple, sans dépendance).
- Champ **email** optionnel → `saveBundleEmail` → `/api/bundles/{uuid}/save`.
- `sent` (retourné par l'API) pilote un message honnête : « email envoyé » vs « email enregistré, utilisez le lien ci-dessus ».

## Backend — `/api/bundles/[uuid]/save`

`POST` : valide l'email (regex), l'enregistre sur la ligne `bundles`, appelle `sendBundleLinkEmail`, retourne `{ ok, link, sent }`.

## Envoi email — `src/lib/email.ts`

`sendBundleLinkEmail(to, bundleId)` envoie via **Brevo** en REST (sans SDK/npm) :

1. Si `BREVO_API_KEY` est défini → **Brevo** (`api.brevo.com/v3/smtp/email`). Gratuit 300/j, expéditeur unique vérifié **sans domaine** — chemin gratuit pour écrire à n'importe qui. Deliverabilité imparfaite depuis un `@gmail` (peut tomber en spam) → le lien copiable reste le canal fiable.
2. sinon → **stub** (log, `sent:false`).

`EMAIL_FROM` parsé (`Nom <email>` ou email brut). Le HTML (`bundleEmailHtml`) reprend l'identité (panneau ink `#00113a`, wordmark « assemblée. » ember) en **table-based + inline + hex** pour Gmail/Outlook/Apple Mail. Une sauvegarde ne bloque jamais : même si l'envoi échoue (`sent:false`), l'email est enregistré et le lien retourné.

### Activation Brevo
Compte → vérifier un expéditeur (code) → API key → `BREVO_API_KEY` + `EMAIL_FROM=<expéditeur vérifié>`. Les nouveaux comptes ont l'envoi transactionnel désactivé jusqu'à validation (profil + téléphone).

> ⚠️ **Vercel** : saisir `EMAIL_FROM` **sans guillemets** (`Bundle Events <x@y.z>`, pas `"Bundle Events <x@y.z>"`). L'UI Vercel garde les guillemets littéraux, contrairement à `dotenv` en local → Brevo rejette (`400 valid sender email required`). `parseFrom` retire désormais les guillemets par sécurité, mais mieux vaut la bonne valeur.
