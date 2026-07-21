const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
let count = 0;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'backend', '.agents', '.git', 'assets', 'scratch', 'tests', 'backups', 'db'].includes(file)) {
        processDirectory(fullPath);
      }
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (!content.includes('assets/js/core/theme-engine.js')) {
        const parts = content.split('<link rel="stylesheet" href="styles.css');
        if (parts.length > 1) {
          content = parts.join('<script src="assets/js/core/theme-engine.js"></script>\n    <link rel="stylesheet" href="styles.css');
          fs.writeFileSync(fullPath, content, 'utf8');
          count++;
        }
      }
    }
  }
}

processDirectory(rootDir);
console.log(`Injected theme-engine.js into ${count} HTML files.`);
