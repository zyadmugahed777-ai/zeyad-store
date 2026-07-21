const fs = require('fs');

const cssPath = 'styles.css';
let content = fs.readFileSync(cssPath, 'utf8');

const additionalMobileCSS = `
  /* Additional Mobile Slider Fix */
  .horizontal-cards .product-card {
    flex: 0 0 calc(65% - 12px) !important;
    min-width: 0 !important;
  }
  
  .horizontal-cards {
    gap: 12px !important;
    padding-bottom: 16px !important;
  }
  
  /* Fix category cards */
  .category-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }
  .category-card {
    min-height: 120px !important;
    padding: 16px !important;
  }
`;

// Insert the new rules before the final closing brace of the mobile media query
const lastBraceIndex = content.lastIndexOf('}');
if (lastBraceIndex !== -1) {
  content = content.substring(0, lastBraceIndex) + additionalMobileCSS + '}\n';
  fs.writeFileSync(cssPath, content, 'utf8');
  console.log('Appended extra slider CSS');
}
