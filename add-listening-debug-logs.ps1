# Add console logging to ALL Cambridge listening navigation
# This helps debug which navigation method is being used

$files = Get-ChildItem -Path ".\Cambridge\MOCKs-Cambridge" -Recurse -Filter "Listening-Part-*.html"

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    # Add console.log to part number button navigation (if not already present)
    $beforePattern = 'if \(partFiles\[partNumber\]\) \{\s+if \(window\.self !== window\.top\) \{'
    $afterPattern = 'if (partFiles[partNumber]) {
                            console.log(''🔢 Part button '', partNumber, '' clicked, in iframe: '', (window.self !== window.top));
                            if (window.self !== window.top) {'
    
    if ($content -match $beforePattern -and $content -notmatch 'Part button.*clicked') {
        $content = $content -replace $beforePattern, $afterPattern
        $modified = $true
        Write-Host "  Added logging to part buttons in: $($file.Name)" -ForegroundColor Cyan
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $count++
    }
}

Write-Host "`n✅ Added logging to $count listening files" -ForegroundColor Green
