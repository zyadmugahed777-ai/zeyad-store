const fs = require('fs');

const cssPath = 'styles.css';
let content = fs.readFileSync(cssPath, 'utf8');

const replacements = [
  { pattern: /#16A34A/gi, replacement: 'var(--success)' },
  { pattern: /#DC2626/gi, replacement: 'var(--danger)' },
  { pattern: /#ef4444/gi, replacement: 'var(--danger)' },
  { pattern: /#b44\b/gi, replacement: 'var(--danger)' },
  { pattern: /#f59e0b/gi, replacement: 'var(--warning)' },
  { pattern: /#fbbf24/gi, replacement: 'var(--warning)' },
];

let replacedCount = 0;

replacements.forEach(({ pattern, replacement }) => {
  const matches = content.match(pattern);
  if (matches) {
    replacedCount += matches.length;
    content = content.replace(pattern, replacement);
  }
});

fs.writeFileSync(cssPath, content, 'utf8');
console.log(`Replaced ${replacedCount} hardcoded colors with semantic variables.`);
