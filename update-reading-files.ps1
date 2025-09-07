# PowerShell script to update all MOCK reading.html files with correct paths

$basePath = "c:\Users\Windows 11\Desktop\Scalable Architecture\Test System(v2)\MOCKs"

for ($i = 2; $i -le 10; $i++) {
    $filePath = "$basePath\MOCK $i\reading.html"
    
    if (Test-Path $filePath) {
        # Read file content
        $content = Get-Content $filePath -Raw
        
        # Update title
        $content = $content -replace '<title>IELTS Full Reading Practice</title>', "<title>IELTS MOCK $i - Reading Practice</title>"
        
        # Update CSS reference
        $content = $content -replace '<link rel="stylesheet" href="/styles.css">', '<link rel="stylesheet" href="../../assets/css/base.css">'
        $content = $content -replace '</head>', "    <!-- Reading-specific CSS modules will be loaded here -->`n</head>"
        
        # Update body data attributes
        $content = $content -replace '<body data-test-version="\d+">', "<body data-test-version=`"$i`" data-skill=`"reading`" data-mock=`"$i`">"
        
        # Update script reference
        $content = $content -replace '<script src="/script.js"></script>', '<script src="../../assets/js/core.js"></script>' + "`n" + '<!-- Additional reading-specific JS modules will be loaded dynamically -->'
        
        # Write back to file
        Set-Content -Path $filePath -Value $content
        
        Write-Host "Updated MOCK $i reading.html"
    }
}

Write-Host "`nAll MOCK reading.html files updated successfully!"
