/**
 * ZFB Core Theme System
 * Handles Global Dark Mode and persistent preferences.
 */
(function() {
  const THEME_KEY = 'zfb_theme';

  function ensureProductionPolishStylesheet() {
    if (document.querySelector('link[data-zfb-production-polish]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'production-polish.css?v=20260718-2';
    link.dataset.zfbProductionPolish = 'true';
    document.head.appendChild(link);
  }

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      // Theme switching must still work when browser storage is unavailable.
    }
  }

  function applyTheme(theme) {
    ensureProductionPolishStylesheet();
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  let currentTheme = readStoredTheme();
  if (!currentTheme) {
    currentTheme = getSystemTheme();
    // Default to Light if detection is unavailable, but matchMedia usually handles it
  }

  // Apply immediately to prevent flash
  applyTheme(currentTheme);

  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    currentTheme = theme;
    saveTheme(theme);
    applyTheme(theme);
    
    // Update toggle UI if exists
    const toggles = document.querySelectorAll('.theme-toggle-btn');
    toggles.forEach(btn => {
      btn.innerHTML = theme === 'dark' 
        ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    });
  }

  window.ZFB_THEME = {
    getTheme: () => currentTheme,
    setTheme,
    toggle: () => setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  };

  // Listen for system changes
  const themeMediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (themeMediaQuery && themeMediaQuery.addEventListener) {
    themeMediaQuery.addEventListener('change', e => {
      if (!readStoredTheme()) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

})();
