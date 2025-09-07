# PowerShell script to update data-test-version attributes in MOCK HTML files

$files = Get-ChildItem -Name "MOCK*.html" | Sort-Object

foreach ($file in $files) {
    # Extract the mock number from filename (MOCK1.html -> 1, MOCK10.html -> 10)
    if ($file -match "MOCK(\d+)\.html") {
        $mockNumber = $matches[1]
        
        # Read file content
        $content = Get-Content $file -Raw
        
        # Replace the data-test-version attribute
        # This will match any existing format and replace with simple number
        $newContent = $content -replace 'data-test-version="[^"]*"', "data-test-version=`"$mockNumber`""
        
        # Write back to file
        Set-Content -Path $file -Value $newContent
        
        Write-Host "Updated $file with data-test-version=`"$mockNumber`""
    }
}

Write-Host "`nAll MOCK HTML files updated successfully!"
