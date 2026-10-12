// Genereert mockups/ontwerp-{a,b,c}.html uit data/voorbeeld.json.  Gebruik: node scripts/build-mockups.js
const fs = require('fs');
const path = require('path');
const StudentPage = require('../student.js');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'voorbeeld.json'), 'utf8'));
for (const key of Object.keys(StudentPage.DESIGNS)) {
  const out = path.join(root, 'mockups', `ontwerp-${key}.html`);
  fs.writeFileSync(out, StudentPage.build(data, key, { titel: `Stageplaatsen (mockup ${key.toUpperCase()})` }));
  console.log('Geschreven:', path.relative(root, out));
}
