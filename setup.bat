@echo off
setlocal enabledelayedexpansion

echo ======================================
echo  Automated Cyber Homepage Setup
echo ======================================

:: 1. Ask for Port
set /p APP_PORT="[?] Enter the port for the server to run on (default: 8088): "
if "!APP_PORT!"=="" set APP_PORT=8088

:: 2. Check/Install aria2c
where aria2c >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [*] aria2c not found. Downloading aria2c...
    curl -sL -o "%TEMP%\aria2.zip" https://github.com/aria2/aria2/releases/download/release-1.36.0/aria2-1.36.0-win-64bit-build1.zip
    powershell -command "Expand-Archive -Force '%TEMP%\aria2.zip' '%TEMP%\aria2_ext'"
    copy /Y "%TEMP%\aria2_ext\aria2-1.36.0-win-64bit-build1\aria2c.exe" "%SystemRoot%\System32\aria2c.exe" >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo [!] Administrator privileges required to install aria2c globally.
        echo [*] Fallback: Copying aria2c to current directory...
        copy /Y "%TEMP%\aria2_ext\aria2-1.36.0-win-64bit-build1\aria2c.exe" "%CD%\aria2c.exe" >nul
        set PATH=%CD%;!PATH!
    ) else (
        echo [ok] aria2c installed.
    )
) else (
    echo [ok] aria2c is already installed.
)

:: 3. Check/Install Go
where go >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [*] Go compiler not found. Downloading Go 1.21.0...
    curl -sL -o "%TEMP%\go.msi" https://go.dev/dl/go1.21.0.windows-amd64.msi
    echo [*] Installing Go silently ^(Administrator required^)...
    msiexec /i "%TEMP%\go.msi" /quiet
    set PATH=C:\Program Files\Go\bin;!PATH!
    where go >nul 2>nul
    if !ERRORLEVEL! NEQ 0 (
        echo [x] Go installation failed. Please install manually.
        pause
        exit /b 1
    )
    echo [ok] Go installed.
) else (
    echo [ok] Go compiler is already installed.
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

:: 4. Service Creation
set /p INSTALL_SVC="[?] Do you want to install this as an auto-starting background service? (y/n): "
if /i "!INSTALL_SVC!"=="y" (
    set /p SVC_NAME="[?] Enter a name for the service (default: CyberHomepage): "
    if "!SVC_NAME!"=="" set SVC_NAME=CyberHomepage

    echo [*] Attempting to create a Scheduled Task for auto-start...
    schtasks /create /tn "!SVC_NAME!" /tr "%CD%\homepage.exe -port !APP_PORT!" /sc onlogon /rl highest /f >nul 2>&1
    
    if !ERRORLEVEL! EQU 0 (
        echo [ok] Scheduled task created. It will start automatically on logon.
        echo [*] Starting the service now...
        schtasks /run /tn "!SVC_NAME!" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo [ok] Service started successfully on port !APP_PORT!!
        ) else (
            echo [!] Failed to start the task immediately. Fallback: Starting manually...
            start "" "%CD%\homepage.exe" -port !APP_PORT!
        )
    ) else (
        echo [!] Administrator privileges required for Scheduled Tasks. 
        echo [*] Fallback: Creating a Startup folder shortcut instead...
        
        set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
        set "VBS_SCRIPT=%TEMP%\CreateShortcut.vbs"
        
        echo Set WshShell = CreateObject^("WScript.Shell"^) > "!VBS_SCRIPT!"
        echo Set oShellLink = WshShell.CreateShortcut^("!STARTUP_DIR!\!SVC_NAME!.lnk"^) >> "!VBS_SCRIPT!"
        echo oShellLink.TargetPath = "%CD%\homepage.exe" >> "!VBS_SCRIPT!"
        echo oShellLink.Arguments = "-port !APP_PORT!" >> "!VBS_SCRIPT!"
        echo oShellLink.WorkingDirectory = "%CD%" >> "!VBS_SCRIPT!"
        echo oShellLink.WindowStyle = 7 >> "!VBS_SCRIPT!"
        echo oShellLink.Save >> "!VBS_SCRIPT!"
        
        cscript /nologo "!VBS_SCRIPT!"
        del "!VBS_SCRIPT!"
        
        echo [ok] Startup shortcut created successfully.
        
        echo [*] Starting the application now...
        start "" "%CD%\homepage.exe" -port !APP_PORT!
    )
    
    echo ======================================
    echo [ok] Service setup complete!
) else (
    echo [ok] Setup complete! You can start the server manually by running:
    echo      homepage.exe -port !APP_PORT!
)

pause
