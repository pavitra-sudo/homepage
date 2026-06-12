#!/bin/bash

# Error handling
handle_error() {
    echo "[!] A step encountered an error on line $1. Attempting to continue..."
}
trap 'handle_error $LINENO' ERR

echo "======================================"
echo " Automated Cyber Homepage Uninstall"
echo "======================================"

read -p "[?] Enter the name of the service you used during setup (default: cyber-homepage): " SVC_NAME
SVC_NAME=${SVC_NAME:-cyber-homepage}

echo ""
echo "[*] Attempting to stop and remove system-wide systemd service..."
if sudo systemctl is-active --quiet ${SVC_NAME} 2>/dev/null || sudo systemctl is-enabled --quiet ${SVC_NAME} 2>/dev/null; then
    sudo systemctl stop ${SVC_NAME} || true
    sudo systemctl disable ${SVC_NAME} || true
    if [ -f "/etc/systemd/system/${SVC_NAME}.service" ]; then
        sudo rm "/etc/systemd/system/${SVC_NAME}.service"
        sudo systemctl daemon-reload
        echo "[ok] System-wide service removed."
    fi
else
    echo "[-] System-wide service not found or not active."
fi

echo ""
echo "[*] Attempting to stop and remove User-level systemd service..."
if systemctl --user is-active --quiet ${SVC_NAME} 2>/dev/null || systemctl --user is-enabled --quiet ${SVC_NAME} 2>/dev/null; then
    systemctl --user stop ${SVC_NAME} || true
    systemctl --user disable ${SVC_NAME} || true
    if [ -f "$HOME/.config/systemd/user/${SVC_NAME}.service" ]; then
        rm "$HOME/.config/systemd/user/${SVC_NAME}.service"
        systemctl --user daemon-reload
        echo "[ok] User-level service removed."
    fi
else
    echo "[-] User-level service not found."
fi

echo ""
echo "[*] Killing any standalone background processes (nohup)..."
if pkill -f "./homepage" 2>/dev/null; then
    echo "[ok] Standalone background process killed."
else
    echo "[-] No standalone background process found."
fi

echo ""
echo "[*] Removing compiled binaries and logs..."
if [ -f "homepage" ]; then
    rm homepage
    echo "[ok] 'homepage' binary deleted."
fi

if [ -f "homepage.log" ]; then
    rm homepage.log
    echo "[ok] 'homepage.log' deleted."
fi

echo "======================================"
echo "[ok] Uninstall complete! The application has been fully removed from background execution."
