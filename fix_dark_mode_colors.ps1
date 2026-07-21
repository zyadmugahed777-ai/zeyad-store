$cssFile = "d:\played\Zeyad For Business\styles.css"
$content = Get-Content $cssFile -Raw -Encoding UTF8

# Add variables to :root
$rootVars = "`n  --card-inner-glow: rgba(255, 255, 255, 0.9);`n  --hero-bg-start: rgba(255, 253, 248, 0.92);`n  --hero-bg-end: rgba(244, 234, 220, 0.78);"
$content = $content -replace '(--bg-grad-end: #f7efe3;)(\s*)}', "`$1$rootVars`$2}"

# Add variables to [data-theme="dark"]
$darkVars = "`n  --card-inner-glow: rgba(255, 255, 255, 0.03);`n  --hero-bg-start: rgba(20, 17, 13, 0.92);`n  --hero-bg-end: rgba(27, 23, 18, 0.78);"
$content = $content -replace '(--bg-grad-end: #120f0b;)(\s*)}', "`$1$darkVars`$2}"

# Replace specific hardcoded shadows
$content = $content -replace 'inset 0 2px 4px rgba\(255, 255, 255, 0\.9\)', 'inset 0 2px 4px var(--card-inner-glow)'
$content = $content -replace 'rgba\(55, 43, 31, 0\.05\)', 'var(--shadow-soft)'
$content = $content -replace '0 10px 26px var\(--shadow-soft\)', 'var(--shadow-soft)'

# Replace hero background
$content = $content -replace 'linear-gradient\(145deg, rgba\(255, 253, 248, 0\.92\), rgba\(244, 234, 220, 0\.78\)\)', 'linear-gradient(145deg, var(--hero-bg-start), var(--hero-bg-end))'

# Handle other white-ish backgrounds with CSS color-mix
$content = $content -replace 'rgba\(\s*255\s*,\s*25[35]\s*,\s*2(?:48|55)\s*,\s*([0-9.]+)\s*\)', 'color-mix(in srgb, var(--surface) calc($1 * 100%), transparent)'
$content = $content -replace 'rgba\(\s*244\s*,\s*234\s*,\s*220\s*,\s*([0-9.]+)\s*\)', 'color-mix(in srgb, var(--surface-2) calc($1 * 100%), transparent)'
$content = $content -replace 'rgba\(\s*227\s*,\s*213\s*,\s*195\s*,\s*([0-9.]+)\s*\)', 'color-mix(in srgb, var(--line) calc($1 * 100%), transparent)'

# Handle #e8ddd1 in all CSS files
Set-Content -Path $cssFile -Value $content -Encoding UTF8

$offersHtml = "d:\played\Zeyad For Business\offers.html"
if (Test-Path $offersHtml) {
    $offersContent = Get-Content $offersHtml -Raw -Encoding UTF8
    $offersContent = $offersContent -replace '#e8ddd1', 'var(--line)'
    Set-Content -Path $offersHtml -Value $offersContent -Encoding UTF8
}

$designRequestHtml = "d:\played\Zeyad For Business\design-request.html"
if (Test-Path $designRequestHtml) {
    $designContent = Get-Content $designRequestHtml -Raw -Encoding UTF8
    $designContent = $designContent -replace 'var\(--card-bg, #fff\)', 'var(--card-bg, var(--surface))'
    Set-Content -Path $designRequestHtml -Value $designContent -Encoding UTF8
}

Write-Host "Done"
