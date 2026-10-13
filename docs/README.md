# Internship placement tool

## Selected design

The selected design is **mockup A with C's form layout**. Open [`mockups/ontwerp-a.html`](../mockups/ontwerp-a.html) directly in a browser; no web server is required.

See [`mockups/README.md`](../mockups/README.md) for the design specification and scope. Mockups B and C and the old mockup generator have been removed. The student-page preview and export now use this layout exclusively, including the separate sorting row and full postcode placeholder.

## User guides

Open [`handleiding/index.html`](handleiding/index.html) to choose between two separate visual Dutch guides:

- [`handleiding/beheerder.html`](handleiding/beheerder.html): load the prefilled JSON file, add/edit placements, save changes, and export the student page. No familiarity with JSON is assumed.
- [`handleiding/studenten.html`](handleiding/studenten.html): open the received page, search, filter, sort, and contact a placement or maintainer. Contains no administrator instructions.

Each guide is self-contained, works offline, and can be printed or shared separately.

## Usage

- **`admin.html`**: add, edit, and delete placements. Records are saved automatically in browser localStorage. **JSON opslaan** downloads a JSON file; **JSON openen** loads one. **Studentenpagina exporteren** exports a standalone HTML file containing data, JS, and CSS. Both preview and export use the selected card layout; there is no design picker.
- **`student.js`**: the existing student-page builder; keep it alongside `admin.html`.
- **`data/voorbeeld.json`**: illustrative sample records.
- **`convert_excel_to_json.py`**: converts the internship placements Excel sheet in `data/` to the tool's JSON format. Run `uv run convert_excel_to_json.py`; it writes `data/stageplaatsen.json` (gitignored) to open in `admin.html` with **JSON openen…**. Records without coordinates are geocoded in the admin page with **Ontbrekende locaties ophalen**.

Students can filter by postcode, city, semester, and specialization, and search/sort by straight-line distance from a postcode or city.

Location coordinates come from the free PDOK Locatieserver. Internet access is required for new location lookups when adding records or searching by distance. Offline student lookup is limited to postcodes and cities already present in the records. Other functionality works offline.

## Verification

From the repository root, run `node --test tests/student-page.test.js` to check the exported layout against the selected mockup, embedded JSON escaping, and the administrator's single-design export path.

## Commit hooks

Install [prek](https://prek.j178.dev/) and Node.js, then run from the repository root:

```sh
prek install
prek run --all-files
```

`.pre-commit-config.yaml` checks whitespace, final newlines, JSON/YAML syntax, merge conflicts, large files, and private keys. Python files are formatted and linted with Ruff (rules in `ruff.toml`). Local hooks check JavaScript syntax and run the student-page tests when HTML, JavaScript, or JSON changes. No npm dependencies or web server are needed. The first run needs internet access to install the standard hooks; JavaScript syntax checks cover `.js` files, not inline scripts in HTML.

## Language convention

Write internal documentation and code comments in English. Keep user-facing content in Dutch.
