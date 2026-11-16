# Mon Scan

Appli web personnelle de scan alimentaire (un seul utilisateur). Hébergée par GitHub Pages depuis la branche `main` : tout commit sur `main` est en ligne quelques minutes après, sur https://aurelien124.github.io/mon-scan/.

## Fichiers

- `index.html` : l'appli (interface, scan, calcul de la note, moteur de détection). Ne pas y toucher pour une simple mise à jour de contenu.
- `kb.js` : la base de connaissances (`KB`, une entrée par famille d'aliments) et le `JOURNAL` des mises à jour. C'est le fichier à faire évoluer.
- `tests/check.js` : contrôle de cohérence de `kb.js`. À lancer avant tout commit : `node tests/check.js`.

## Règles pour modifier `kb.js`

- Le format d'une entrée est décrit en tête de `kb.js`. Copier la structure d'une entrée existante.
- Les expressions régulières (`re`, `ing`, `not`, `kw`, `un`) s'appliquent à un texte en minuscules et sans accents (« œ » devient « oe ») : les écrire sans accents.
- `verif: 1` seulement si les règles de la fiche ont été vérifiées pendant la session sur au moins deux sources consultées, citées dans `sources` avec leur URL exacte. Sinon `verif: 0`.
- Ne jamais inventer une URL ni un chiffre. Une affirmation sans source consultée ne rentre pas dans une fiche vérifiée.
- Hiérarchie des preuves : avis d'agences (Anses, EFSA, DGCCRF), réglementation, puis tests concordants d'associations (Que Choisir, 60 Millions de consommateurs, Bloom, Foodwatch). Une étude isolée ou un article de presse seul ne change pas un verdict : au mieux une ligne dans `pieges` signalée comme « débattu ».
- Pas de verdict par marque : les fiches donnent des règles par type de produit.
- Ne pas recopier le contenu de sites payants (dont derriere-les-etiquettes.fr). Reformuler à partir de sources publiques.
- Ton des textes : français, phrases courtes, factuel, sans alarmisme.
- À chaque mise à jour, ajouter une ligne en tête de `JOURNAL` : date du jour et résumé en une phrase.
- Modifications petites et ciblées. Ne pas réécrire le fichier en entier.

## Avant de pousser

1. `node tests/check.js` doit afficher OK.
2. Relire le diff : seules les entrées visées ont changé.
3. Commit sur `main` avec un message en français décrivant le changement.
