# PowerShell script to create desktop shortcut for Innovative Centre IELTS Test System
# Run this script as Administrator to create a desktop shortcut

$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$([Environment]::GetFolderPath('Desktop'))\Innovative Centre - IELTS Test System.lnk")

# Get the current directory path
$currentPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set shortcut properties
$Shortcut.TargetPath = "chrome.exe"
$Shortcut.Arguments = "--new-window --start-fullscreen --disable-web-security --disable-features=VizDisplayCompositor --app=`"file:///$currentPath/launcher.html`""
$Shortcut.WorkingDirectory = $currentPath
$Shortcut.IconLocation = "$currentPath\assets\images\icon.ico"
$Shortcut.Description = "Innovative Centre IELTS Test System - Secure Testing Environment"
$Shortcut.WindowStyle = 3  # Maximized

# Save the shortcut
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully!" -ForegroundColor Green
Write-Host "Location: $([Environment]::GetFolderPath('Desktop'))\Innovative Centre - IELTS Test System.lnk" -ForegroundColor Yellow

# Alternative - create a batch file for launching
$batchContent = @"
@echo off
title Innovative Centre - IELTS Test System
echo Starting Innovative Centre IELTS Test System...
echo.
echo Please wait while the application launches...
echo.

REM Try different browsers in order of preference
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --start-fullscreen --disable-web-security --disable-features=VizDisplayCompositor --app="file:///%~dp0launcher.html"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --start-fullscreen --disable-web-security --disable-features=VizDisplayCompositor --app="file:///%~dp0launcher.html"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --new-window --start-fullscreen --app="file:///%~dp0launcher.html"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window --start-fullscreen --app="file:///%~dp0launcher.html"
) else (
    echo No supported browser found. Please install Google Chrome or Microsoft Edge.
    pause
)
"@

Set-Content -Path "$currentPath\Launch IELTS Test System.bat" -Value $batchContent

Write-Host "Batch file launcher created: Launch IELTS Test System.bat" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the test system by:" -ForegroundColor Cyan
Write-Host "1. Double-clicking the desktop shortcut" -ForegroundColor White
Write-Host "2. Running 'Launch IELTS Test System.bat'" -ForegroundColor White
Write-Host "3. Opening 'launcher.html' in your browser" -ForegroundColor White
