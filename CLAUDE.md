# Mon Scan

Appli web personnelle de scan (aliments, cosmétiques, produits ménagers ; un seul utilisateur). Hébergée par GitHub Pages depuis la branche `main` : tout commit sur `main` est en ligne quelques minutes après, sur https://aurelien124.github.io/mon-scan/.

## Fichiers

- `index.html` : l'appli (interface, scan, calcul de la note, moteur de détection). Ne pas y toucher pour une simple mise à jour de contenu.
- `kb.js` : la base de connaissances (`KB`, une entrée par famille d'aliments) et le `JOURNAL` des mises à jour. C'est le fichier à faire évoluer.
- `kbc.js` : base cosmétiques et ménager (`INGC` familles d'ingrédients, `SRC` sources officielles, `CFAM` familles de produits avec alternatives, analyses de La Famille Tortue, `JOURNAL_C`).
- `cosmo.js` : moteur d'analyse des listes INCI (Open Beauty Facts, Open Products Facts). Pas de contenu.
- `top.json` et `search.json` : Top 10 par famille (onglet « Top 10 » et « Mieux notés ») et index de recherche par nom. Généré chaque lundi par `.github/workflows/top.yml`, qui lance `scripts/top.js` (requêtes Open Food/Beauty/Products Facts, notes calculées avec le moteur de l'appli). Ne pas le modifier à la main ; pour ajouter une famille, compléter la liste `FAM` de `scripts/top.js`. Le robot pousse sur `main` : faire `git pull --rebase` avant de pousser.
- `sw.js` : mode hors ligne (service worker). Fichiers de l'appli et fiches produits en « réseau d'abord, copie locale sinon » ; lecteur de codes-barres, polices et photos en « copie locale d'abord ». Ne touche pas à `muscu/`. Changer `V` seulement pour vider les copies locales.
- `tests/check.js` : contrôle de cohérence de `kb.js` et `kbc.js`. À lancer avant tout commit : `node tests/check.js`.
- `muscu/` : appli séparée « Ma Muscu » (suivi de musculation), en ligne sur https://aurelien124.github.io/mon-scan/muscu/. Sans lien avec Mon Scan : la mise à jour de la base de connaissances n'y touche pas.

## Règles pour modifier `kb.js`

- Le format d'une entrée est décrit en tête de `kb.js`. Copier la structure d'une entrée existante.
- Les expressions régulières (`re`, `ing`, `not`, `kw`, `un`) s'appliquent à un texte en minuscules et sans accents (« œ » devient « oe ») : les écrire sans accents.
- `verif: 1` seulement si les règles de la fiche ont été vérifiées pendant la session sur au moins deux sources consultées, citées dans `sources` avec leur URL exacte. Sinon `verif: 0`.
- Ne jamais inventer une URL ni un chiffre. Une affirmation sans source consultée ne rentre pas dans une fiche vérifiée.
- Hiérarchie des preuves : avis d'agences (Anses, EFSA, DGCCRF), réglementation, puis tests concordants d'associations (Que Choisir, 60 Millions de consommateurs, Bloom, Foodwatch). Une étude isolée ou un article de presse seul ne change pas un verdict : au mieux une ligne dans `pieges` signalée comme « débattu ».
- Les applis de scan et de notation (Open Food Facts, Yuka, QuelProduit, MyLabel, Siga) sont aussi des sources utilisables, choisies par l'utilisateur : leurs pages publiques (méthodologie, fiches additifs, critères de notation, blogs, données Open Food Facts) peuvent servir à enrichir les fiches, ajouter des pièges, des mots-clés ou de nouvelles familles, et comptent parmi les sources d'une fiche vérifiée. Citer l'URL exacte de la page consultée. Si une appli contredit une agence, garder l'avis de l'agence et signaler l'écart dans `pieges`.
- Pas de verdict par marque dans les fiches : elles donnent des règles par type de produit.
- Résultats de tests par produit : liste `TESTS` en fin de `kb.js`. Un produit précis (marque + mots du nom), jamais une marque entière. Sources fiables seulement (tests d'associations, DGCCRF, RappelConso), avec l'URL et une date d'expiration (3 ans en général). Effet mesuré : quelques points (`d`) selon l'appréciation du test, ou plafond (`cap`) si défaut grave (produit déclassé, contaminant très élevé).
- Contenus payants (magazines Que Choisir ou 60 Millions, sites sur abonnement) : utilisables seulement s'ils ont été obtenus légalement par l'utilisateur ou un proche abonné (pages, captures ou articles partagés). Jamais de copie piratée (sites de téléchargement illégal). Reformuler, garder les règles générales par type de produit, ne pas recopier les tableaux, et citer le numéro ou l'article avec l'URL publique la plus proche.
- Ton des textes : français, phrases courtes, factuel, sans alarmisme.
- À chaque mise à jour, ajouter une ligne en tête de `JOURNAL` : date du jour et résumé en une phrase.
- Modifications petites et ciblées. Ne pas réécrire le fichier en entier.

## Règles pour modifier `kbc.js`

- La référence choisie par l'utilisateur pour les cosmétiques et le ménager est le blog La Famille Tortue (https://lafamilletortue.fr/, articles gratuits). Son avis va dans `lft` (et dans `CFAM`, `LFT_MARQUES`, `LFT_PRODUITS`), toujours attribué à elle, avec l'URL exacte de l'article. Reformuler avec nos mots ; ne pas recopier ses tableaux ni ses textes ; ne pas utiliser son livre payant (Klinki).
- Le statut réglementaire va dans `off`, séparé de son avis, avec au moins une source consultée ajoutée à `SRC` (règlement UE, ANSM, DGCCRF, ECHA, SCCS, puis associations). `off: null` si aucune restriction n'a été trouvée. Ne jamais faire passer l'avis de La Famille Tortue pour une règle officielle, ni l'inverse.
- Signaler les partenariats commerciaux qu'elle déclare (`LFT_PARTENAIRES`, 4e champ des alternatives).
- Les regex `re` s'appliquent à chaque ingrédient INCI en minuscules, sans accents. `gen: 1` pour une famille générale (ex. silicones) qui s'efface derrière une famille plus précise.
- À chaque mise à jour, ajouter une ligne en tête de `JOURNAL_C`.

## Avant de pousser

1. `node tests/check.js` doit afficher OK.
2. Relire le diff : seules les entrées visées ont changé.
3. Commit sur `main` avec un message en français décrivant le changement.
