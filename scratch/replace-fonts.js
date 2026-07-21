const fs = require('fs');

const cssPath = 'styles.css';
let content = fs.readFileSync(cssPath, 'utf8');

// Replace standard font family declarations with the token
const oldFontStr = 'font-family: "IBM Plex Sans Arabic", Tahoma, Arial, sans-serif;';
const newFontStr = 'font-family: var(--font-primary, "IBM Plex Sans Arabic"), Tahoma, Arial, sans-serif;';

let count = 0;
while (content.includes(oldFontStr)) {
  content = content.replace(oldFontStr, newFontStr);
  count++;
}

fs.writeFileSync(cssPath, content, 'utf8');
console.log(`Replaced ${count} font-family occurrences.`);
