$files = Get-ChildItem -Path "d:\played\Zeyad For Business" -Filter *.html -Recurse
$newVersion = "v=" + (Get-Date).ToString("yyyyMMddHHmmss")

$compareSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 3h5v5M4 21v-7M20 8l-7 7M4 14l7-7M4 3h5v5M20 21v-7"/></svg>'
$moreSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>'
$newIcons = @"
          <a class="nav-icon-btn" href="compare.html" aria-label="المقارنة" title="المقارنة">
            $compareSvg
          </a>
          <div class="dropdown-wrapper">
            <button class="nav-icon-btn more-menu-btn" aria-expanded="false" aria-label="المزيد">
              $moreSvg
            </button>
            <div class="more-dropdown">
              <a href="compare.html">$compareSvg المقارنة</a>
              <a href="search.html?q=%D8%A7%D9%84%D8%AC%D8%AF%D9%8A%D8%AF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> الجديد</a>
              <a href="track-order.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تتبع الطلب</a>
              <a href="contact.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> تواصل معنا</a>
              <a href="privacy.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> سياسة الخصوصية</a>
              <a href="terms.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> الشروط والأحكام</a>
              <a href="returns.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> سياسة الإرجاع</a>
              <a href="faq.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> الأسئلة الشائعة</a>
              <a href="about.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> من نحن</a>
            </div>
          </div>
"@

foreach ($file in $files) {
    if ($file.FullName -match "\\node_modules\\" -or $file.FullName -match "\\.agents\\") { continue }
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
    # Update cache busters to ensure CSS/JS reloads
    $content = [regex]::Replace($content, 'styles\.css\?v=[0-9\-a-zA-Z]+', "styles.css?$newVersion")
    $content = [regex]::Replace($content, 'global-ux\.js\?v=[0-9\-a-zA-Z]+', "global-ux.js?$newVersion")

    # Fix Logo (Brand) container
    $content = [regex]::Replace($content, '(?s)<a\s+class="brand"\s+href="index\.html"\s+data-vid="([^"]+)">\s*(.*?)\s*</a>', {
        param($m)
        $vid = $m.Groups[1].Value
        $inner = $m.Groups[2].Value
        if ($inner -match '<span class="brand-content"') { return $m.Value }
        return "<a class=`"brand`" href=`"index.html`">`n          <span class=`"brand-content`" data-vid=`"$vid`">`n            $inner`n          </span>`n        </a>"
    })

    # Unify icons inside nav-actions
    $content = $content -replace 'class="icon-link"', 'class="nav-icon-btn"'
    
    # Inject Compare and More Dropdown after Wishlist
    if ($content -notmatch 'more-menu-btn') {
        $content = [regex]::Replace($content, '(?s)(<a class="nav-icon-btn"[^>]*href="wishlist\.html"[^>]*>.*?</a>)', {
            param($m)
            return $m.Groups[1].Value + "`n" + $newIcons
        })
    }

    # Delete any hardcoded "الجديد", "تتبع الطلب", "اتصل بنا" in the global links or nav-actions if they somehow exist
    # Since they are mostly injected by global-ux.js, we should be fine. But just in case:
    # Actually, let's not blindly delete stuff to avoid destroying layout.

    if ($content -cne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Updated $($file.Name)"
    }
}
