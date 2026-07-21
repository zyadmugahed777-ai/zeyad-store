const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/played/Zeyad For Business';
const htmlFiles = fs.readdirSync(projectRoot).filter(f => f.endsWith('.html'));

let fixedFilesCount = 0;

for (const file of htmlFiles) {
    const filePath = path.join(projectRoot, file);
    let html = fs.readFileSync(filePath, 'utf8');
    
    // Check if products_db.js is missing
    if (!html.includes('products_db.js') && html.includes('zfb-core.js')) {
        // Inject products_db.js right before zfb-core.js
        html = html.replace(
            /<script src="zfb-core\.js"/,
            '<script src="products_db.js"></script>\n<script src="zfb-core.js"'
        );
        fs.writeFileSync(filePath, html, 'utf8');
        fixedFilesCount++;
    }
}

console.log(`✅ Injected products_db.js into ${fixedFilesCount} HTML files.`);
