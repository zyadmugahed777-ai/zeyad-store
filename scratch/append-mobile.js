const fs = require('fs');

const cssPath = 'styles.css';
let content = fs.readFileSync(cssPath, 'utf8');

const marker = '/* ==========================================================================\n   ZEYAD FOR BUSINESS - MOBILE FIRST NATIVE APP EXPERIENCE';
const index = content.indexOf(marker);
if (index !== -1) {
    content = content.substring(0, index);
}

const mobileCSS = `
/* ==========================================================================
   ZEYAD FOR BUSINESS - MOBILE FIRST NATIVE APP EXPERIENCE
   Strict isolation: @media (max-width: 768px)
   ========================================================================== */

@media (max-width: 768px) {
  /* --------------------------------------------------------------------------
     1. BOTTOM NAVIGATION BAR
     -------------------------------------------------------------------------- */
  
  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    background: color-mix(in srgb, var(--surface) 95%, #fff) !important;
    backdrop-filter: blur(20px) !important;
    border-top: 1px solid var(--line) !important;
    display: flex !important;
    justify-content: space-around !important;
    align-items: stretch !important;
    padding: 0 4px env(safe-area-inset-bottom, 0px) !important;
    margin: 0 !important;
    z-index: 1000 !important;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.05) !important;
    border-radius: 0 !important;
  }

  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions > a,
  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions > .dropdown-wrapper {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    flex: 1 !important;
    height: 100% !important;
    color: var(--ink-soft) !important;
    font-size: 0.65rem !important;
    font-weight: 500 !important;
    text-decoration: none !important;
    background: transparent !important;
    border: none !important;
    margin: 0 !important;
    padding: 8px 4px !important;
    border-radius: 0 !important;
  }
  
  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions > a:not(.nav-icon-btn):not(.nav-account-btn):not(.cart) {
    display: none !important; 
  }
  
  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions svg {
    width: 22px !important;
    height: 22px !important;
    stroke-width: 1.5 !important;
    margin: 0 !important;
  }
  
  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions .cart {
    position: relative !important;
  }
  
  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions .cart b {
    position: absolute !important;
    top: 4px !important;
    right: 50% !important;
    margin-right: -14px !important;
    width: 18px !important;
    height: 18px !important;
    font-size: 10px !important;
    line-height: 18px !important;
    background: var(--danger) !important;
    color: #fff !important;
    border-radius: 50% !important;
    text-align: center !important;
    box-shadow: 0 0 0 2px var(--surface) !important;
  }
  
  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions .dropdown-wrapper > button {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
    color: inherit !important;
  }

  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) .nav-actions .dropdown-wrapper .more-dropdown {
    bottom: calc(100% + 8px) !important;
    top: auto !important;
    right: 16px !important;
    left: 16px !important;
    width: auto !important;
    min-width: 0 !important;
    transform-origin: bottom center !important;
  }

  .main-nav {
    padding: 12px 16px !important;
    display: grid !important;
    grid-template-columns: auto 1fr !important;
    gap: 12px !important;
  }
  .main-nav .brand {
    margin: 0 !important;
  }
  .main-nav .search {
    margin: 0 !important;
    max-width: 100% !important;
  }
  
  body:not(.checkout-page):not(.admin-page):not(.auth-page):not(.cart-page) {
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important;
  }

  /* Cart page adjustments - use mobile-checkout-bar instead of bottom nav */
  .mobile-checkout-bar {
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
  }
  body.cart-page {
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important;
  }

  /* --------------------------------------------------------------------------
     2. PRODUCT CARDS & GRID
     -------------------------------------------------------------------------- */
  .product-grid, .visual-product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }
  
  .product-slider {
    gap: 12px !important;
    padding-bottom: 8px !important;
  }
  
  .product-slider .product-card {
    flex: 0 0 calc(55% - 12px) !important;
  }
  
  .product-card {
    border-radius: calc(var(--radius-card) * 0.75) !important;
  }

  .product-photo-link {
    aspect-ratio: 4/5 !important;
  }

  .product-body {
    padding: 12px !important;
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto;
    justify-content: space-between;
  }

  .product-body h3 {
    font-size: 0.85rem !important;
    line-height: 1.4 !important;
    margin-bottom: 6px !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .product-body .price {
    font-size: 0.9rem !important;
    margin-bottom: 8px !important;
    flex-wrap: wrap;
    row-gap: 2px;
  }
  .product-body .price strong {
    font-size: 1rem !important;
  }
  .product-body .price del {
    font-size: 0.75rem !important;
  }

  .product-body .stock {
    margin-top: auto !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px !important;
  }

  .product-body .stock > div {
    width: 100% !important;
    justify-content: space-between !important;
  }

  .btn-add-cart-mini {
    padding: 8px 12px !important;
    font-size: 0.85rem !important;
    flex: 1 !important;
    min-height: 44px !important;
  }
  .btn-compare, .wish {
    width: 44px !important;
    height: 44px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .discount-tag {
    font-size: 0.7rem !important;
    padding: 4px 8px !important;
    top: 8px !important;
    left: 8px !important;
  }

  /* --------------------------------------------------------------------------
     3. TYPOGRAPHY & TOUCH TARGETS
     -------------------------------------------------------------------------- */
  h1 { font-size: 1.6rem !important; line-height: 1.3 !important; }
  h2 { font-size: 1.3rem !important; line-height: 1.3 !important; }
  .overline { font-size: 0.75rem !important; margin-bottom: 6px !important; }

  button, .btn-primary, .btn-secondary, select, input {
    min-height: 48px !important;
  }

  /* --------------------------------------------------------------------------
     4. CHECKOUT & FORMS
     -------------------------------------------------------------------------- */
  .checkout-page .checkout-grid {
    grid-template-columns: 1fr !important;
    gap: 24px !important;
  }
  
  .checkout-page .order-summary {
    position: static !important;
    width: 100% !important;
  }

  .form-row, .form-row.three {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  .cart-item {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 16px !important;
  }
  .cart-item-image {
    width: 100px !important;
    aspect-ratio: 4/5 !important;
  }
  .cart-item-details {
    width: 100% !important;
  }
  
  /* --------------------------------------------------------------------------
     5. HERO SECTIONS & LAYOUTS
     -------------------------------------------------------------------------- */
  .hero-panel {
    flex-direction: column !important;
    gap: 24px !important;
    padding: 24px 16px !important;
  }
  .hero-image {
    width: 100% !important;
    aspect-ratio: 4/5 !important;
    height: auto !important;
  }
  
  .path-row {
    flex-direction: column !important;
    gap: 12px !important;
    padding: 0 16px 24px !important;
  }
  .path-row a {
    width: 100% !important;
  }
  
  /* Add body class cart-page logic */
}
`;

fs.writeFileSync(cssPath, content + '\n' + mobileCSS, 'utf8');
console.log('Successfully appended optimized mobile CSS');
