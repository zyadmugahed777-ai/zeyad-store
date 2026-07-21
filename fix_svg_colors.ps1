$files = Get-ChildItem -Path "d:\played\Zeyad For Business" -Filter *.html -Recurse

foreach ($file in $files) {
    if ($file.FullName -match "\\node_modules\\" -or $file.FullName -match "\\.agents\\") { continue }
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
    $content = [regex]::Replace($content, '(?i)(fill|stroke)="(?:\s*#000000\s*|\s*#000\s*|\s*#333\s*|\s*#333333\s*|\s*#111\s*|\s*black\s*)"', '$1="currentColor"')
    
    if ($content -cne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Updated SVGs in $($file.Name)"
    }
}
