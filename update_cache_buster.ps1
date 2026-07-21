$files = Get-ChildItem -Path "d:\played\Zeyad For Business" -Filter *.html -Recurse

$newVersion = "v=" + (Get-Date).ToString("yyyyMMddHHmmss")

foreach ($file in $files) {
    if ($file.FullName -match "\\node_modules\\" -or $file.FullName -match "\\.agents\\") { continue }
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
    $content = [regex]::Replace($content, 'styles\.css\?v=[0-9\-a-zA-Z]+', "styles.css?$newVersion")
    $content = [regex]::Replace($content, 'product-page\.css\?v=[0-9\-a-zA-Z]+', "product-page.css?$newVersion")
    $content = [regex]::Replace($content, 'responsive-pro\.css\?v=[0-9\-a-zA-Z]+', "responsive-pro.css?$newVersion")
    $content = [regex]::Replace($content, 'production-polish\.css\?v=[0-9\-a-zA-Z\-]+', "production-polish.css?$newVersion")
    
    if ($content -cne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Updated cache buster in $($file.Name)"
    }
}
