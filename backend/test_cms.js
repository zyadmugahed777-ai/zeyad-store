const fs = require('fs');
const cheerio = require('cheerio');
const { getDb } = require('./config/database');

const html = fs.readFileSync('../index.html', 'utf8');
const $ = cheerio.load(html, { decodeEntities: false });
const db = getDb();
const overrides = db.prepare('SELECT key, value, type FROM theme_content').all();

console.log(`Found ${overrides.length} overrides`);

overrides.forEach(item => {
  const el = $(`[data-vid="${item.key}"]`);
  console.log(`Key ${item.key} matched ${el.length} elements`);
  if (el.length) {
    if (item.type === 'image') el.attr('src', item.value);
    else if (item.type === 'bg-image') {
      let style = el.attr('style') || '';
      style = style.replace(/background-image:\s*url\([^)]+\);?/, '');
      el.attr('style', `background-image: url('${item.value}'); ${style}`.trim());
    }
    else if (item.type === 'link') el.attr('href', item.value);
    else el.html(item.value);
  }
});

const output = $.html();
console.log('Includes injected text?', output.includes('تسوق للمنزل بثقه'));
