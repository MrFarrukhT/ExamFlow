# PowerShell script to add layout toggle to all Cambridge test Part files
$levels = @("A1-Movers", "B1-Preliminary", "B2-First")
$basePath = "Cambridge\MOCKs-Cambridge"

foreach ($level in $levels) {
    $levelPath = Join-Path $basePath $level
    
    if (-Not (Test-Path $levelPath)) {
        Write-Host "Level path not found: $levelPath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing $level..." -ForegroundColor Cyan
    
    $partFiles = Get-ChildItem -Path $levelPath -Filter "Part *.html" -File
    
    foreach ($file in $partFiles) {
        Write-Host "  Processing: $($file.Name)" -ForegroundColor Gray
        
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        
        if ($content -match "cambridge-layout-toggle\.js") {
            Write-Host "    Already has layout toggle script" -ForegroundColor Green
            continue
        }
        
        $pattern = '(<script src="../../../assets/js/cambridge/question-marking\.js"></script>)'
        $replacement = '$1' + [Environment]::NewLine + '<script src="../../../assets/js/cambridge/cambridge-layout-toggle.js"></script>'
        
        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacement
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            Write-Host "    Added layout toggle script" -ForegroundColor Green
        } else {
            Write-Host "    Could not find insertion point" -ForegroundColor Yellow
        }
    }
}

Write-Host "Script completed!" -ForegroundColor Green
