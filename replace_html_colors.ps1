$files = Get-ChildItem -Path "d:\played\Zeyad For Business" -Filter *.html -Recurse

foreach ($file in $files) {
    # Skip node_modules or .agents
    if ($file.FullName -match "\\node_modules\\" -or $file.FullName -match "\\.agents\\") {
        continue
    }

    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
    # Inline backgrounds
    $content = [regex]::Replace($content, '(?i)background(?:-color)?\s*:\s*(?:#ffffff|#fff|white)\b(?![^;]*\))', 'background-color: var(--surface)')
    $content = [regex]::Replace($content, '(?i)background(?:-color)?\s*:\s*(?:#fafafa|#f8f8f8|#f5f5f5)\b', 'background-color: var(--surface-2)')
    
    # Inline Text Colors
    $content = [regex]::Replace($content, '(?i)color\s*:\s*(?:#000000|#000|black)\b', 'color: var(--ink)')
    $content = [regex]::Replace($content, '(?i)color\s*:\s*(?:#333333|#333|#444)\b', 'color: var(--ink-soft)')
    $content = [regex]::Replace($content, '(?i)color\s*:\s*(?:#666666|#666|#777|#888)\b', 'color: var(--muted)')
    
    # Inline Borders
    $content = [regex]::Replace($content, '(?i)border(?:-(?:top|bottom|left|right))?\s*:\s*([^;]*)(?:#eeeeee|#eee|#dddddd|#ddd|#e0e0e0|#e5e5e5|#cccccc|#ccc)\b', 'border: $1 var(--line)')
    $content = [regex]::Replace($content, '(?i)border-color\s*:\s*(?:#eeeeee|#eee|#dddddd|#ddd|#e0e0e0|#e5e5e5|#cccccc|#ccc)\b', 'border-color: var(--line)')
    
    if ($content -cne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Updated $($file.Name)"
    }
}
