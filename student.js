/*
 * Bouwt de zelfstandige studentenpagina (één HTML-bestand met data + JS + CSS).
 * Wordt gebruikt door admin.html (browser) en scripts/build-mockups.js (Node).
 */
(function (root) {
  'use strict';

  const BEHEERDER = 'enkoc@hr.nl';
  // QR-code voor "mailto:enkoc@hr.nl" (vooraf gegenereerd, statisch).
  const QR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 116 116" role="img" aria-label="QR-code: mail naar ' + BEHEERDER + '"><rect width="116" height="116" fill="#fff"/><path transform="scale(4)" stroke="#000" d="M2 2.5h7m3 0h2m2 0h1m3 0h7m-25 1h1m5 0h1m4 0h2m1 0h1m3 0h1m5 0h1m-25 1h1m1 0h3m1 0h1m2 0h1m2 0h3m3 0h1m1 0h3m1 0h1m-25 1h1m1 0h3m1 0h1m1 0h3m1 0h1m2 0h1m2 0h1m1 0h3m1 0h1m-25 1h1m1 0h3m1 0h1m2 0h1m1 0h1m1 0h2m3 0h1m1 0h3m1 0h1m-25 1h1m5 0h1m1 0h2m1 0h2m5 0h1m5 0h1m-25 1h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7m-17 1h3m1 0h1m2 0h2m-16 1h2m3 0h1m2 0h2m2 0h2m1 0h1m1 0h2m1 0h1m-21 1h1m1 0h1m4 0h3m2 0h1m1 0h1m2 0h2m2 0h1m1 0h1m-24 1h1m1 0h4m1 0h2m1 0h2m2 0h3m1 0h1m2 0h1m1 0h1m-24 1h1m2 0h1m2 0h1m4 0h2m1 0h1m1 0h5m1 0h1m-24 1h3m3 0h1m1 0h3m2 0h1m1 0h1m2 0h2m1 0h1m1 0h2m-20 1h1m2 0h2m2 0h1m2 0h2m1 0h2m1 0h2m1 0h1m-25 1h5m1 0h1m1 0h3m2 0h1m1 0h2m3 0h3m1 0h1m-23 1h3m3 0h5m4 0h3m1 0h1m1 0h1m-24 1h3m1 0h3m3 0h1m2 0h1m2 0h5m-13 1h1m2 0h3m2 0h1m3 0h2m2 0h1m-25 1h7m4 0h1m1 0h1m2 0h1m1 0h1m1 0h3m1 0h1m-25 1h1m5 0h1m3 0h1m1 0h2m1 0h2m3 0h2m2 0h1m-25 1h1m1 0h3m1 0h1m4 0h1m1 0h9m1 0h2m-25 1h1m1 0h3m1 0h1m2 0h1m1 0h4m2 0h1m2 0h4m-24 1h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m2 0h3m2 0h1m2 0h2m-25 1h1m5 0h1m1 0h1m1 0h1m2 0h1m6 0h1m-21 1h7m3 0h2m1 0h1m2 0h1m2 0h1m4 0h1"/></svg>';

  // ---------- Logica die in de studentenpagina draait (wordt geserialiseerd) ----------
  function app() {
    const DATA = JSON.parse(document.getElementById('stage-data').textContent);
    const $ = (s) => document.querySelector(s);
    const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, '');
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const uniq = (a) => [...new Set(a.filter(Boolean))].sort((x, y) => x.localeCompare(y, 'nl', { numeric: true }));
    let origin = null;

    function fill(sel, values) {
      const el = $(sel);
      values.forEach((v) => el.add(new Option(v, v)));
    }
    fill('#f-semester', uniq(DATA.flatMap((d) => d.semesters || [])));
    fill('#f-spec', uniq(DATA.map((d) => d.specialisatie)));

    function km(a, b) {
      const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
      return 12742 * Math.asin(Math.sqrt(h));
    }

    async function geocode(q) {
      q = q.trim();
      const pc4 = /^\d{4}$/.test(q);
      const params = new URLSearchParams({
        q: pc4 ? 'postcode:' + q + '*' : q,
        rows: '1',
        fl: 'weergavenaam,centroide_ll',
        fq: pc4 ? 'type:postcode' : 'type:(postcode OR woonplaats)',
      });
      try {
        const res = await fetch('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?' + params, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const doc = (await res.json()).response.docs[0];
        const m = doc && /POINT\(([\d.]+) ([\d.]+)\)/.exec(doc.centroide_ll);
        if (m) return { lon: +m[1], lat: +m[2], label: doc.weergavenaam };
      } catch (e) {
        console.warn('Online locatie zoeken mislukt, probeer offline', e);
      }
      // Offline terugval: zoek in de bekende stageplaatsen.
      const nq = norm(q).toUpperCase();
      const hit = DATA.find((d) => d.lat != null && (norm(d.postcode).toUpperCase().startsWith(nq) || norm(d.plaats).toUpperCase() === nq));
      return hit ? { lat: hit.lat, lon: hit.lon, label: hit.postcode + ' ' + hit.plaats + ' (offline)' } : null;
    }

    function card(d) {
      const tel = String(d.telefoonnummer || '').replace(/[^\d+]/g, '');
      const dist = d.km != null ? '<span class="afstand">' + d.km.toFixed(1).replace('.', ',') + ' km</span>' : '';
      const sems = (d.semesters || []).map((s) => '<span class="chip">' + esc(s) + '</span>').join(' ');
      return '<article class="item">' +
        '<div class="item-kop"><h3>' + esc(d.stageplaats) + '</h3>' + dist + '</div>' +
        '<p class="locatie">' + esc(d.postcode) + ' ' + esc(d.plaats) + '</p>' +
        '<dl>' +
        '<dt>Stagebegeleider</dt><dd>' + esc(d.stagebegeleider) + '</dd>' +
        '<dt>E-mail</dt><dd>' + (d.mailadres ? '<a href="mailto:' + esc(d.mailadres) + '">' + esc(d.mailadres) + '</a>' : '–') + '</dd>' +
        '<dt>Telefoon</dt><dd>' + (tel ? '<a href="tel:' + esc(tel) + '">' + esc(d.telefoonnummer) + '</a>' : '–') + '</dd>' +
        '<dt>Semesters</dt><dd>' + (sems || '–') + '</dd>' +
        '<dt>Specialisatie</dt><dd>' + esc(d.specialisatie || '–') + '</dd>' +
        '</dl></article>';
    }

    function render() {
      const pc = norm($('#f-postcode').value).toUpperCase();
      const pl = norm($('#f-plaats').value);
      const sem = $('#f-semester').value;
      const spec = $('#f-spec').value;
      const max = parseFloat($('#f-afstand').value);
      const sort = $('#f-sort').value;

      let rows = DATA.map((d) => Object.assign({}, d, { km: origin && d.lat != null ? km(origin, d) : null }));
      rows = rows.filter((d) =>
        (!pc || norm(d.postcode).toUpperCase().startsWith(pc)) &&
        (!pl || norm(d.plaats).includes(pl)) &&
        (!sem || (d.semesters || []).includes(sem)) &&
        (!spec || d.specialisatie === spec) &&
        (!origin || !max || (d.km != null && d.km <= max)));

      const byName = (a, b) => String(a.stageplaats).localeCompare(String(b.stageplaats), 'nl');
      if (sort === 'afstand' && origin) rows.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || byName(a, b));
      else if (sort === 'plaats') rows.sort((a, b) => String(a.plaats).localeCompare(String(b.plaats), 'nl') || byName(a, b));
      else rows.sort(byName);

      $('#aantal').textContent = rows.length + (rows.length === 1 ? ' stageplaats' : ' stageplaatsen') +
        (origin ? ' · afstand vanaf ' + origin.label : '');
      $('#resultaten').innerHTML = rows.map(card).join('') || '<p class="leeg">Geen stageplaatsen gevonden. Pas je filters aan.</p>';
    }

    $('#vanaf-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = $('#f-vanaf').value;
      const status = $('#vanaf-status');
      if (!q.trim()) { origin = null; status.textContent = ''; render(); return; }
      status.textContent = 'Locatie zoeken…';
      origin = await geocode(q);
      status.textContent = origin ? 'Gevonden: ' + origin.label : 'Locatie niet gevonden. Probeer een postcode (bijv. 3011 AA) of plaatsnaam.';
      if (origin) $('#f-sort').value = 'afstand';
      render();
    });
    $('#wis').addEventListener('click', () => {
      document.querySelectorAll('#filters input').forEach((i) => { i.value = ''; });
      document.querySelectorAll('#filters select').forEach((s) => { s.selectedIndex = 0; });
      origin = null;
      $('#vanaf-status').textContent = '';
      render();
    });
    document.querySelectorAll('#filters input:not(#f-vanaf), #filters select').forEach((el) => el.addEventListener('input', render));
    render();
  }

  // ---------- Markup (gelijk voor alle ontwerpen) ----------
  function markup(meta) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return `
<header class="kop">
  <div class="kop-inner">
    <h1>${esc(meta.titel)}</h1>
    <p>Zoek een stageplaats bij jou in de buurt. Bijgewerkt op ${esc(meta.datum)}.</p>
  </div>
</header>
<main class="layout">
  <aside id="filters" class="filters" aria-label="Filters">
    <form id="vanaf-form" class="blok vanaf">
      <label for="f-vanaf">Afstand vanaf (postcode of plaats)</label>
      <div class="rij">
        <input id="f-vanaf" placeholder="bijv. 3011 AA of Rotterdam" autocomplete="postal-code">
        <button type="submit">Zoek</button>
      </div>
      <label for="f-afstand">Maximale afstand</label>
      <select id="f-afstand">
        <option value="">Onbeperkt</option>
        <option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option>
        <option value="50">50 km</option><option value="100">100 km</option>
      </select>
      <p id="vanaf-status" class="status" role="status" aria-live="polite"></p>
    </form>
    <div class="blok">
      <label for="f-postcode">Postcode begint met</label>
      <input id="f-postcode" placeholder="bijv. 30">
      <label for="f-plaats">Plaats</label>
      <input id="f-plaats" placeholder="bijv. Rotterdam">
      <label for="f-semester">Semester</label>
      <select id="f-semester"><option value="">Alle semesters</option></select>
      <label for="f-spec">Specialisatie</label>
      <select id="f-spec"><option value="">Alle specialisaties</option></select>
      <label for="f-sort">Sorteer op</label>
      <select id="f-sort">
        <option value="naam">Naam</option>
        <option value="plaats">Plaats</option>
        <option value="afstand">Afstand (eerst afstand-zoeken)</option>
      </select>
      <button type="button" id="wis" class="secundair">Filters wissen</button>
    </div>
  </aside>
  <section class="resultaten-wrap" aria-label="Resultaten">
    <p id="aantal" class="aantal" aria-live="polite"></p>
    <div id="resultaten" class="resultaten"></div>
  </section>
</main>
<footer class="contact">
  <div>
    <h2>Vragen, fouten of een nieuwe stageplaats?</h2>
    <p>Mail de beheerder: <a href="mailto:${BEHEERDER}">${BEHEERDER}</a></p>
    <p class="klein">Of scan de QR-code met je telefoon.</p>
  </div>
  <a class="qr" href="mailto:${BEHEERDER}">${QR_SVG}</a>
</footer>`;
  }

  // ---------- Stijlen ----------
  const CSS_BASIS = `
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.45}
h1,h2,h3{margin:0}
label{display:block;font-weight:600;font-size:.85rem;margin:.75rem 0 .25rem}
input,select,button{font:inherit;padding:.5rem .6rem;border-radius:6px;border:1px solid #bbb;width:100%}
button{cursor:pointer;width:auto;border:0;font-weight:600}
.rij{display:flex;gap:.4rem}
.rij input{flex:1}
.status{font-size:.85rem;min-height:1.2em;margin:.5rem 0 0}
.secundair{margin-top:1rem;background:transparent;border:1px solid currentColor}
dl{display:grid;grid-template-columns:auto 1fr;gap:.2rem .75rem;margin:.5rem 0 0;font-size:.9rem}
dt{font-weight:600;opacity:.75}
dd{margin:0;overflow-wrap:anywhere}
.chip{display:inline-block;padding:0 .45rem;border-radius:99px;font-size:.8rem}
.afstand{white-space:nowrap;font-weight:700;font-size:.85rem;padding:.1rem .5rem;border-radius:99px}
.item-kop{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem}
.locatie{margin:.15rem 0 0;opacity:.8}
.leeg{padding:2rem;text-align:center;opacity:.7}
.contact{display:flex;gap:1.5rem;align-items:center;justify-content:center;flex-wrap:wrap;padding:2rem 1rem}
.contact h2{font-size:1.1rem}
.qr svg{width:116px;height:116px;display:block}
.klein{font-size:.85rem;opacity:.75}
:focus-visible{outline:3px solid #ffbf00;outline-offset:2px}
@media print{.filters{display:none}}
`;

  const DESIGNS = {
    a: {
      naam: 'A – Kaarten (HR-rood)',
      css: `
body{background:#f4f4f4;color:#222}
.kop{background:#c8102e;color:#fff;padding:2rem 1rem}
.kop-inner,.layout{max-width:1200px;margin:0 auto}
.layout{padding:1rem}
.filters{display:grid;grid-template-columns:1fr 2fr;gap:1rem;background:#fff;padding:1rem;border-radius:10px;box-shadow:0 1px 4px #0002}
.filters .blok:last-child{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0 1rem;align-items:end}
.filters .blok:last-child label{grid-row:1}
.filters .blok:last-child .secundair{grid-row:2;color:#c8102e}
button{background:#c8102e;color:#fff}
.aantal{font-weight:600;margin:1.25rem 0 .5rem}
.resultaten{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
.item{background:#fff;border-radius:10px;padding:1rem 1.1rem;box-shadow:0 1px 4px #0002;border-top:4px solid #c8102e}
.item h3{font-size:1.1rem}
.afstand{background:#c8102e;color:#fff}
.chip{background:#fde8eb;color:#8a0b20}
a{color:#a30d26}
.contact{background:#222;color:#fff}.contact a{color:#ffb3bf}
@media(max-width:800px){.filters{grid-template-columns:1fr}.filters .blok:last-child{display:block}}
`,
    },
    b: {
      naam: 'B – Compacte lijst met zijbalk',
      css: `
body{background:#fff;color:#1b1f24}
.kop{background:#1b1f24;color:#fff;padding:1rem 1.5rem}
.kop h1{font-size:1.4rem}.kop p{margin:.2rem 0 0;opacity:.75;font-size:.9rem}
.layout{display:grid;grid-template-columns:280px 1fr;min-height:70vh}
.filters{background:#f1f3f5;padding:1rem 1.25rem;border-right:1px solid #dde1e5}
.vanaf{padding-bottom:1rem;border-bottom:1px solid #dde1e5}
button{background:#0b6bcb;color:#fff}.secundair{color:#0b6bcb}
.resultaten-wrap{padding:1rem 1.5rem}
.aantal{margin:0 0 .5rem;font-size:.9rem;color:#555}
.item{display:grid;grid-template-columns:minmax(200px,1.2fr) 3fr;gap:1rem;padding:.75rem 0;border-bottom:1px solid #e5e7ea}
.item-kop{flex-direction:column;gap:.2rem;grid-column:1;grid-row:1}
.locatie{grid-column:1;grid-row:2;font-size:.9rem}
.item h3{font-size:1rem}
.item dl{grid-column:2;grid-row:1/3;grid-template-columns:repeat(5,auto 1fr);margin:0;font-size:.85rem}
.afstand{background:#e7f1fb;color:#0b4f96}
.chip{background:#eceff2}
a{color:#0b6bcb}
.contact{border-top:1px solid #dde1e5;background:#f1f3f5}
@media(max-width:1100px){.item dl{grid-template-columns:auto 1fr}}
@media(max-width:800px){.layout{grid-template-columns:1fr}.filters{border-right:0}.item{grid-template-columns:1fr}.item-kop,.locatie,.item dl{grid-column:1;grid-row:auto}}
`,
    },
    c: {
      naam: 'C – Zoekmachine (licht, groot zoekveld)',
      css: `
body{background:linear-gradient(#eef6f3,#fff 400px);color:#173430}
.kop{text-align:center;padding:3rem 1rem 1rem}
.kop h1{font-size:2.2rem;color:#0f6b5c}
.layout{max-width:860px;margin:0 auto;padding:0 1rem}
.vanaf{background:#fff;border-radius:16px;padding:1.25rem;box-shadow:0 6px 24px #0f6b5c22}
.vanaf label[for=f-vanaf]{font-size:1.05rem}
.vanaf input#f-vanaf{font-size:1.15rem;padding:.75rem 1rem;border-radius:99px}
.vanaf button{border-radius:99px;padding:.75rem 1.5rem}
.filters .blok:last-child{display:flex;flex-wrap:wrap;gap:.5rem;align-items:end;margin:1rem 0}
.filters .blok:last-child label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.filters .blok:last-child input,.filters .blok:last-child select{width:auto;flex:1 1 140px;border-radius:99px}
.filters .blok:last-child .secundair{margin:0;border-radius:99px}
button{background:#0f6b5c;color:#fff}.secundair{color:#0f6b5c}
.aantal{color:#4a6a65;font-size:.9rem}
.resultaten{display:flex;flex-direction:column;gap:.75rem}
.item{background:#fff;border:1px solid #d6e7e2;border-radius:14px;padding:1rem 1.25rem}
.item h3{font-size:1.15rem;color:#0f6b5c}
.item dl{grid-template-columns:repeat(2,auto 1fr)}
.afstand{background:#0f6b5c;color:#fff;font-size:1rem;padding:.25rem .75rem}
.chip{background:#dff0eb;color:#0f6b5c}
a{color:#0f6b5c}
.contact{margin-top:2rem;background:#0f6b5c;color:#fff}.contact a{color:#d5fff5}
@media(max-width:640px){.item dl{grid-template-columns:auto 1fr}}
`,
    },
  };

  function build(data, designKey, meta) {
    const design = DESIGNS[designKey] || DESIGNS.a;
    meta = Object.assign({ titel: 'Stageplaatsen', datum: new Date().toLocaleDateString('nl-NL') }, meta);
    // '<' escapen zodat data nooit uit het <script>-blok kan breken.
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.titel.replace(/</g, '&lt;')}</title>
<style>${CSS_BASIS}${design.css}</style>
</head>
<body class="ontwerp-${designKey}">
${markup(meta)}
<script id="stage-data" type="application/json">${json}<\/script>
<script>(${app.toString()})();<\/script>
</body>
</html>
`;
  }

  root.StudentPage = { build, DESIGNS, BEHEERDER };
  if (typeof module !== 'undefined') module.exports = root.StudentPage;
})(typeof window !== 'undefined' ? window : globalThis);
