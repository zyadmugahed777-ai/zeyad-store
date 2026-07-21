const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/played/Zeyad For Business';

// ----------------------------------------------------
// 1. FIX SEARCH PAGE (Infinite Loop / Duplication)
// ----------------------------------------------------
const searchPageJsPath = path.join(projectRoot, 'search-page.js');
let searchPageJs = fs.readFileSync(searchPageJsPath, 'utf8');

// Remove the dangerous DOMContentLoaded dispatch that causes infinite loops
searchPageJs = searchPageJs.replace(
    /if \(window\.ZFB && window\.ZFB\.syncUI\) window\.ZFB\.syncUI\(\);\s*else document\.dispatchEvent\(new Event\('DOMContentLoaded'\)\);/g,
    `
    // Safely sync wishlist UI for new elements without re-triggering DOMContentLoaded
    const wl = JSON.parse(localStorage.getItem('zfb_wishlist') || '[]');
    document.querySelectorAll('.wish, .btn-wishlist').forEach(btn => {
        const id = btn.getAttribute('data-product-id') || btn.getAttribute('data-id') || btn.closest('[data-product-id]')?.getAttribute('data-product-id') || btn.closest('[data-id]')?.getAttribute('data-id');
        if (id && wl.includes(id)) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });
    `
);
fs.writeFileSync(searchPageJsPath, searchPageJs, 'utf8');
console.log('✅ Fixed search-page.js');

// ----------------------------------------------------
// 2. FIX GLOBAL-UX (Duplicate language switchers)
// ----------------------------------------------------
const globalUxPath = path.join(projectRoot, 'assets/js/core/global-ux.js');
let globalUx = fs.readFileSync(globalUxPath, 'utf8');

// Ensure we don't append if it already exists
if (!globalUx.includes("if (navActions.querySelector('.global-switchers')) return;")) {
    globalUx = globalUx.replace(
        "const switchersContainer = document.createElement('div');",
        "if (navActions.querySelector('.global-switchers')) return;\n    const switchersContainer = document.createElement('div');"
    );
    fs.writeFileSync(globalUxPath, globalUx, 'utf8');
    console.log('✅ Fixed global-ux.js');
}

// ----------------------------------------------------
// 3. FIX WISHLIST MANAGER (Product page targeting)
// ----------------------------------------------------
const wishlistJsPath = path.join(projectRoot, 'wishlist-manager.js');
let wishlistJs = fs.readFileSync(wishlistJsPath, 'utf8');

const oldSelector1 = "document.querySelectorAll('.wish, .btn-wishlist')";
const newSelector1 = "document.querySelectorAll('.wish, .btn-wishlist, #wishlist-btn, #gallery-favorite-btn')";

const oldSelector2 = "e.target.closest('.wish, .btn-wishlist')";
const newSelector2 = "e.target.closest('.wish, .btn-wishlist, #wishlist-btn, #gallery-favorite-btn')";

const idLogic = `
      let id = btn.getAttribute('data-product-id') || btn.getAttribute('data-id') || btn.closest('[data-product-id]')?.getAttribute('data-product-id') || btn.closest('[data-id]')?.getAttribute('data-id');
      if (!id && window.location.pathname.includes('product.html')) {
          const urlParams = new URLSearchParams(window.location.search);
          id = urlParams.get('id');
      }
`;

// Replace syncUI part
wishlistJs = wishlistJs.replace(oldSelector1, newSelector1);
wishlistJs = wishlistJs.replace(oldSelector2, newSelector2);

// Replace ID extraction logic
wishlistJs = wishlistJs.replace(
    /const id = btn\.getAttribute\('data-product-id'\) \|\| btn\.getAttribute\('data-id'\) \|\| btn\.closest\('\[data-product-id\]'\)\?\.getAttribute\('data-product-id'\) \|\| btn\.closest\('\[data-id\]'\)\?\.getAttribute\('data-id'\);/g,
    idLogic.trim()
);

// We must also handle the 'is-active' class on product page buttons 
// where they might just use CSS color instead of a specific class. 
// But let's stick to adding the class and we will update product.html CSS if needed.
const activeCSSPath = path.join(projectRoot, 'production-polish.css');
let css = fs.readFileSync(activeCSSPath, 'utf8');
if (!css.includes('#wishlist-btn.is-active svg')) {
    css += `\n#wishlist-btn.is-active svg, #gallery-favorite-btn.is-active svg { fill: #ef4444; stroke: #ef4444; color: #ef4444; }`;
    fs.writeFileSync(activeCSSPath, css, 'utf8');
}

fs.writeFileSync(wishlistJsPath, wishlistJs, 'utf8');
console.log('✅ Fixed wishlist-manager.js and button styles');
