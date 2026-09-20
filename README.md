# Pharma Garde — Brazzaville

Application web statique (HTML/CSS/JS + JSON) qui aide un habitant de
Brazzaville à trouver en quelques secondes une pharmacie de garde, la
nuit ou le dimanche, et à la contacter directement.

## Fichiers

- `index.html` — structure de la page
- `style.css` — habillage visuel
- `script.js` — logique (rotation des gardes, recherche, filtres, appel)
- `pharmacies.json` — annuaire des pharmacies (nom, adresse, téléphone,
  arrondissement, types de garde assurés)

## Lancer l'application

Comme `script.js` charge `pharmacies.json` via `fetch`, certains
navigateurs (Chrome notamment) bloquent cette lecture si vous ouvrez
`index.html` directement depuis le disque (`file://`). Le plus simple
est de servir le dossier avec un petit serveur local, par exemple :

```bash
cd pharma-garde
python3 -m http.server 8000
```

puis d'ouvrir `http://localhost:8000` dans le navigateur.

## Comment fonctionne le calcul de la garde

`pharmacies.json` ne contient pas un calendrier figé de dates : chaque
pharmacie déclare simplement à quel(s) type(s) de garde elle participe
(`"nuit"`, `"dimanche"`, ou les deux). Le script regroupe les
pharmacies éligibles par arrondissement, puis fait tourner la garde
entre elles chaque nuit (et chaque dimanche) à partir de la date du
jour — comme le fait un planning de rotation réel. Résultat : l'écran
« en ce moment » reste juste indéfiniment, sans qu'il soit nécessaire
de mettre à jour le fichier tous les jours.

## Important avant mise en production

La liste de pharmacies fournie est **illustrative**, construite à
partir de quelques officines connues du centre-ville pour les besoins
du sprint. Avant toute utilisation réelle, il faut la remplacer par la
liste et le planning officiels publiés par l'Ordre des pharmaciens du
Congo (ou toute source faisant foi), en conservant la même structure
de `pharmacies.json`.

## Périmètre (rappel du brief)

Inclus : consultation des pharmacies de garde (nuit / dimanche), nom,
adresse, téléphone, appel direct depuis l'application.
Exclus : vente ou livraison de médicaments, paiement en ligne,
consultation médicale, gestion des prescriptions ou des stocks,
réservation.
