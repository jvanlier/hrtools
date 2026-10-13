# Selected design: mockup A

**Status: implemented in the student-page preview and export.**

Open [ontwerp-a.html](ontwerp-a.html) directly in a browser. This self-contained mockup uses sample records; contact details are illustrative only.

## Visual design

- Keep A's red header (`#c8102e`), light grey background, white cards with a red top border, and dark contact footer.
- Adopt the former C's form layout: a large rounded postcode/city search field with a **Zoek** button alongside it. Maximum distance and location status appear below.
- Center the search panel with a maximum width of 860 px. Place the remaining filters below it as compact rounded controls: postcode, city, semester, specialization, and **Filters wissen**. Controls wrap onto additional rows when space is limited. Sorting sits in a separate, right-aligned row below a divider, with a visible **Sorteer resultaten op** label to distinguish ordering from filtering.
- Keep A's responsive card grid, not C's result list. Each card shows internship placement, supervisor, postcode, city, email, phone number, semesters, and specialization. Distance search adds a distance badge.
- Retain the clickable email link and QR code for `enkoc@hr.nl` in the footer.
- Use a complete postcode example (**bijv. 3011 AA**) in the postcode filter placeholder.
- Both user interfaces remain Dutch. Compact filter labels remain accessible to screen readers, and keyboard focus remains visible.

## Intended behavior and local execution

Students should be able to filter by postcode and city, limit distance from a postcode or city, and sort by distance. Administrators enter the eight fields, save JSON, and export one self-contained HTML page containing data, JavaScript, and CSS. No web server is required.

The existing mockup demonstrates filtering and straight-line distance using sample records. New location lookups currently use PDOK over the internet; offline lookup can only use a known postcode or city from the sample records. Fully offline location resolution is not yet supported.

## Scope

Mockups B and C have been discarded; only C's form layout has been retained. The old generator has been removed to prevent overwriting the selected design or recreating discarded mockups.

`student.js` implements this design for the standalone student-page export. `admin.html` uses the same builder for preview and export, without a design picker. B/C styles and export options have been removed. The administrator's data-entry form and JSON workflow remain unchanged.

Internal documentation and code comments should be written in English. User-facing content should be written in Dutch.
