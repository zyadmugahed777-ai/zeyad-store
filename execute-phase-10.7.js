const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/played/Zeyad For Business';

// ------------------------------------------------------------------
// 1. FIX PRODUCT CARDS CSS GLOBALLY (Zero Errors, Perfect Layout)
// ------------------------------------------------------------------
const cssPath = path.join(projectRoot, 'production-polish.css');
let css = fs.readFileSync(cssPath, 'utf8');

const uiFixCss = `
/* ========================================================================= */
/* PHASE 10.7: EMERGENCY PRODUCT CARD UI OVERHAUL (Zero Overlaps, Mobile 1st) */
/* ========================================================================= */
.product-card {
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    background: var(--surface) !important;
    box-shadow: 0 4px 14px rgba(0,0,0,0.04) !important;
}
.product-card .product-photo-link, 
.product-card .media, 
.product-card .product-card-image-wrap {
    position: relative !important;
    display: block !important;
    width: 100% !important;
    aspect-ratio: 1/1 !important; /* Perfect square image dominating the card */
    margin: 0 !important;
    padding: 0 !important;
    background: #f9f9f9 !important;
    border: none !important;
}
.product-card img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
}
.product-card .product-body {
    position: static !important; /* Critical to break bad stacking contexts */
    padding: 12px !important;
    display: flex !important;
    flex-direction: column !important;
    flex-grow: 1 !important;
    gap: 8px !important;
}
.product-card .product-body h3 {
    font-size: 0.95rem !important;
    line-height: 1.4 !important;
    margin: 0 !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    color: var(--ink) !important;
    font-weight: 600 !important;
    text-align: right !important;
}

/* Position Wishlist and Badge relative to the WHOLE CARD, over the IMAGE */
.product-card .wish {
    position: absolute !important;
    top: 8px !important;
    left: 8px !important; /* Top Left for RTL */
    right: auto !important;
    z-index: 10 !important;
    width: 32px !important;
    height: 32px !important;
    border-radius: 50% !important;
    background: rgba(255,255,255,0.95) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    border: 1px solid rgba(0,0,0,0.05) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
    color: var(--ink) !important;
}
.product-card .wish svg {
    width: 16px !important;
    height: 16px !important;
}
.product-card .wish.is-active svg {
    fill: #ef4444 !important;
    stroke: #ef4444 !important;
    color: #ef4444 !important;
}
[data-theme="dark"] .product-card .wish {
    background: rgba(30,41,59,0.9) !important;
    border-color: rgba(255,255,255,0.1) !important;
    color: #cbd5e1 !important;
}

/* Discount Tag */
.product-card .discount-tag, 
.product-card .premium-badge,
.product-card .badge-discount {
    position: absolute !important;
    top: 8px !important;
    right: 8px !important; /* Top Right for RTL */
    left: auto !important;
    z-index: 10 !important;
    background: #ef4444 !important;
    color: #fff !important;
    font-weight: 700 !important;
    font-size: 0.75rem !important;
    padding: 4px 8px !important;
    border-radius: 4px !important;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}

/* Price block */
.product-card .price {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 6px !important;
    margin-top: auto !important;
}
.product-card .price strong {
    font-size: 1.05rem !important;
    color: var(--gold) !important;
}
.product-card .price del {
    font-size: 0.8rem !important;
    color: var(--muted) !important;
}

/* Action buttons */
.product-card .btn-add-cart-mini,
.product-card .add-cart,
.product-card .btn-cart {
    width: 100% !important;
    padding: 8px !important;
    border-radius: 8px !important;
    font-size: 0.85rem !important;
    font-weight: 700 !important;
    margin-top: 8px !important;
    background: linear-gradient(180deg, #ffd700, #c68f31) !important;
    color: #1a1510 !important;
    border: none !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 6px !important;
}

.product-card .stock {
    margin-top: 0 !important;
    display: flex !important;
    flex-direction: column !important;
}

/* Mobile specific tweaks (80% traffic) */
@media (max-width: 768px) {
    .product-slider .product-card,
    .collection-cards-grid .product-card,
    .visual-product-grid .product-card {
        flex: 0 0 calc(50% - 8px) !important; /* Enforce 2 items per row max */
        min-width: 140px !important;
    }
    .product-card .product-body h3 {
        font-size: 0.85rem !important;
    }
    .product-card .price strong {
        font-size: 0.95rem !important;
    }
    .product-card .price del {
        font-size: 0.75rem !important;
    }
    .product-card .btn-add-cart-mini {
        padding: 6px !important;
        font-size: 0.75rem !important;
    }
}
`;

if (!css.includes('PHASE 10.7')) {
    fs.appendFileSync(cssPath, '\n' + uiFixCss, 'utf8');
    console.log('✅ Injected Phase 10.7 CSS Overhaul for Product Cards');
}

// ------------------------------------------------------------------
// 2. FIX SEARCH PAGE DISCOVERY (Keep suggestions, offers visible)
// ------------------------------------------------------------------
const searchPageJsPath = path.join(projectRoot, 'search-page.js');
let searchPageJs = fs.readFileSync(searchPageJsPath, 'utf8');

// Stop hiding the discovery sections
if (searchPageJs.includes("document.querySelectorAll('.discovery-section, .horizontal-scroll-section').forEach(el => el.style.display = 'none');")) {
    searchPageJs = searchPageJs.replace(
        "document.querySelectorAll('.discovery-section, .horizontal-scroll-section').forEach(el => el.style.display = 'none');",
        "// We no longer hide discovery sections. We want customers to dive into offers!"
    );
}

// Ensure the dynamic search results are inserted directly AFTER the hero, NOT at the bottom
if (searchPageJs.includes("main.appendChild(resultsContainer);")) {
    searchPageJs = searchPageJs.replace(
        "main.appendChild(resultsContainer);",
        `
        const hero = main.querySelector('.premium-search-hero');
        if (hero && hero.nextSibling) {
            main.insertBefore(resultsContainer, hero.nextSibling);
        } else {
            main.appendChild(resultsContainer);
        }
        `
    );
}

fs.writeFileSync(searchPageJsPath, searchPageJs, 'utf8');
console.log('✅ Fixed search-page.js to preserve discovery and offers');

// We should also make sure search.html actually has cool discovery sections
const searchHtmlPath = path.join(projectRoot, 'search.html');
let searchHtml = fs.readFileSync(searchHtmlPath, 'utf8');
if (!searchHtml.includes('احدث التخفيضات')) {
    // Add a quick offers banner section below the discovery if it doesn't exist
    const offersSection = `
        <!-- Special Offers Section for Search Page -->
        <section class="discovery-section" style="margin-top: 32px; background: var(--surface); padding: 24px; border-radius: 16px;">
            <h2 class="search-chips-title" style="margin-bottom: 20px; color: #ef4444;">🔥 عروضات خاصة واحدث التخفيضات</h2>
            <div style="display:flex; gap: 16px; overflow-x: auto; padding-bottom: 12px; scroll-snap-type: x mandatory;">
                <a href="offers.html" style="min-width: 280px; flex:1; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 12px; padding: 20px; color: #fff; text-decoration: none; scroll-snap-align: start;">
                    <h3 style="margin:0 0 8px; color: var(--gold);">تخفيضات المطابخ</h3>
                    <p style="margin:0 0 16px; font-size:0.9rem; color:#cbd5e1;">خصم يصل إلى 40% على جميع مطابخ الألمنيوم والخشب.</p>
                    <span style="display:inline-block; padding:6px 12px; background:var(--gold); color:#000; font-weight:bold; border-radius:6px; font-size:0.8rem;">تسوق الآن</span>
                </a>
                <a href="offers.html" style="min-width: 280px; flex:1; background: linear-gradient(135deg, #451a03, #78350f); border-radius: 12px; padding: 20px; color: #fff; text-decoration: none; scroll-snap-align: start;">
                    <h3 style="margin:0 0 8px; color: var(--gold);">عروض الأجهزة الكهربائية</h3>
                    <p style="margin:0 0 16px; font-size:0.9rem; color:#cbd5e1;">اشتري ثلاجة واحصل على غلاية مجاناً لفترة محدودة.</p>
                    <span style="display:inline-block; padding:6px 12px; background:var(--gold); color:#000; font-weight:bold; border-radius:6px; font-size:0.8rem;">تسوق الآن</span>
                </a>
                <a href="bedrooms.html" style="min-width: 280px; flex:1; background: linear-gradient(135deg, #064e3b, #065f46); border-radius: 12px; padding: 20px; color: #fff; text-decoration: none; scroll-snap-align: start;">
                    <h3 style="margin:0 0 8px; color: var(--gold);">غرف النوم الفاخرة</h3>
                    <p style="margin:0 0 16px; font-size:0.9rem; color:#cbd5e1;">تصاميم حصرية مع هدايا المراتب الطبية.</p>
                    <span style="display:inline-block; padding:6px 12px; background:var(--gold); color:#000; font-weight:bold; border-radius:6px; font-size:0.8rem;">تسوق الآن</span>
                </a>
            </div>
        </section>
    `;
    searchHtml = searchHtml.replace('<!-- Search Suggestions (demo state) -->', offersSection + '\n        <!-- Search Suggestions (demo state) -->');
    fs.writeFileSync(searchHtmlPath, searchHtml, 'utf8');
    console.log('✅ Added rich offers and discounts section to search.html');
}

console.log('All Phase 10.7 fixes applied successfully.');
