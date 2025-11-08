# Fix listening navigation across all Cambridge tests
# This script replaces window.top.document.getElementById with postMessage

$files = Get-ChildItem -Path ".\Cambridge\MOCKs-Cambridge" -Recurse -Filter "Listening-Part-*.html"

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Pattern 1: window.top.document.getElementById('part-frame').src = partFiles[X];
    $oldPattern1 = 'window\.top\.document\.getElementById\(''part-frame''\)\.src = partFiles\[(\d+)\];'
    $newPattern1 = 'window.parent.postMessage({ type: ''navigate'', url: partFiles[$1] }, ''*'');'
    
    if ($content -match $oldPattern1) {
        Write-Host "Fixing: $($file.Name)" -ForegroundColor Yellow
        $content = $content -replace $oldPattern1, $newPattern1
        
        # Also add console log before the postMessage if not already present
        $content = $content -replace '(e\.preventDefault\(\);)\s+if \(window\.self !== window\.top\) {', 
            "`$1`n                    console.log('▶️ Next button clicked, navigating to next part');`n                    if (window.self !== window.top) {"
        
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $count++
    }
}

Write-Host "`n✅ Fixed $count listening navigation files" -ForegroundColor Green
