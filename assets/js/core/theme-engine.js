/**
 * ZFB Visual Theme Engine
 * Injects CSS variables globally. Runs synchronously to prevent FOUC.
 */
(function() {
  const THEME_CACHE_KEY = 'zfb_theme_css';
  const SETTINGS_API = '/api/settings/theme_config';
  
  // 1. Inject cached CSS instantly
  const cachedCSS = localStorage.getItem(THEME_CACHE_KEY);
  if (cachedCSS) {
    const style = document.createElement('style');
    style.id = 'zfb-theme-vars';
    style.textContent = cachedCSS;
    document.documentElement.appendChild(style);
  }

  // 2. Fetch the latest from server
  fetch(SETTINGS_API)
    .then(res => res.json())
    .then(json => {
      if (json && json.success && json.data && json.data.theme_config) {
        let themeData;
        try {
          themeData = JSON.parse(json.data.theme_config.value);
        } catch(e) { themeData = null; }
        
        if (themeData) {
          const cssString = generateCSSFromTheme(themeData);
          if (cssString !== cachedCSS) {
            localStorage.setItem(THEME_CACHE_KEY, cssString);
            applyCSS(cssString);
          }
        }
      }
    })
    .catch(err => console.error('Failed to load theme:', err));

  function applyCSS(cssString) {
    let style = document.getElementById('zfb-theme-vars');
    if (!style) {
      style = document.createElement('style');
      style.id = 'zfb-theme-vars';
      document.documentElement.appendChild(style);
    }
    style.textContent = cssString;
  }

  // Helper to generate CSS variables mapping to actual ZFB variables
  function generateCSSFromTheme(theme) {
    let rootVars = '';
    let darkVars = '';

    if (theme.colors) {
      if (theme.colors.light) {
        if(theme.colors.light.primary) rootVars += `--gold: ${theme.colors.light.primary};\n`;
        if(theme.colors.light.bg) rootVars += `--paper: ${theme.colors.light.bg};\n`;
        if(theme.colors.light.surface) rootVars += `--surface: ${theme.colors.light.surface};\n`;
        if(theme.colors.light.text) rootVars += `--ink: ${theme.colors.light.text};\n`;
        if(theme.colors.light.border) rootVars += `--line: ${theme.colors.light.border};\n`;
      }
      if (theme.colors.dark) {
        if(theme.colors.dark.primary) darkVars += `--gold: ${theme.colors.dark.primary};\n`;
        if(theme.colors.dark.bg) darkVars += `--paper: ${theme.colors.dark.bg};\n`;
        if(theme.colors.dark.surface) darkVars += `--surface: ${theme.colors.dark.surface};\n`;
        if(theme.colors.dark.text) darkVars += `--ink: ${theme.colors.dark.text};\n`;
        if(theme.colors.dark.border) darkVars += `--line: ${theme.colors.dark.border};\n`;
      }
    }

    if (theme.fonts) {
      if (theme.fonts.primary) rootVars += `--font-primary: "${theme.fonts.primary}";\n`;
    }

    if (theme.animation) {
      if (theme.animation.speed) rootVars += `--ease: ${theme.animation.speed};\n`;
    }

    if (theme.radius) {
      if(theme.radius.button) rootVars += `--radius: ${theme.radius.button};\n`;
      if(theme.radius.card) rootVars += `--radius-card: ${theme.radius.card};\n`;
    }

    if (theme.shadows) {
      if(theme.shadows.sm) rootVars += `--shadow-soft: ${theme.shadows.sm};\n`;
      if(theme.shadows.md) rootVars += `--shadow-lift: ${theme.shadows.md};\n`;
    }

    let css = `:root {\n${rootVars}}\n`;
    if (darkVars) {
      css += `[data-theme="dark"] {\n${darkVars}}\n`;
    }
    return css;
  }
  
  window.ZFB_THEME_ENGINE = {
    generateCSSFromTheme,
    applyThemeData: function(themeData) {
      const cssString = generateCSSFromTheme(themeData);
      applyCSS(cssString);
    }
  };

  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'UPDATE_THEME_PREVIEW') {
      window.ZFB_THEME_ENGINE.applyThemeData(event.data.theme);
    }
  });
})();
