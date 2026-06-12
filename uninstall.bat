@echo off
setlocal enabledelayedexpansion

echo ======================================
echo  Automated Cyber Homepage Uninstall
echo ======================================

set /p SVC_NAME="[?] Enter the name of the service you used during setup (default: CyberHomepage): "
if "!SVC_NAME!"=="" set SVC_NAME=CyberHomepage
echo.

echo [*] Attempting to stop and remove Scheduled Task...
schtasks /query /tn "!SVC_NAME!" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    schtasks /end /tn "!SVC_NAME!" >nul 2>&1
    schtasks /delete /tn "!SVC_NAME!" /f >nul 2>&1
    echo [ok] Scheduled Task '!SVC_NAME!' removed.
) else (
    echo [-] Scheduled Task not found.
)
echo.

echo [*] Attempting to remove Startup shortcut...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "!STARTUP_DIR!\!SVC_NAME!.lnk" (
    del "!STARTUP_DIR!\!SVC_NAME!.lnk"
    echo [ok] Startup shortcut removed.
) else (
    echo [-] Startup shortcut not found.
)
echo.

echo [*] Killing any running homepage.exe processes...
taskkill /F /IM homepage.exe >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo [ok] Background processes terminated.
) else (
    echo [-] No background process found running.
)
echo.

echo [*] Removing built binaries...
if exist "homepage.exe" (
    del homepage.exe
    echo [ok] 'homepage.exe' deleted.
)

echo ======================================
echo [ok] Uninstall complete! The application has been fully removed.
pause
