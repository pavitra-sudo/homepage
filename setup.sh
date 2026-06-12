#!/bin/bash
cd "$(dirname "$0")" || exit 1

handle_error() {
    echo "[!] A step encountered an error on line $1. Attempting fallback..."
}
trap 'handle_error $LINENO' ERR

echo "======================================"
echo " Automated Cyber Homepage Manager"
echo "======================================"

echo "[?] Which OS are you using?"
echo "    1) Ubuntu / Debian"
echo "    2) Fedora / RHEL"
read -p "Enter choice (1 or 2): " OS_CHOICE

echo "[?] What would you like to do?"
echo "    1) Install Setup"
echo "    2) Update Application"
echo "    3) Uninstall"
read -p "Enter choice (1, 2, or 3): " ACTION_CHOICE

install_app() {
    echo "[0%] Starting installation..."
    read -p "[?] Enter the port for the server to run on (default: 8088): " APP_PORT
    APP_PORT=${APP_PORT:-8088}

    echo "[10%] Checking/Installing aria2c..."
    if ! command -v aria2c &> /dev/null; then
        if [ "$OS_CHOICE" == "1" ]; then
            sudo apt-get update && sudo apt-get install -y aria2 || echo "[!] apt-get failed."
        elif [ "$OS_CHOICE" == "2" ]; then
            sudo dnf install -y aria2 || echo "[!] dnf failed."
        else
            echo "[*] Fallback: Downloading aria2c statically..."
            curl -sL https://github.com/q3aql/aria2-static-builds/releases/download/v1.36.0/aria2-1.36.0-linux-gnu-64bit-build1.tar.bz2 -o /tmp/aria2.tar.bz2
            tar -xjf /tmp/aria2.tar.bz2 -C /tmp/
            sudo mv /tmp/aria2-*/aria2c /usr/local/bin/ || echo "[!] Failed to move aria2c to /usr/local/bin"
            sudo chmod +x /usr/local/bin/aria2c || true
        fi
    fi
    echo "[30%] aria2c verified."

    echo "[40%] Checking/Installing Go..."
    if ! command -v go &> /dev/null; then
        echo "[*] Downloading and installing Go 1.21.0..."
        curl -sL https://go.dev/dl/go1.21.0.linux-amd64.tar.gz -o /tmp/go.tar.gz
        sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf /tmp/go.tar.gz
        sudo ln -sf /usr/local/go/bin/go /usr/local/bin/go
        sudo ln -sf /usr/local/go/bin/gofmt /usr/local/bin/gofmt
    fi
    echo "[60%] Go verified."

    echo "[70%] Compiling server..."
    go get -u ./... || true
    go mod tidy || true
    go build -o homepage ./cmd/server || { echo "[x] Build failed."; exit 1; }
    echo "[80%] Compiled."

    read -p "[?] Do you want to install this as an auto-starting background service? (y/n): " INSTALL_SVC
    if [[ "$INSTALL_SVC" =~ ^[Yy] ]]; then
        read -p "[?] Enter a name for the service (default: cyber-homepage): " SVC_NAME
        SVC_NAME=${SVC_NAME:-cyber-homepage}

        USER_NAME=$(whoami)
        APP_DIR=$(pwd)
        EXEC_PATH="$APP_DIR/homepage -port $APP_PORT"

        echo "[90%] Configuring user-level service..."
        cat <<EOF > /tmp/${SVC_NAME}.service
[Unit]
Description=Cyber Anime Homepage Background Service
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=${EXEC_PATH}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

        mkdir -p ~/.config/systemd/user/
        mv /tmp/${SVC_NAME}.service ~/.config/systemd/user/
        systemctl --user daemon-reload || true
        systemctl --user enable ${SVC_NAME} || echo "[!] Failed to enable user service."
        
        if systemctl --user start ${SVC_NAME}; then
            loginctl enable-linger ${USER_NAME} 2>/dev/null || true
            echo "[100%] User service '${SVC_NAME}' successfully installed and started on port ${APP_PORT}!"
        else
            echo "[!] Failed to start user service."
        fi
    else
        echo "[100%] Setup complete! You can start the server manually by running:"
        echo "       ./homepage -port ${APP_PORT}"
    fi
}

update_app() {
    echo "[0%] Starting update..."
    
    echo "[20%] Pulling latest code..."
    git pull || echo "[!] git pull failed or not a git repository."

    echo "[40%] Updating dependencies..."
    go get -u ./... || true
    go mod tidy || true
    
    echo "[60%] Recompiling binary..."
    go build -o homepage ./cmd/server || { echo "[x] Build failed."; exit 1; }
    echo "[80%] Recompiled successfully."

    read -p "[?] Did you install this as a background service? Enter the service name if so (leave blank for none): " SVC_NAME
    if [ ! -z "$SVC_NAME" ]; then
        echo "[90%] Restarting service..."
        systemctl --user restart ${SVC_NAME} 2>/dev/null || sudo systemctl restart ${SVC_NAME} 2>/dev/null || echo "[!] Failed to restart service."
    fi

    echo "[100%] Update complete!"
}

uninstall_app() {
    echo "======================================"
    echo " Automated Cyber Homepage Uninstall"
    echo "======================================"
    
    read -p "[?] Enter the name of the service you used during setup (default: cyber-homepage): " SVC_NAME
    SVC_NAME=${SVC_NAME:-cyber-homepage}

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

    echo "[*] Killing any standalone background processes (nohup)..."
    if pkill -f "homepage -port" 2>/dev/null || pkill -f "./homepage" 2>/dev/null; then
        echo "[ok] Standalone background process killed."
    else
        echo "[-] No standalone background process found."
    fi

    echo "[*] Removing compiled binaries and logs..."
    if [ -f "homepage" ]; then
        rm homepage
        echo "[ok] 'homepage' binary deleted."
    fi
    if [ -f "homepage.log" ]; then
        rm homepage.log
    fi

    read -p "[?] Do you want to explicitly uninstall system dependencies (Go, aria2c)? (y/n): " UNINSTALL_DEPS
    if [[ "$UNINSTALL_DEPS" =~ ^[Yy] ]]; then
        echo "[*] Removing Go from /usr/local/go..."
        sudo rm -rf /usr/local/go
        sudo rm -f /usr/local/bin/go /usr/local/bin/gofmt
        
        echo "[*] Removing aria2c..."
        if [ "$OS_CHOICE" == "1" ]; then
            sudo apt-get remove -y aria2
        elif [ "$OS_CHOICE" == "2" ]; then
            sudo dnf remove -y aria2
        else
            echo "[!] Could not determine OS, attempting auto-detect for removal..."
            if command -v apt-get &> /dev/null; then sudo apt-get remove -y aria2;
            elif command -v dnf &> /dev/null; then sudo dnf remove -y aria2;
            elif command -v pacman &> /dev/null; then sudo pacman -Rns --noconfirm aria2;
            elif command -v brew &> /dev/null; then brew uninstall aria2;
            fi
        fi
        sudo rm -f /usr/local/bin/aria2c
        echo "[ok] Dependencies removed."
    fi

    echo "======================================"
    echo "[ok] Uninstall complete!"
}

# --- Main execution flow ---
if [ "$ACTION_CHOICE" == "1" ]; then
    install_app
elif [ "$ACTION_CHOICE" == "2" ]; then
    update_app
elif [ "$ACTION_CHOICE" == "3" ]; then
    uninstall_app
else
    echo "Unknown choice. Exiting."
    exit 1
fi
