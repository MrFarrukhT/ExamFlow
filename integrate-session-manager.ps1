# PowerShell script to add session manager to all test HTML files
# Run this script to integrate the session management system

$basePath = ".\MOCKs"
$sessionManagerScript = '<script src="../../assets/js/session-manager.js"></script>'

Write-Host "Adding session manager to all test files..." -ForegroundColor Green

# Get all HTML files in MOCK directories
$testFiles = Get-ChildItem -Path $basePath -Recurse -Filter "*.html"

foreach ($file in $testFiles) {
    Write-Host "Processing: $($file.FullName)" -ForegroundColor Yellow
    
    $content = Get-Content -Path $file.FullName -Raw
    
    # Check if session manager is already added
    if ($content -notmatch "session-manager\.js") {
        # Find the pattern to insert the session manager script
        if ($content -match '(<script src="../../assets/js/core\.js"></script>)') {
            $newContent = $content -replace '(<script src="../../assets/js/core\.js"></script>)', "`$1`n$sessionManagerScript"
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "  Added session manager" -ForegroundColor Green
        } else {
            Write-Host "  Could not find insertion point for: $($file.Name)" -ForegroundColor Red
        }
    } else {
        Write-Host "  Session manager already present" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "Session manager integration completed!" -ForegroundColor Green
Write-Host ""
Write-Host "The following files have been updated:" -ForegroundColor Yellow
$testFiles | ForEach-Object { Write-Host "  - $($_.FullName)" }

Write-Host ""
Write-Host "You can now test the system by:" -ForegroundColor Blue
Write-Host "1. Opening invigilator.html to set up a mock test"
Write-Host "2. Opening index.html for student entry"
Write-Host "3. Students can complete modules and return to dashboard"
Write-Host "4. Use invigilator panel to export results and reset data"
