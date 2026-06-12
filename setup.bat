@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ======================================
echo  Automated Cyber Homepage Manager
echo ======================================

echo [?] What would you like to do?
echo     1) Install Setup
echo     2) Update Application
echo     3) Uninstall
set /p ACTION_CHOICE="Enter choice (1, 2, or 3): "

if "!ACTION_CHOICE!"=="1" goto Install
if "!ACTION_CHOICE!"=="2" goto Update
if "!ACTION_CHOICE!"=="3" goto Uninstall

echo [!] Unknown choice. Exiting.
pause
exit /b 1

:Install
echo [0%%] Starting installation...

:: 1. Ask for Port
set /p APP_PORT="[?] Enter the port for the server to run on (default: 8088): "
if "!APP_PORT!"=="" set APP_PORT=8088

echo [10%%] Checking/Installing aria2c...
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
echo [30%%] aria2c verified.

echo [40%%] Checking/Installing Go...
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
)
echo [60%%] Go verified.

echo [70%%] Compiling the backend server...
go get -u ./... >nul 2>&1
go mod tidy >nul 2>&1
go build -o homepage.exe ./cmd/server
if %ERRORLEVEL% NEQ 0 (
    echo [x] Build failed!
    pause
    exit /b 1
)
echo [80%%] Compiled successfully.

set /p INSTALL_SVC="[?] Do you want to install this as an auto-starting background service? (y/n): "
if /i "!INSTALL_SVC!"=="y" (
    set /p SVC_NAME="[?] Enter a name for the service (default: CyberHomepage): "
    if "!SVC_NAME!"=="" set SVC_NAME=CyberHomepage

    echo [90%%] Configuring service...
    
    :: Create a VBS wrapper
    set "START_VBS=%CD%\start.vbs"
    echo Set FSO = CreateObject^("Scripting.FileSystemObject"^) > "!START_VBS!"
    echo ScriptDir = FSO.GetParentFolderName^(WScript.ScriptFullName^) >> "!START_VBS!"
    echo Set WshShell = CreateObject^("WScript.Shell"^) >> "!START_VBS!"
    echo WshShell.CurrentDirectory = ScriptDir >> "!START_VBS!"
    echo WshShell.Run "homepage.exe -port !APP_PORT!", 0, False >> "!START_VBS!"

    schtasks /create /tn "!SVC_NAME!" /tr "wscript.exe \"!START_VBS!\"" /sc onlogon /rl highest /f >nul 2>&1
    powershell -Command "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0; Set-ScheduledTask -TaskName '!SVC_NAME!' -Settings $settings" >nul 2>&1

    if !ERRORLEVEL! EQU 0 (
        echo [ok] Scheduled task created.
        schtasks /run /tn "!SVC_NAME!" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo [100%%] Service started successfully on port !APP_PORT!!
        ) else (
            echo [!] Failed to start task. Starting manually...
            start "" "%CD%\homepage.exe" -port !APP_PORT!
            echo [100%%] Started.
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
        
        start "" "%CD%\homepage.exe" -port !APP_PORT!
        echo [100%%] Startup shortcut created and app started.
    )
) else (
    echo [100%%] Setup complete! You can start the server manually by running:
    echo        homepage.exe -port !APP_PORT!
)
pause
exit /b 0

:Update
echo [0%%] Starting update...

echo [20%%] Pulling latest code...
git pull

echo [40%%] Updating dependencies...
go get -u ./... >nul 2>&1
go mod tidy >nul 2>&1

echo [60%%] Recompiling binary...
go build -o homepage.exe ./cmd/server
if %ERRORLEVEL% NEQ 0 (
    echo [x] Build failed!
    pause
    exit /b 1
)
echo [80%%] Recompiled successfully.

echo [90%%] Restarting background service if it exists...
set "SVC_NAME=CyberHomepage"
schtasks /query /tn "!SVC_NAME!" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    schtasks /end /tn "!SVC_NAME!" >nul 2>&1
    schtasks /run /tn "!SVC_NAME!" >nul 2>&1
    echo [ok] Scheduled Task '!SVC_NAME!' restarted.
) else (
    :: Try to kill and rely on startup shortcut next boot, or just restart if it was running standalone
    taskkill /F /IM homepage.exe >nul 2>&1
    start "" "%CD%\homepage.exe" -port 8088
    echo [ok] Background process restarted.
)

echo [100%%] Update complete!
pause
exit /b 0

:Uninstall
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
if exist "aria2c.exe" (
    del aria2c.exe
    echo [ok] Local 'aria2c.exe' deleted.
)
if exist "start.vbs" (
    del start.vbs
    echo [ok] 'start.vbs' wrapper deleted.
)

echo.
set /p UNINSTALL_DEPS="[?] Do you want to explicitly uninstall Go and global aria2c? (y/n): "
if /i "!UNINSTALL_DEPS!"=="y" (
    echo [*] Removing global aria2c.exe...
    del "%SystemRoot%\System32\aria2c.exe" >nul 2>&1
    
    echo [*] Uninstalling Go...
    wmic product where "name like 'Go Programming Language%%'" call uninstall /nointeractive >nul 2>&1
    echo [ok] Dependencies removed.
)

echo ======================================
echo [ok] Uninstall complete!
pause
exit /b 0
