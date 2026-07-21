$jsFile = "d:\played\Zeyad For Business\assets\js\core\global-ux.js"
$content = Get-Content $jsFile -Raw -Encoding UTF8

# Remove unused links
$content = $content -replace "\s*\['الجديد',\s*'search\.html\?q=.*?'\],?", ""
$content = $content -replace "\s*\['تتبع الطلب',\s*'track-order\.html'\],?", ""
$content = $content -replace "\s*\['اتصل بنا',\s*'contact\.html'\],?", ""

# Remove trailing commas from the array if any
$content = $content -replace "\]\s*\]\.map", "]]`n      .map"

# Add Sticky Header and Dropdown logic at the end of DOMContentLoaded
if ($content -notmatch "window.addEventListener\('scroll'") {
    $scriptToAdd = @"
    
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
"@
    # Insert just before the closing }); of DOMContentLoaded
    $content = $content -replace "(?s)(DOMContentLoaded.*?)(}\);(?!\s*.*?}\);))", "`$1$scriptToAdd`n    `$2"
}

Set-Content -Path $jsFile -Value $content -Encoding UTF8
Write-Host "global-ux.js updated!"
