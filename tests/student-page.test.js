// Run with: node --test tests/student-page.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const StudentPage = require('../student.js');
const root = path.join(__dirname, '..');
const sample = JSON.parse(fs.readFileSync(path.join(root, 'data/voorbeeld.json'), 'utf8'));

test('export uses the selected mockup styles and controls', () => {
  const html = StudentPage.build(sample, { titel: 'Stageplaatsen', datum: '01-01-2026' });
  const mockup = fs.readFileSync(path.join(root, 'mockups/ontwerp-a.html'), 'utf8');
  const styles = (source) => source.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.equal(styles(html), styles(mockup));
  assert.match(html, /<body class="ontwerp-a">/);
  assert.match(html, /id="f-postcode" placeholder="bijv\. 3011 AA"/);
  assert.match(html, /class="sort-controls">\s*<label for="f-sort">Sorteer resultaten op<\/label>/);
  assert.match(html, /href="mailto:enkoc@hr.nl"/);
  assert.match(html, /aria-label="QR-code: mail naar enkoc@hr.nl"/);
  assert.doesNotMatch(html, /<script src=|<link /);
  assert.equal(StudentPage.DESIGNS, undefined);
});

test('embedded JSON cannot close its script element', () => {
  const records = [{ ...sample[0], stageplaats: '</script><script>alert(1)</script>' }];
  const html = StudentPage.build(records);
  const embedded = html.match(/<script id="stage-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(embedded, /</);
  assert.deepEqual(JSON.parse(embedded), records);
});

test('admin preview and export share the single-design builder', () => {
  const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.doesNotMatch(html, /id="ontwerp"|StudentPage\.DESIGNS/);
  assert.match(html, /StudentPage\.build\(data\.map\(\(\{ id, \.\.\.rest \}\) => rest\)\)/);
});
