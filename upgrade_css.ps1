$cssFile = "d:\played\Zeyad For Business\styles.css"
$content = Get-Content $cssFile -Raw -Encoding UTF8

# 1. Update .main-nav background and add scrolled class
$content = [regex]::Replace($content, '(?s)\.main-nav \{.*?(?=\})\}', {
    param($match)
    $block = $match.Value
    $block = $block -replace 'background:\s*rgba[^;]+;', 'background: color-mix(in srgb, var(--surface) 85%, transparent);'
    $block = $block -replace 'border-bottom:[^;]+;', 'border-bottom: 1px solid var(--line);'
    return "$block`n`n.main-nav.scrolled {`n  box-shadow: 0 4px 24px rgba(0,0,0,0.06);`n}"
})

# 2. Add .brand-content logic after .brand
if ($content -notmatch '.brand-content') {
    $brandCss = "`n.brand-content {`n  display: flex;`n  align-items: center;`n  gap: 12px;`n  height: 44px;`n  max-width: 250px;`n}`n.brand-content img {`n  max-height: 100%;`n  width: auto;`n  object-fit: contain;`n}`n.brand-content:not(:has(*)) {`n  font-weight: 700;`n  font-size: 1.2rem;`n  white-space: nowrap;`n  overflow: hidden;`n  text-overflow: ellipsis;`n}"
    $content = $content -replace '(\.brand \{[^}]+\})', "`$1$brandCss"
}

# 3. Add .nav-icon-btn logic
if ($content -notmatch '.nav-icon-btn') {
    $navIconBtnCss = "`n.nav-icon-btn {`n  display: grid;`n  place-items: center;`n  width: 44px;`n  height: 44px;`n  border-radius: 50%;`n  color: var(--olive-deep);`n  transition: background var(--ease), transform var(--ease);`n  border: none;`n  background: transparent;`n  cursor: pointer;`n}`n.nav-icon-btn svg {`n  width: 22px;`n  height: 22px;`n  stroke-width: 1.7;`n}`n.nav-icon-btn:hover, .nav-icon-btn:focus-visible {`n  background: var(--surface-2);`n  outline: none;`n}`n.nav-icon-btn:active {`n  transform: scale(0.95);`n}"
    $content = $content -replace '(\.nav-actions \{[^}]+\})', "`$1$navIconBtnCss"
}

# 4. Improve search padding
$content = [regex]::Replace($content, '(\.search input \{[^}]*padding:\s*0\s+)6px(;[^}]+\})', '${1}16px$2')

# 5. Add Dropdown styles
if ($content -notmatch '.more-dropdown') {
    $dropdownCss = "`n.dropdown-wrapper {`n  position: relative;`n}`n.more-dropdown {`n  position: absolute;`n  top: 100%;`n  left: 0;`n  margin-top: 8px;`n  min-width: 240px;`n  background: color-mix(in srgb, var(--surface) 90%, transparent);`n  backdrop-filter: blur(24px);`n  border: 1px solid var(--line);`n  border-radius: 12px;`n  box-shadow: var(--shadow-lift);`n  opacity: 0;`n  visibility: hidden;`n  transform: translateY(-8px);`n  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);`n  display: flex;`n  flex-direction: column;`n  padding: 8px 0;`n  z-index: 200;`n}`n.more-dropdown.show {`n  opacity: 1;`n  visibility: visible;`n  transform: translateY(0);`n}`n.more-dropdown a {`n  padding: 12px 16px;`n  color: var(--ink);`n  font-weight: 600;`n  text-decoration: none;`n  display: flex;`n  align-items: center;`n  gap: 10px;`n  transition: background 0.2s, color 0.2s;`n}`n.more-dropdown a svg {`n  width: 20px;`n  height: 20px;`n  stroke-width: 1.7;`n  color: var(--muted);`n}`n.more-dropdown a:hover, .more-dropdown a:focus {`n  background: var(--surface-2);`n  color: var(--olive-deep);`n  outline: none;`n}`n.more-dropdown a:hover svg, .more-dropdown a:focus svg {`n  color: var(--olive-deep);`n}"
    $content = $content + "`n" + $dropdownCss
}

Set-Content -Path $cssFile -Value $content -Encoding UTF8
Write-Host "styles.css updated!"
