# Fix ALL navigation in Cambridge Listening Parts
# This script fixes both Next button AND part number button navigation

$files = Get-ChildItem -Path ".\Cambridge\MOCKs-Cambridge" -Recurse -Filter "Listening-Part-*.html"

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    # Pattern 1: Fix Next/Previous buttons - window.top.document.getElementById
    $pattern1 = 'window\.top\.document\.getElementById\(''part-frame''\)\.src = partFiles\[(\d+)\];'
    if ($content -match $pattern1) {
        $content = $content -replace $pattern1, 'window.parent.postMessage({ type: ''navigate'', url: partFiles[$1] }, ''*'');'
        $modified = $true
        Write-Host "  Fixed Next/Prev button in: $($file.Name)" -ForegroundColor Yellow
    }
    
    # Pattern 2: Fix part number buttons - same pattern
    $pattern2 = 'window\.top\.document\.getElementById\(''part-frame''\)\.src = partFiles\[partNumber\];'
    if ($content -match $pattern2) {
        $content = $content -replace $pattern2, 'window.parent.postMessage({ type: ''navigate'', url: partFiles[partNumber] }, ''*'');'
        $modified = $true
        Write-Host "  Fixed Part Number buttons in: $($file.Name)" -ForegroundColor Cyan
    }
    
    # Pattern 3: Fix any remaining window.top references
    $pattern3 = 'window\.top\.document\.getElementById\(''part-frame''\)\.src'
    if ($content -match $pattern3) {
        Write-Host "  WARNING: Found unhandled window.top reference in: $($file.Name)" -ForegroundColor Red
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $count++
    }
}

Write-Host "`n✅ Fixed $count listening navigation files" -ForegroundColor Green
