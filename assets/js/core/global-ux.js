/**
 * ZFB Global UX Orchestrator
 * Injects and manages the global switchers (Language, Theme, Currency).
 */
(function() {
  // Ensure ZFB_AUTH module is available site-wide
  if (!window.ZFB_AUTH) {
    const s = document.createElement('script');
    s.src = 'assets/js/core/auth.js';
    document.head.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;
    const nav = navActions.closest('.main-nav');

    if (nav && !nav.querySelector('.global-primary-links')) {
      const links = document.createElement('nav');
      links.className = 'global-primary-links';
      links.setAttribute('aria-label', 'روابط التسوق الرئيسية');
      links.innerHTML = [
        ['الرئيسية', 'index.html'],
        ['الأقسام', 'collections.html'],
        ['العروض', 'offers.html']
      ].map(([label, href]) => `<a href="${href}">${label}</a>`).join('');
      nav.insertBefore(links, nav.querySelector('.search') || navActions);
    }

    // Create Switchers Container
    if (navActions.querySelector('.global-switchers')) return;
    const switchersContainer = document.createElement('div');
    switchersContainer.className = 'global-switchers';

    // 1. Language Switcher
    const langSwitcher = document.createElement('select');
    langSwitcher.className = 'ux-select lang-select';
    langSwitcher.innerHTML = `
      <option value="ar" ${window.ZFB_I18N && window.ZFB_I18N.getLang() === 'ar' ? 'selected' : ''}>العربية</option>
      <option value="en" ${window.ZFB_I18N && window.ZFB_I18N.getLang() === 'en' ? 'selected' : ''}>English</option>
    `;
    langSwitcher.addEventListener('change', (e) => {
      if (window.ZFB_I18N) window.ZFB_I18N.setLang(e.target.value);
    });

    // 2. Currency Switcher
    const currSwitcher = document.createElement('select');
    currSwitcher.className = 'ux-select curr-select';
    currSwitcher.setAttribute('aria-label', 'عملة عرض الأسعار');
    currSwitcher.innerHTML = `
      <option value="YER" ${window.ZFB_CURRENCY && window.ZFB_CURRENCY.getCurrency() === 'YER' ? 'selected' : ''}>ر.ي (يمني)</option>
      <option value="SAR" ${window.ZFB_CURRENCY && window.ZFB_CURRENCY.getCurrency() === 'SAR' ? 'selected' : ''}>ر.س (سعودي)</option>
    `;
    currSwitcher.addEventListener('change', (e) => {
      if (window.ZFB_CURRENCY) window.ZFB_CURRENCY.setCurrency(e.target.value);
    });
    window.addEventListener('zfb-currency-change', (e) => {
      if (e.detail && e.detail.currency) {
        currSwitcher.value = e.detail.currency;
      }
    });

    // 3. Theme Toggle
    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle-btn icon-link';
    themeBtn.setAttribute('aria-label', 'Toggle Theme');
    
    // Initial SVG based on theme
    const isDark = window.ZFB_THEME && window.ZFB_THEME.getTheme() === 'dark';
    themeBtn.innerHTML = isDark 
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

    themeBtn.addEventListener('click', () => {
      if (window.ZFB_THEME) window.ZFB_THEME.toggle();
    });

    // Append to container
    switchersContainer.appendChild(langSwitcher);
    switchersContainer.appendChild(currSwitcher);
    switchersContainer.appendChild(themeBtn);

    // Insert into navActions at the beginning
    navActions.insertBefore(switchersContainer, navActions.firstChild);

    // ---------------------------------------------
    // Premium Features (Phase 2 Additions)
    // ---------------------------------------------

    // Sticky Header Scroll Effect
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          mainNav.classList.add('scrolled');
        } else {
          mainNav.classList.remove('scrolled');
        }
      }, { passive: true });
    }

    // Premium Dropdown Menu Logic
    const moreBtn = document.querySelector('.more-menu-btn');
    const moreDropdown = document.querySelector('.more-dropdown');
    
    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const isExpanded = moreBtn.getAttribute('aria-expanded') === 'true';
        moreBtn.setAttribute('aria-expanded', !isExpanded);
        moreDropdown.classList.toggle('show');
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!moreDropdown.contains(e.target) && !moreBtn.contains(e.target)) {
          moreDropdown.classList.remove('show');
          moreBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Keyboard Accessibility (Escape to close)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && moreDropdown.classList.contains('show')) {
          moreDropdown.classList.remove('show');
          moreBtn.setAttribute('aria-expanded', 'false');
          moreBtn.focus();
        }
      });
    }

    // Prominent Header Account Button (Always labeled "حسابي")
    let accountBtn = document.querySelector('.main-nav a[href="account.html"], .main-nav a[href="account-profile.html"], .nav-account-btn, .nav-actions a[href="login.html"]');
    if (accountBtn) {
      accountBtn.className = 'nav-account-btn';
      accountBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>حسابي</span>
      `;
    } else {
      accountBtn = document.createElement('a');
      accountBtn.className = 'nav-account-btn';
      accountBtn.href = 'account.html';
      accountBtn.setAttribute('title', 'حسابي');
      accountBtn.setAttribute('aria-label', 'حسابي');
      accountBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>حسابي</span>
      `;
    }

    // Force it into a highly visible spot if it's trapped in a hidden scrollable area
    const primaryLinks = document.querySelector('.global-primary-links');
    if (primaryLinks) {
       primaryLinks.appendChild(accountBtn);
    } else if (navActions) {
       navActions.insertBefore(accountBtn, navActions.querySelector('.wishlist, .cart, .dropdown-wrapper') || navActions.firstChild);
    }

    accountBtn.addEventListener('click', (e) => {
      if (window.ZFB_AUTH && !window.ZFB_AUTH.isLoggedIn() && !window.location.pathname.includes('account')) {
        e.preventDefault();
        window.ZFB_AUTH.openAuthModal();
      }
    });

  });
})();


// ==============================================================
// PHASE 6: PREMIUM WISHLIST SYSTEM SYNC
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {
    function updateWishlistBadge() {
        if (!window.ZFB || !window.ZFB.Wishlist) return;
        const count = window.ZFB.Wishlist.get().length;
        const wlLinks = document.querySelectorAll('a[href="wishlist.html"], a[href*="wishlist.html"]');
        wlLinks.forEach(link => {
            let badge = link.querySelector('.wishlist-badge');
            if(count > 0) {
                if(!badge) {
                    badge = document.createElement('span');
                    badge.className = 'wishlist-badge badge-pulse';
                    link.style.position = 'relative';
                    link.appendChild(badge);
                }
                badge.textContent = count;
                badge.classList.remove('badge-pulse');
                void badge.offsetWidth; // trigger reflow
                badge.classList.add('badge-pulse');
            } else {
                if(badge) badge.remove();
            }
        });
        
        // Update wishlist page dynamically without refresh
        const grid = document.querySelector('.wishlist-grid');
        if(grid && count === 0) {
            grid.innerHTML = '<div class="empty-state"><h3>قائمتك فارغة!</h3><p>يبدو أنك لم تقم بإضافة أي منتجات للمفضلة بعد.</p><a href="index.html" class="btn-primary" style="margin-top:20px; display:inline-block; padding:12px 24px; border-radius:12px;">تصفح المنتجات</a></div>';
            const headerP = document.querySelector('.wishlist-header p');
            if(headerP) headerP.textContent = '0 منتجات في المفضلة';
        }
    }
    
    // Listen to the ZFB state change event globally
    window.addEventListener('zfb-state-change', updateWishlistBadge);
    // Initial check
    setTimeout(updateWishlistBadge, 200);

    // Track click on wish toggles to trigger animation sync
    document.addEventListener('click', (e) => {
        if(e.target.closest('.wish, .btn-wishlist')) {
            setTimeout(updateWishlistBadge, 50);
        }
    });
});
