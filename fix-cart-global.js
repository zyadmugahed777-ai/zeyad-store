const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = 'd:/played/Zeyad For Business';

// 1. Remove the inline `function addToCart(btn, e)` from ALL HTML files.
// This inline script is hijacking the global addToCart function and preventing actual cart logic.
const htmlFiles = fs.readdirSync(projectRoot).filter(f => f.endsWith('.html'));

let fixedFilesCount = 0;

for (const file of htmlFiles) {
    const filePath = path.join(projectRoot, file);
    let html = fs.readFileSync(filePath, 'utf8');
    
    // Find and remove the inline addToCart function script block
    const scriptRegex = /<script>\s*function addToCart\(btn, e\) {[\s\S]*?<\/script>/g;
    
    if (scriptRegex.test(html)) {
        html = html.replace(scriptRegex, '<!-- Inline addToCart removed to allow global site.js logic -->');
        fs.writeFileSync(filePath, html, 'utf8');
        fixedFilesCount++;
    }
}

console.log(`✅ Removed inline addToCart from ${fixedFilesCount} HTML files.`);

// 2. Fix `site.js` addToCart to properly read product data from ANY button (including wishlist pages where markup might differ)
const siteJsPath = path.join(projectRoot, 'site.js');
let siteJs = fs.readFileSync(siteJsPath, 'utf8');

// The `productFromElement` in site.js is quite strict. Let's make sure `window.addToCart` works perfectly
if (siteJs.includes('window.addToCart = function (button, event) {')) {
    siteJs = siteJs.replace(
        /window\.addToCart = function \(button, event\) \{[\s\S]*?1200\);\s*\};/m,
        `window.addToCart = function (button, event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    const original = button.innerHTML;
    
    try {
        const item = addItem(button);
        if(!item || !item.id) throw new Error("Product data missing");
        
        // Visual Feedback
        button.setAttribute("aria-live", "polite");
        button.innerHTML = "تمت الإضافة";
        button.style.backgroundColor = "#16a34a";
        
        // Bounce animation for the cart icon
        const cartIcon = document.querySelector('.cart svg, .cart-icon');
        if (cartIcon) {
            cartIcon.style.transform = 'scale(1.2)';
            setTimeout(() => { cartIcon.style.transform = 'scale(1)'; }, 200);
        }
    } catch(err) {
        console.error("Cart Error:", err);
        button.innerHTML = "خطأ";
        button.style.backgroundColor = "#ef4444";
    }

    setTimeout(() => {
        button.innerHTML = original;
        button.style.backgroundColor = "";
    }, 1200);
  };`
    );
    fs.writeFileSync(siteJsPath, siteJs, 'utf8');
    console.log('✅ Upgraded window.addToCart in site.js with better error handling and UI feedback.');
}

console.log('All cart functionality fixes applied successfully.');
