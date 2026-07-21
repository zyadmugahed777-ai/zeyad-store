const fs = require('fs');
const cssPath = 'styles.css';
let content = fs.readFileSync(cssPath, 'utf8');

// Replace card paddings
content = content.replace(/\.glass-card \{[^}]*padding:\s*24px/g, match => match.replace('padding: 24px', 'padding: var(--density-padding, 24px)'));
content = content.replace(/\.product-body \{[^}]*padding:\s*16px 20px 20px/g, match => match.replace('padding: 16px 20px 20px', 'padding: var(--density-padding, 16px) 20px 20px'));

// Add variables to :root if not present
if (!content.includes('--density-padding: 16px')) {
  content = content.replace(':root {', ':root {\n  --density-padding: 16px;\n  --density-gap: 16px;');
}

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Replaced density paddings with variables.');
