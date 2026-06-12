@echo off
setlocal enabledelayedexpansion

echo ======================================
echo  Automated Cyber Homepage Setup
echo ======================================

:: 1. Check aria2c
where aria2c >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] aria2c could not be found.
    echo [!] Please install aria2 manually from: https://github.com/aria2/aria2/releases
    echo [!] Make sure to add aria2c.exe to your System PATH environment variable!
    echo.
) else (
    echo [ok] aria2c is already installed and in PATH.
)

:: 2. Check and Update Go Dependencies
where go >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [x] Go compiler is not installed.
    echo [x] Please install Go from https://go.dev/
    pause
    exit /b 1
)

echo [*] Updating Go modules to the latest versions...
go get -u ./...
go mod tidy

echo [*] Compiling the backend server...
go build -o homepage.exe ./cmd/server
if %ERRORLEVEL% NEQ 0 (
    echo [x] Build failed!
    pause
    exit /b 1
)

echo ======================================
echo [ok] Compilation successful.
echo.

:: 3. Service Creation
set /p INSTALL_SVC="[?] Do you want to install this as an auto-starting background service? (y/n): "
if /i "!INSTALL_SVC!"=="y" (
    set /p SVC_NAME="[?] Enter a name for the service (default: CyberHomepage): "
    if "!SVC_NAME!"=="" set SVC_NAME=CyberHomepage

    echo [*] Attempting to create a Scheduled Task for auto-start...
    
    :: Try to create a scheduled task running with highest privileges
    schtasks /create /tn "!SVC_NAME!" /tr "%CD%\homepage.exe" /sc onlogon /rl highest /f >nul 2>&1
    
    if !ERRORLEVEL! EQU 0 (
        echo [ok] Scheduled task created. It will start automatically on logon.
        echo [*] Starting the service now...
        schtasks /run /tn "!SVC_NAME!" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo [ok] Service started successfully!
        ) else (
            echo [!] Failed to start the task immediately. Fallback: Starting manually...
            start "" "%CD%\homepage.exe"
        )
    ) else (
        echo [!] Administrator privileges required for Scheduled Tasks. 
        echo [*] Fallback: Creating a Startup folder shortcut instead...
        
        set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
        set "VBS_SCRIPT=%TEMP%\CreateShortcut.vbs"
        
        echo Set WshShell = CreateObject^("WScript.Shell"^) > "!VBS_SCRIPT!"
        echo Set oShellLink = WshShell.CreateShortcut^("!STARTUP_DIR!\!SVC_NAME!.lnk"^) >> "!VBS_SCRIPT!"
        echo oShellLink.TargetPath = "%CD%\homepage.exe" >> "!VBS_SCRIPT!"
        echo oShellLink.WorkingDirectory = "%CD%" >> "!VBS_SCRIPT!"
        echo oShellLink.WindowStyle = 7 >> "!VBS_SCRIPT!"
        echo oShellLink.Save >> "!VBS_SCRIPT!"
        
        cscript /nologo "!VBS_SCRIPT!"
        del "!VBS_SCRIPT!"
        
        echo [ok] Startup shortcut created successfully.
        
        echo [*] Starting the application now...
        start "" "%CD%\homepage.exe"
    )
    
    echo ======================================
    echo [ok] Service setup complete!
) else (
    echo [ok] Setup complete! You can start the server manually by running:
    echo      homepage.exe
)

pause
