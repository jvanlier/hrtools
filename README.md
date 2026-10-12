# Stageplaatsen-tool

Volledig lokaal, geen webserver nodig: open de bestanden direct in de browser (dubbelklik).

- **`admin.html`**: beheerpagina. Hier voeg je stageplaatsen toe, bewerkt of verwijdert ze. Gegevens worden automatisch in de browser bewaard (localStorage). Met *JSON opslaan* en *JSON openen* bewaar je ze als bestand (`stageplaatsen.json`).
  Met *Studentenpagina exporteren* maak je één los `stageplaatsen.html` (data, JS en CSS zitten erin) in ontwerp A, B of C.
  `student.js` moet in dezelfde map staan als `admin.html`.
- **`mockups/ontwerp-{a,b,c}.html`**: de 3 ontwerpen met voorbeelddata (`data/voorbeeld.json`). Opnieuw genereren: `node scripts/build-mockups.js`.

Studenten kunnen filteren op postcode, plaats, semester en specialisatie, en zoeken/sorteren op afstand (hemelsbreed) vanaf hun postcode of plaats.

Locaties (coördinaten) komen van de gratis PDOK Locatieserver. Daarvoor is internet nodig, zowel bij het toevoegen in de beheerpagina als bij afstand-zoeken door studenten. Zonder internet zoekt de studentenpagina alleen tussen postcodes en plaatsen die al in de lijst staan. Alle andere functies werken offline.
