const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/played/Zeyad For Business';
const backendPath = path.join(projectRoot, 'backend');

// ==========================================
// 1. FIX WISHLIST MANAGER (Anywhere click)
// ==========================================
const wishlistJsPath = path.join(projectRoot, 'wishlist-manager.js');
let wishlistJs = fs.readFileSync(wishlistJsPath, 'utf8');

wishlistJs = wishlistJs.replace(
  /const id = btn\.getAttribute\('data-id'\) \|\| btn\.closest\('\[data-id\]'\)\?\.getAttribute\('data-id'\);/g,
  "const id = btn.getAttribute('data-product-id') || btn.getAttribute('data-id') || btn.closest('[data-product-id]')?.getAttribute('data-product-id') || btn.closest('[data-id]')?.getAttribute('data-id');"
);
fs.writeFileSync(wishlistJsPath, wishlistJs, 'utf8');
console.log('✅ Fixed Wishlist Manager (data-product-id targeting)');

// ==========================================
// 2. FIX CSS (Floating Badges, Dark Mode Backgrounds)
// ==========================================
const cssPath = path.join(projectRoot, 'production-polish.css');
let css = fs.readFileSync(cssPath, 'utf8');

const additionalCSS = `
/* --- PHASE 10.6 CRITICAL FIXES --- */
/* Fix flying cart badge (the number above the logo) */
.nav-actions .cart,
.nav-actions .wishlist-btn,
.nav-icon-btn {
    position: relative !important;
}
.nav-actions .cart b,
.wishlist-badge {
    position: absolute !important;
    top: -5px !important;
    right: -5px !important;
    background: #ef4444 !important;
    color: white !important;
    font-size: 0.7rem !important;
    min-width: 18px !important;
    height: 18px !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    font-weight: 700 !important;
}

/* Fix White Backgrounds in Dark Mode (Categories, Catalog, etc.) */
[data-theme="dark"] body,
[data-theme="dark"] .shop-shell,
[data-theme="dark"] main,
[data-theme="dark"] section,
[data-theme="dark"] .category-section,
[data-theme="dark"] .discovery-section,
[data-theme="dark"] .horizontal-scroll-section,
[data-theme="dark"] .product-page-shell,
[data-theme="dark"] .premium-search-page {
    background-color: var(--bg-dark, #0f1722) !important;
    color: var(--text-dark, #f1f5f9) !important;
}

[data-theme="dark"] .search-no-results {
    background-color: var(--surface-2-dark, #1a2235) !important;
}

/* Ensure Search Results Grid displays correctly */
.search-results-container {
    padding: 40px 0;
}
.search-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
}
`;
if (!css.includes('PHASE 10.6 CRITICAL FIXES')) {
    fs.writeFileSync(cssPath, css + '\\n' + additionalCSS, 'utf8');
}
console.log('✅ Fixed CSS (Badges + Dark Mode Backgrounds)');

// ==========================================
// 3. SEARCH PAGE LOGIC (Frontend Integration)
// ==========================================
const searchPageJsPath = path.join(projectRoot, 'search-page.js');
const searchPageJsContent = `
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    
    const input = document.getElementById('q-2') || document.getElementById('q-1');
    if (input && query) input.value = query;

    if (query) {
        // Hide static discovery sections
        document.querySelectorAll('.discovery-section, .horizontal-scroll-section').forEach(el => el.style.display = 'none');
        
        const main = document.querySelector('.premium-search-page');
        
        // Add loading state
        let resultsContainer = document.getElementById('dynamic-search-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('section');
            resultsContainer.id = 'dynamic-search-results';
            resultsContainer.className = 'search-results-container container';
            main.appendChild(resultsContainer);
        }
        
        resultsContainer.innerHTML = '<div style="text-align:center; padding: 40px;"><div class="loader" style="display:inline-block; width: 40px; height:40px; border:4px solid var(--gold); border-top-color:transparent; border-radius:50%; animation: spin 1s linear infinite;"></div><p style="margin-top:16px;">جاري البحث عن "'+query+'"...</p></div>';
        
        try {
            const res = await fetch('/api/products?search=' + encodeURIComponent(query));
            const data = await res.json();
            
            if (data.success && data.data && data.data.length > 0) {
                let html = '<h2 style="margin-bottom: 24px;">نتائج البحث عن "'+query+'" ('+data.data.length+')</h2><div class="search-results-grid">';
                
                data.data.forEach(product => {
                    html += \`
                    <article class="product-card" data-product-id="\${product.product_id}">
                      <a href="product.html?id=\${product.product_id}" class="product-photo-link" style="display:block; width:100%; aspect-ratio:4/5; flex-shrink:0; overflow:hidden;">
                        <img src="\${product.main_image ? '/uploads/'+product.main_image : '/images/placeholder.jpg'}" alt="\${product.title}" style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy">
                      </a>
                      <div class="product-body">
                        <h3>\${product.title}</h3>
                        <div class="price">
                          <strong>\${product.price} ر.س</strong>
                          \${product.old_price > product.price ? '<del>'+product.old_price+' ر.س</del>' : ''}
                        </div>
                        <div class="stock" style="margin-top:auto;">
                          <div style="display:flex; gap:8px;">
                            <button type="button" class="wish" aria-label="المفضلة" style="position:static;"><svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"></path></svg></button>
                            <button type="button" class="btn-primary btn-add-cart-mini" onclick="addToCart(this, event)">إضافة للسلة</button>
                          </div>
                        </div>
                      </div>
                    </article>
                    \`;
                });
                
                html += '</div>';
                resultsContainer.innerHTML = html;
                
                // Re-sync wishlist UI for newly loaded cards
                if (window.ZFB && window.ZFB.syncUI) window.ZFB.syncUI();
                else document.dispatchEvent(new Event('DOMContentLoaded')); // trigger wishlist manager

            } else {
                // No results
                document.querySelector('.search-no-results').style.display = 'flex';
                resultsContainer.innerHTML = '';
            }
        } catch (err) {
            console.error('Search failed:', err);
            resultsContainer.innerHTML = '<p style="text-align:center; color:red;">حدث خطأ أثناء البحث، يرجى المحاولة لاحقاً.</p>';
        }
    }
});
`;
fs.writeFileSync(searchPageJsPath, searchPageJsContent, 'utf8');
console.log('✅ Created search-page.js');

// ==========================================
// 4. INJECT SEARCH JS & FIX HEADER BUTTONS
// ==========================================
function walkHtml(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('backend\\public')) {
                results = results.concat(walkHtml(file));
            }
        } else {
            if (file.endsWith('.html')) results.push(file);
        }
    });
    return results;
}

const htmlFiles = walkHtml(projectRoot);
htmlFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  if (f.endsWith('search.html')) {
    if (!content.includes('search-page.js')) {
      content = content.replace('</body>', '  <script src="/search-page.js"></script>\\n</body>');
    }
  }

  // Ensure Cart button is in nav-actions
  // We look for </nav> and check if <a class="cart" is right before it
  if (content.includes('class="nav-actions"')) {
     let navBlockMatch = content.match(/<div class="nav-actions">([\s\S]*?)<\/nav>/);
     if (navBlockMatch) {
         let navBlock = navBlockMatch[1];
         // Check if cart icon is missing
         if (!navBlock.includes('class="cart"')) {
             // Inject it right before the closing div of nav-actions
             let cartHtml = `
          <a class="cart" href="cart.html" aria-label="السلة"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h14l-1.6 8.1a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L5.7 4H3"></path><path d="M9 21h.1M18 21h.1"></path></svg><b class="cart-badge">٠</b></a>
        </div>`;
             content = content.replace(/<\/div>\\s*<\/nav>/, cartHtml + '\\n      </nav>');
         }
     }
  }

  if (content !== original) {
      fs.writeFileSync(f, content, 'utf8');
  }
});
console.log('✅ Injected search-page.js and fixed Cart buttons in headers');
