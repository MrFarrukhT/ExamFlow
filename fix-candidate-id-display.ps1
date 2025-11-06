# PowerShell script to fix Candidate ID display issue across all Cambridge test files

Write-Host "🔧 Fixing Candidate ID display issue..." -ForegroundColor Cyan

# Define the pattern to search for and replace
$pattern1 = @"
// Populate Candidate ID field with student ID from localStorage
\(function\(\) \{
    const studentId = localStorage\.getItem\('studentId'\);
    if \(studentId\) \{
        // Try multiple selectors to find the candidate ID input field
        const candidateIdInputs = \[
            document\.querySelector\('input\[placeholder\*="Candidate"\]'\),
            document\.querySelector\('input\[placeholder\*="candidate"\]'\),
            document\.querySelector\('input\[type="text"\]\[placeholder\]'\),
            document\.getElementById\('candidateId'\),
            document\.getElementById\('candidate-id'\)
        \];
        
        for \(const input of candidateIdInputs\) \{
            if \(input\) \{
                input\.value = studentId;
                input\.readOnly = true; // Make it read-only
                console\.log\('✅ Candidate ID populated:', studentId\);
                break;
            \}
        \}
    \}
\}\)\(\);
"@

$pattern2 = @"
        // Populate Candidate ID field with student ID from localStorage
        \(function\(\) \{
            const studentId = localStorage\.getItem\('studentId'\);
            if \(studentId\) \{
                const candidateIdInputs = \[
                    document\.querySelector\('input\[placeholder\*="Candidate"\]'\),
                    document\.querySelector\('input\[placeholder\*="candidate"\]'\),
                    document\.querySelector\('input\[type="text"\]\[placeholder\]'\),
                    document\.getElementById\('candidateId'\),
                    document\.getElementById\('candidate-id'\)
                \];
                for \(const input of candidateIdInputs\) \{
                    if \(input\) \{
                        input\.value = studentId;
                        input\.readOnly = true;
                        console\.log\('✅ Candidate ID populated:', studentId\);
                        break;
                    \}
                \}
            \}
        \}\)\(\);
"@

$pattern3 = @"
// Populate Candidate ID field
\(function\(\) \{
    const studentId = localStorage\.getItem\('studentId'\);
    if \(studentId\) \{
        const inputs = \[document\.querySelector\('input\[placeholder\*="Candidate"\]'\), document\.querySelector\('input\[placeholder\*="candidate"\]'\), document\.querySelector\('input\[type="text"\]\[placeholder\]'\), document\.getElementById\('candidateId'\), document\.getElementById\('candidate-id'\)\];
        for \(const input of inputs\) \{
            if \(input\) \{ input\.value = studentId; input\.readOnly = true; console\.log\('✅ Candidate ID populated:', studentId\); break; \}
        \}
    \}
\}\)\(\);
"@

$pattern4 = @"
        // Populate Candidate ID field
        \(function\(\) \{
            const studentId = localStorage\.getItem\('studentId'\);
            if \(studentId\) \{
                const inputs = \[document\.querySelector\('input\[placeholder\*="Candidate"\]'\), document\.querySelector\('input\[placeholder\*="candidate"\]'\), document\.querySelector\('input\[type="text"\]\[placeholder\]'\), document\.getElementById\('candidateId'\), document\.getElementById\('candidate-id'\)\];
                for \(const input of inputs\) \{
                    if \(input\) \{ input\.value = studentId; input\.readOnly = true; console\.log\('✅ Candidate ID populated:', studentId\); break; \}
                \}
            \}
        \}\)\(\);
"@

# Get all HTML files in Cambridge MOCKs
$levels = @("A1-Movers", "B1-Preliminary", "B2-First")
$baseDir = "Cambridge\MOCKs-Cambridge"
$filesFixed = 0

foreach ($level in $levels) {
    $htmlFiles = Get-ChildItem -Path "$baseDir\$level" -Filter "*.html" -File
    
    foreach ($file in $htmlFiles) {
        Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # Apply fixes based on file type
        if ($file.Name -match "^Part \d+\.html$") {
            # Part files use pattern1 or pattern3
            if ($content -match [regex]::Escape("// Populate Candidate ID field with student ID")) {
                # Already fixed
                Write-Host "  ✓ Already fixed" -ForegroundColor Green
            } else {
                # Apply fix - check for pattern3 first (compressed format)
                if ($content -match "const inputs = \[document\.querySelector") {
                    # Compressed format - need different replacement
                    $content = $content -replace [regex]::Escape("// Populate Candidate ID field`n(function() {`n    const studentId = localStorage.getItem('studentId');`n    if (studentId) {`n        const inputs = [document.querySelector('input[placeholder*=`"Candidate`"]'), document.querySelector('input[placeholder*=`"candidate`"]'), document.querySelector('input[type=`"text`"][placeholder]'), document.getElementById('candidateId'), document.getElementById('candidate-id')];`n        for (const input of inputs) {`n            if (input) { input.value = studentId; input.readOnly = true; console.log('✅ Candidate ID populated:', studentId); break; }`n        }`n    }`n})();"), "// Already processed"
                }
            }
        }
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            $filesFixed++
            Write-Host "  ✓ Fixed!" -ForegroundColor Green
        }
    }
}

Write-Host "`n✅ Complete! Fixed $filesFixed files." -ForegroundColor Green
