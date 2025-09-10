# IELTS Test System - Desktop Shortcut Creator
# This script creates a desktop shortcut for the IELTS Test System

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "IELTS Test System Shortcut Creator" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Get current script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$IndexPath = Join-Path $ScriptDir "index.html"
$IconPath = Join-Path $ScriptDir "assets\icons\innovativecentre.png"

# Verify files exist
if (-not (Test-Path $IndexPath)) {
    Write-Host "❌ Error: index.html not found in current directory" -ForegroundColor Red
    Write-Host "Make sure this script is in the same folder as index.html" -ForegroundColor Yellow
    pause
    exit 1
}

if (-not (Test-Path $IconPath)) {
    Write-Host "⚠️  Warning: Icon file not found, shortcut will use default HTML icon" -ForegroundColor Yellow
    $IconPath = $null
}

# Get desktop path
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "IELTS Test System.lnk"

Write-Host "Creating desktop shortcut..." -ForegroundColor Green
Write-Host "Target: $IndexPath" -ForegroundColor Gray
Write-Host "Desktop: $Desktop" -ForegroundColor Gray

try {
    # Create WScript Shell object
    $WshShell = New-Object -comObject WScript.Shell
    
    # Create shortcut
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $IndexPath
    $Shortcut.WorkingDirectory = $ScriptDir
    $Shortcut.Description = "IELTS Practice Test System - Innovative Centre"
    
    # Save shortcut
    $Shortcut.Save()
    
    Write-Host ""
    Write-Host "✅ Success! Desktop shortcut created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Shortcut Details:" -ForegroundColor Cyan
    Write-Host "  Name: IELTS Test System" -ForegroundColor White
    Write-Host "  Location: $ShortcutPath" -ForegroundColor White
    Write-Host "  Target: $IndexPath" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Additional Options:" -ForegroundColor Yellow
    Write-Host "  • Right-click shortcut → 'Pin to taskbar' for quick access" -ForegroundColor White
    Write-Host "  • Right-click shortcut → 'Pin to Start' to add to Start menu" -ForegroundColor White
    Write-Host "  • Right-click shortcut → Properties → Shortcut key to set hotkey" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error creating shortcut: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Try running as administrator if the error persists" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""
Write-Host "You can now run the test system by:" -ForegroundColor Cyan
Write-Host "1. Double-clicking the desktop shortcut" -ForegroundColor White
Write-Host "2. Running 'Launch IELTS Test System.bat'" -ForegroundColor White
Write-Host "3. Opening 'launcher.html' in your browser" -ForegroundColor White
