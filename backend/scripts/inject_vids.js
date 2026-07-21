const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');

const rootDir = path.join(__dirname, '..', '..');

// Generate short random ID
function generateVid() {
  return 'v-' + crypto.randomBytes(4).toString('hex');
}

function processHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  
  let modifiedCount = 0;

  for (const file of files) {
    // Skip backend and other dirs
    if (file === 'backend' || file === 'node_modules' || file.startsWith('.')) continue;

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      modifiedCount += processHtmlFiles(fullPath);
    } else if (file.endsWith('.html')) {
      const html = fs.readFileSync(fullPath, 'utf8');
      const $ = cheerio.load(html, { decodeEntities: false });
      
      let modified = false;

      // Select elements that typically hold content
      $('h1, h2, h3, h4, h5, h6, p, a, img, button, section, .editable').each((i, el) => {
        const $el = $(el);
        if (!$el.attr('data-vid')) {
          $el.attr('data-vid', generateVid());
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, $.html(), 'utf8');
        console.log(`Injected VIDs into: ${file}`);
        modifiedCount++;
      }
    }
  }
  return modifiedCount;
}

console.log('Scanning for HTML files to inject VIDs...');
const count = processHtmlFiles(rootDir);
console.log(`Done! Modified ${count} files.`);
