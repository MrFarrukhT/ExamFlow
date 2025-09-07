# PowerShell script to update headers in all mock answer files

$answerFiles = Get-ChildItem -Path "answers" -Name "mock*-answers.js" | Sort-Object

foreach ($file in $answerFiles) {
    $filePath = "answers\$file"
    
    # Extract mock number from filename (mock1-answers.js -> 1, mock10-answers.js -> 10)
    if ($file -match "mock(\d+)-answers\.js") {
        $mockNumber = $matches[1]
        
        # Read file content
        $content = Get-Content $filePath -Raw
        
        # Replace the header comment
        $newContent = $content -replace "// Answer key for Test Version \d+", "// Answer key for MOCK TEST $mockNumber"
        $newContent = $newContent -replace "// Answer key for MOCK TEST \d+", "// Answer key for MOCK TEST $mockNumber"
        
        # Write back to file
        Set-Content -Path $filePath -Value $newContent
        
        Write-Host "Updated $file with header for MOCK TEST $mockNumber"
    }
}

Write-Host "`nAll answer files updated successfully!"
