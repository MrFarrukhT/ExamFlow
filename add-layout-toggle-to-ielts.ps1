# PowerShell script to add layout toggle to all IELTS reading test files
$basePath = "MOCKs"

# Find all reading.html files in MOCK directories
$readingFiles = Get-ChildItem -Path $basePath -Filter "reading.html" -File -Recurse

foreach ($file in $readingFiles) {
    Write-Host "Processing: $($file.FullName)" -ForegroundColor Gray
    
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    if ($content -match "layout-toggle\.js") {
        Write-Host "  Already has layout toggle script" -ForegroundColor Green
        continue
    }
    
    # Look for the script loading section before </body>
    $pattern = '(<script src="../../assets/js/session-manager\.js"></script>)\s*([\r\n]+)(<!-- Additional reading-specific JS modules)'
    $replacement = '$1' + [Environment]::NewLine + '<script src="../../assets/js/reading/layout-toggle.js"></script>' + [Environment]::NewLine + [Environment]::NewLine + '$3'
    
    if ($content -match $pattern) {
        $content = $content -replace $pattern, $replacement
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  Added layout toggle script" -ForegroundColor Green
    } else {
        Write-Host "  Could not find insertion point" -ForegroundColor Yellow
    }
}

Write-Host "Script completed!" -ForegroundColor Green

