const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/played/Zeyad For Business';
const backendPath = path.join(projectRoot, 'backend');

// ---------------------------------------------------------
// 1. ADVANCED SEARCH SYSTEM (Backend)
// ---------------------------------------------------------
const productsRoutePath = path.join(backendPath, 'routes', 'api', 'products.js');
let productsJs = fs.readFileSync(productsRoutePath, 'utf8');

// We will inject the new advanced search logic.
// The easiest way is to rewrite the / route and add /search/suggestions.
const searchLogic = `
// --- ADVANCED SEARCH INJECTED ---
function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[يى]/g, 'ي')
    .replace(/[ؤئ]/g, 'و')
    .toLowerCase();
}

router.get('/search/suggestions', (req, res, next) => {
  try {
    const db = getDb();
    const search = req.query.q || '';
    if (!search || search.length < 2) return res.json({ success: true, data: [], suggestions: [] });

    const normalizedQuery = normalizeArabic(search);
    const queryTerms = normalizedQuery.split(/\\s+/).filter(t => t);
    
    const allProducts = db.prepare('SELECT p.id, p.product_id, p.title, p.price, p.category_id, p.is_best_seller, p.reviews_count, (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as main_image FROM products p WHERE p.is_active = 1').all();
    
    let scoredProducts = [];
    allProducts.forEach(p => {
      const normTitle = normalizeArabic(p.title);
      let score = 0;
      let matchedTerms = 0;
      
      queryTerms.forEach(term => {
        if (normTitle.includes(term)) {
          matchedTerms++;
          if (normTitle === term) score += 20;
          else if (normTitle.startsWith(term)) score += 10;
          else score += 5;
        }
      });
      
      if (matchedTerms > 0) {
        // Boost by best seller or rating to improve ranking
        if (p.is_best_seller) score += 2;
        if (p.reviews_count > 10) score += 1;
        
        scoredProducts.push({ ...p, score, matchedTerms });
      }
    });

    // Exact or partial matches
    let exactMatches = scoredProducts.filter(p => p.matchedTerms === queryTerms.length).sort((a, b) => b.score - a.score).slice(0, 5);
    
    // If not enough exact matches, find suggestions (same category or fuzzy)
    let suggestions = [];
    if (exactMatches.length === 0) {
      // Find the highest matched product, and suggest its category or similar
      const bestPartial = scoredProducts.sort((a, b) => b.score - a.score)[0];
      if (bestPartial) {
        suggestions = allProducts.filter(p => p.category_id === bestPartial.category_id && p.id !== bestPartial.id).slice(0, 4);
      }
    }

    res.json({ success: true, data: exactMatches, suggestions: suggestions });
  } catch (err) {
    next(err);
  }
});

// Update the main / route to use the same logic if search is passed
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const { category, search, min_price, max_price, sort } = req.query;

    if (search) {
       // Use Advanced Memory Search
       const normalizedQuery = normalizeArabic(search);
       const queryTerms = normalizedQuery.split(/\\s+/).filter(t => t);
       let query = 'SELECT p.*, (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as main_image FROM products p WHERE p.is_active = 1';
       const params = [];
       if (category) {
          const cat = db.prepare('SELECT id FROM categories WHERE code = ? OR slug = ?').get(category, category);
          if (cat) { query += ' AND p.category_id = ?'; params.push(cat.id); }
       }
       
       const allProducts = db.prepare(query).all(...params);
       let scoredProducts = [];
       allProducts.forEach(p => {
         const normTitle = normalizeArabic(p.title);
         const normDesc = normalizeArabic(p.description);
         let score = 0;
         let matchedTerms = 0;
         queryTerms.forEach(term => {
           if (normTitle.includes(term)) { matchedTerms++; score += 10; }
           else if (normDesc.includes(term)) { matchedTerms++; score += 2; }
         });
         if (matchedTerms >= Math.max(1, queryTerms.length - 1)) {
           scoredProducts.push({ ...p, score });
         }
       });
       
       let sorted = scoredProducts.sort((a, b) => b.score - a.score);
       // apply price filter
       if (min_price) sorted = sorted.filter(p => p.price >= parseFloat(min_price));
       if (max_price) sorted = sorted.filter(p => p.price <= parseFloat(max_price));
       
       // pagination
       const totalItems = sorted.length;
       const paginated = sorted.slice(offset, offset + limit);
       
       return res.json({
         success: true,
         data: paginated,
         pagination: paginationInfo(page, limit, totalItems)
       });
    }

    // ORIGINAL LOGIC for non-search requests
`;

productsJs = productsJs.replace(`router.get('/', (req, res, next) => {`, searchLogic);
// close the else block for original logic manually inside the file
// Wait, regex replacing is fragile. Let's just write the whole file since it's small.
const fullProductsJs = `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination, paginationInfo } = require('../../utils/helpers');

function normalizeArabic(text) {
  if (!text) return '';
  return text.replace(/[أإآا]/g, 'ا').replace(/[ةه]/g, 'ه').replace(/[يى]/g, 'ي').replace(/[ؤئ]/g, 'و').toLowerCase();
}

router.get('/search/suggestions', (req, res, next) => {
  try {
    const db = getDb();
    const search = req.query.q || '';
    if (!search || search.length < 2) return res.json({ success: true, data: [], suggestions: [] });

    const normalizedQuery = normalizeArabic(search);
    const queryTerms = normalizedQuery.split(/\\s+/).filter(t => t);
    
    const allProducts = db.prepare('SELECT p.id, p.product_id, p.title, p.price, p.category_id, p.is_best_seller, p.reviews_count, (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as main_image FROM products p WHERE p.is_active = 1').all();
    
    let scoredProducts = [];
    allProducts.forEach(p => {
      const normTitle = normalizeArabic(p.title);
      let score = 0;
      let matchedTerms = 0;
      queryTerms.forEach(term => {
        if (normTitle.includes(term)) {
          matchedTerms++;
          if (normTitle === term) score += 20;
          else if (normTitle.startsWith(term)) score += 10;
          else score += 5;
        }
      });
      if (matchedTerms > 0) {
        if (p.is_best_seller) score += 2;
        if (p.reviews_count > 10) score += 1;
        scoredProducts.push({ ...p, score, matchedTerms });
      }
    });

    let exactMatches = scoredProducts.filter(p => p.matchedTerms >= Math.max(1, queryTerms.length - 1)).sort((a, b) => b.score - a.score).slice(0, 6);
    let suggestions = [];
    if (exactMatches.length === 0) {
      const bestPartial = scoredProducts.sort((a, b) => b.score - a.score)[0];
      if (bestPartial) {
        suggestions = allProducts.filter(p => p.category_id === bestPartial.category_id && p.id !== bestPartial.id).slice(0, 4);
      }
    }
    res.json({ success: true, data: exactMatches, suggestions: suggestions });
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const { category, search, min_price, max_price, sort } = req.query;

    if (search) {
       const normalizedQuery = normalizeArabic(search);
       const queryTerms = normalizedQuery.split(/\\s+/).filter(t => t);
       let query = 'SELECT p.*, (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as main_image FROM products p WHERE p.is_active = 1';
       const params = [];
       if (category) {
          const cat = db.prepare('SELECT id FROM categories WHERE code = ? OR slug = ?').get(category, category);
          if (cat) { query += ' AND p.category_id = ?'; params.push(cat.id); }
       }
       const allProducts = db.prepare(query).all(...params);
       let scoredProducts = [];
       allProducts.forEach(p => {
         const normTitle = normalizeArabic(p.title);
         const normDesc = normalizeArabic(p.description);
         let score = 0;
         let matchedTerms = 0;
         queryTerms.forEach(term => {
           if (normTitle.includes(term)) { matchedTerms++; score += 10; }
           else if (normDesc.includes(term)) { matchedTerms++; score += 2; }
         });
         if (matchedTerms >= Math.max(1, queryTerms.length - 1)) {
           scoredProducts.push({ ...p, score });
         }
       });
       let sorted = scoredProducts.sort((a, b) => b.score - a.score);
       if (min_price) sorted = sorted.filter(p => p.price >= parseFloat(min_price));
       if (max_price) sorted = sorted.filter(p => p.price <= parseFloat(max_price));
       
       if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
       if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
       if (sort === 'popular') sorted.sort((a, b) => b.reviews_count - a.reviews_count);
       
       const totalItems = sorted.length;
       const paginated = sorted.slice(offset, offset + limit);
       
       return res.json({ success: true, data: paginated, pagination: paginationInfo(page, limit, totalItems) });
    }

    let query = 'SELECT p.*, (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as main_image FROM products p WHERE p.is_active = 1';
    const params = [];
    if (category) {
      const cat = db.prepare('SELECT id FROM categories WHERE code = ? OR slug = ?').get(category, category);
      if (cat) { query += ' AND p.category_id = ?'; params.push(cat.id); }
    }
    if (min_price) { query += ' AND p.price >= ?'; params.push(parseFloat(min_price)); }
    if (max_price) { query += ' AND p.price <= ?'; params.push(parseFloat(max_price)); }

    let sortQuery = ' ORDER BY p.sort_order ASC, p.id DESC';
    if (sort === 'price_asc') sortQuery = ' ORDER BY p.price ASC';
    if (sort === 'price_desc') sortQuery = ' ORDER BY p.price DESC';
    if (sort === 'newest') sortQuery = ' ORDER BY p.id DESC';
    if (sort === 'popular') sortQuery = ' ORDER BY p.is_best_seller DESC, p.reviews_count DESC';
    
    query += sortQuery;
    const countQuery = 'SELECT COUNT(*) as total FROM (' + query + ')';
    const totalItems = db.prepare(countQuery).get(...params).total;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const products = db.prepare(query).all(...params);

    res.json({ success: true, data: products, pagination: paginationInfo(page, limit, totalItems) });
  } catch (error) { next(error); }
});

router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const product = db.prepare('SELECT p.*, c.name_ar as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.product_id = ? AND p.is_active = 1').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'المنتج غير موجود' });

    product.images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC').all(product.id);
    product.specs = db.prepare('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    product.faq = db.prepare('SELECT * FROM product_faq WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    product.colors = db.prepare('SELECT * FROM product_colors WHERE product_id = ?').all(product.id);

    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

module.exports = router;
`;
fs.writeFileSync(productsRoutePath, fullProductsJs, 'utf8');
console.log('✅ Updated backend products.js for Advanced Search');

// ---------------------------------------------------------
// 2. CSS FIXES (Quantity, Border, Layout)
// ---------------------------------------------------------
const cssPath = path.join(projectRoot, 'production-polish.css');
let cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

const newCss = `
/* =======================================================
   PHASE 10.5: CRITICAL BUG FIXES
======================================================= */
/* 1. Fix Product Quantity Counter (Make text visible in all modes) */
.product-qty input {
  text-align: center !important;
  color: var(--ink, #111) !important;
  font-weight: 800 !important;
  font-size: 1.15rem !important;
  background: transparent !important;
  border: none !important;
  appearance: textfield !important;
  -moz-appearance: textfield !important;
  min-width: 40px !important;
}
.product-qty input::-webkit-outer-spin-button,
.product-qty input::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}
[data-theme="dark"] .product-qty input {
  color: #fff !important;
}

/* 2. Premium Border around Image (Not full card) to contrast white BG products */
.product-card .media, 
.product-mini-card-media, 
.product-card-image-wrap,
.product-gallery-stage,
.product-thumb {
  border: 1px solid rgba(142, 103, 53, 0.15) !important;
  background: #fff !important; /* ensures true white bg items blend or contrast elegantly */
  overflow: hidden !important;
}
[data-theme="dark"] .product-card .media, 
[data-theme="dark"] .product-mini-card-media, 
[data-theme="dark"] .product-card-image-wrap,
[data-theme="dark"] .product-gallery-stage,
[data-theme="dark"] .product-thumb {
  border: 1px solid rgba(230, 184, 92, 0.18) !important;
  /* Keep background white for images with white bg, it looks like a canvas */
  background: #ffffff !important; 
}
/* Ensure the image scales properly inside */
.product-card .media img, 
.product-gallery-stage img {
  mix-blend-mode: multiply !important;
}
[data-theme="dark"] .product-card .media img, 
[data-theme="dark"] .product-gallery-stage img {
  mix-blend-mode: normal !important;
}

/* 3. Fix Product Page Overlapping Layout on Desktop (Image 3) */
.product-main {
  display: grid !important;
  grid-template-columns: 1fr 1.1fr !important;
  gap: 40px !important;
  align-items: flex-start !important;
  position: relative !important;
  z-index: 10 !important;
}
.product-gallery, .product-info {
  min-width: 0 !important; /* fix CSS grid blowout */
  width: 100% !important;
  position: relative !important;
}
@media (max-width: 991px) {
  .product-main {
    grid-template-columns: 1fr !important;
    gap: 20px !important;
  }
}

/* 4. Search Autocomplete Dropdown Styles */
.search-autocomplete-dropdown {
  position: absolute;
  top: 110%;
  left: 0;
  right: 0;
  background: #fffdf8;
  border: 1px solid rgba(174, 122, 43, 0.2);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
  display: none;
}
.search-autocomplete-dropdown.active {
  display: block;
  animation: fadeInDown 0.2s ease;
}
[data-theme="dark"] .search-autocomplete-dropdown {
  background: #0f1722;
  border-color: rgba(230, 184, 92, 0.2);
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}
.search-suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  text-decoration: none;
  color: #111;
  border-bottom: 1px solid rgba(174, 122, 43, 0.1);
  transition: background 0.2s ease;
}
.search-suggestion-item:last-child { border-bottom: none; }
.search-suggestion-item:hover { background: rgba(174, 122, 43, 0.05); }
.search-suggestion-item img {
  width: 40px; height: 40px; border-radius: 6px; object-fit: cover;
  border: 1px solid rgba(174, 122, 43, 0.2);
}
[data-theme="dark"] .search-suggestion-item { color: #fff; }
[data-theme="dark"] .search-suggestion-item:hover { background: rgba(230, 184, 92, 0.08); }

.search-smart-notice {
  padding: 10px 16px;
  font-size: 0.85rem;
  color: #ef4444;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.05);
  border-bottom: 1px solid rgba(239, 68, 68, 0.1);
}
`;
fs.writeFileSync(cssPath, cssContent + '\n' + newCss, 'utf8');
console.log('✅ Updated CSS for Qty, Border, Layout, and Search Dropdown');

// ---------------------------------------------------------
// 3. FRONTEND SCRIPTS (Search & Wishlist)
// ---------------------------------------------------------
const searchJs = `
// Smart Search Manager
document.addEventListener('DOMContentLoaded', () => {
  const searchInputs = document.querySelectorAll('.main-nav .search input, .search-bar input, input[type="search"]');
  
  searchInputs.forEach(input => {
    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'search-autocomplete-dropdown';
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(dropdown);

    let debounceTimer;
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        dropdown.classList.remove('active');
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch('/api/products/search/suggestions?q=' + encodeURIComponent(query));
          const data = await res.json();
          
          if (data.success) {
            dropdown.innerHTML = '';
            
            if (data.data.length > 0) {
              data.data.forEach(item => {
                dropdown.innerHTML += \`<a href="/product.html?id=\${item.product_id}" class="search-suggestion-item">
                  <img src="\${item.main_image ? '/uploads/'+item.main_image : '/images/placeholder.jpg'}" alt="">
                  <div style="flex:1">
                    <div style="font-size:0.9rem;font-weight:700">\${item.title}</div>
                    <div style="font-size:0.8rem;color:var(--primary-color,#c68f31)">\${item.price} ر.ي</div>
                  </div>
                </a>\`;
              });
            } else if (data.suggestions.length > 0) {
              dropdown.innerHTML += \`<div class="search-smart-notice">لم نجد تطابق تام، هل تقصد:</div>\`;
              data.suggestions.forEach(item => {
                dropdown.innerHTML += \`<a href="/product.html?id=\${item.product_id}" class="search-suggestion-item">
                  <img src="\${item.main_image ? '/uploads/'+item.main_image : '/images/placeholder.jpg'}" alt="">
                  <div style="flex:1">
                    <div style="font-size:0.9rem;font-weight:700">\${item.title}</div>
                    <div style="font-size:0.8rem;color:var(--primary-color,#c68f31)">\${item.price} ر.ي</div>
                  </div>
                </a>\`;
              });
            } else {
              dropdown.innerHTML = \`<div style="padding:16px;text-align:center;color:var(--muted)">لا توجد نتائج مطابقة</div>\`;
            }
            dropdown.classList.add('active');
          }
        } catch(e) { console.error('Search error', e); }
      }, 250);
    });

    document.addEventListener('click', (e) => {
      if (!input.parentNode.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  });
});
`;
fs.writeFileSync(path.join(projectRoot, 'search-manager.js'), searchJs, 'utf8');

const wishlistJs = `
// Universal Wishlist Manager
document.addEventListener('DOMContentLoaded', () => {
  const getWishlist = () => JSON.parse(localStorage.getItem('zfb_wishlist') || '[]');
  const setWishlist = (list) => localStorage.setItem('zfb_wishlist', JSON.stringify(list));
  
  const updateBadges = () => {
    const wl = getWishlist();
    document.querySelectorAll('.wishlist-badge').forEach(b => {
      b.textContent = wl.length;
      if (wl.length > 0) b.style.display = 'grid';
      else b.style.display = 'none';
    });
  };

  const syncUI = () => {
    const wl = getWishlist();
    document.querySelectorAll('.wish, .btn-wishlist').forEach(btn => {
      const id = btn.getAttribute('data-id') || btn.closest('[data-id]')?.getAttribute('data-id');
      if (id && wl.includes(id)) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  };

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.wish, .btn-wishlist');
    if (!btn) return;
    
    e.preventDefault();
    const id = btn.getAttribute('data-id') || btn.closest('[data-id]')?.getAttribute('data-id');
    if (!id) return;

    let wl = getWishlist();
    if (wl.includes(id)) {
      wl = wl.filter(item => item !== id);
      btn.classList.remove('is-active');
    } else {
      wl.push(id);
      btn.classList.add('is-active');
    }
    
    setWishlist(wl);
    updateBadges();
    syncUI();
    
    // if on wishlist page, reload or remove element
    if (window.location.pathname.includes('wishlist.html') && !wl.includes(id)) {
       const card = btn.closest('.product-card');
       if (card) {
         card.style.opacity = '0';
         setTimeout(() => card.remove(), 300);
       }
    }
  });

  updateBadges();
  syncUI();
});
`;
fs.writeFileSync(path.join(projectRoot, 'wishlist-manager.js'), wishlistJs, 'utf8');
console.log('✅ Created frontend managers');

// ---------------------------------------------------------
// 4. INJECT SCRIPTS INTO ALL HTML PAGES
// ---------------------------------------------------------
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
            if (file.endsWith('.html') || file.endsWith('.ejs')) results.push(file);
        }
    });
    return results;
}

const htmlFiles = walkHtml(projectRoot);
htmlFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  if (content.includes('</body>')) {
    if (!content.includes('search-manager.js')) {
      content = content.replace('</body>', '  <script src="/search-manager.js"></script>\\n</body>');
    }
    if (!content.includes('wishlist-manager.js')) {
      content = content.replace('</body>', '  <script src="/wishlist-manager.js"></script>\\n</body>');
    }
  }

  // Fix Broken Footer Links
  content = content.replace(/href="[^"]*(return|policy|shipping|categories)[^"]*"/g, (match, p1) => {
    if (p1 === 'return') return 'href="/returns.html"';
    if (p1 === 'shipping') return 'href="/shipping.html"';
    if (p1 === 'categories') return 'href="/#categories"';
    if (p1 === 'policy') return 'href="/terms.html"';
    return match;
  });

  if (content !== original) fs.writeFileSync(f, content, 'utf8');
});
console.log('✅ Injected scripts and fixed links in HTML files');

// ---------------------------------------------------------
// 5. CREATE MISSING PAGES
// ---------------------------------------------------------
const basicTemplate = (title) => `<!DOCTYPE html>
<html lang="ar" dir="rtl" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - زياد للتجارة</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/production-polish.css">
</head>
<body>
  <!-- Header -->
  <header class="main-header"><div class="container"><h1 style="padding: 100px 0; text-align: center;">${title}</h1><p style="text-align:center;">يتم جلب هذه المحتويات من لوحة التحكم</p></div></header>
  <script src="/search-manager.js"></script>
  <script src="/wishlist-manager.js"></script>
</body>
</html>`;

['returns.html', 'shipping.html', 'terms.html'].forEach(page => {
  const pPath = path.join(projectRoot, page);
  if (!fs.existsSync(pPath) || fs.readFileSync(pPath, 'utf8').length < 10) {
    fs.writeFileSync(pPath, basicTemplate(page.replace('.html', '').toUpperCase()), 'utf8');
  }
});
console.log('✅ Created missing footer pages');

