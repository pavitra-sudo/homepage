#!/bin/bash
cd "$(dirname "$0")" || exit 1

handle_error() {
    echo "[!] A step encountered an error on line $1. Attempting fallback..."
}
trap 'handle_error $LINENO' ERR

echo "======================================"
echo " Automated Cyber Homepage Setup"
echo "======================================"

# 1. Ask for Port
read -p "[?] Enter the port for the server to run on (default: 8088): " APP_PORT
APP_PORT=${APP_PORT:-8088}

# 2. Check/Install aria2c
if ! command -v aria2c &> /dev/null; then
    echo "[*] aria2c not found. Installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y aria2 || echo "[!] apt-get failed."
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y aria2 || echo "[!] dnf failed."
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm aria2 || echo "[!] pacman failed."
    elif command -v brew &> /dev/null; then
        brew install aria2 || echo "[!] brew failed."
    else
        echo "[*] Fallback: Downloading aria2c statically..."
        curl -sL https://github.com/q3aql/aria2-static-builds/releases/download/v1.36.0/aria2-1.36.0-linux-gnu-64bit-build1.tar.bz2 -o /tmp/aria2.tar.bz2
        tar -xjf /tmp/aria2.tar.bz2 -C /tmp/
        sudo mv /tmp/aria2-*/aria2c /usr/local/bin/ || echo "[!] Failed to move aria2c to /usr/local/bin"
        sudo chmod +x /usr/local/bin/aria2c || true
    fi
else
    echo "[ok] aria2c is already installed."
fi

# 3. Check/Install Go
if ! command -v go &> /dev/null; then
    echo "[*] Go compiler not found. Downloading and installing Go 1.21.0..."
    curl -sL https://go.dev/dl/go1.21.0.linux-amd64.tar.gz -o /tmp/go.tar.gz
    sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf /tmp/go.tar.gz
    sudo ln -sf /usr/local/go/bin/go /usr/local/bin/go
    sudo ln -sf /usr/local/go/bin/gofmt /usr/local/bin/gofmt
    echo "[ok] Go installed."
else
    echo "[ok] Go compiler is already installed."
fi

echo "[*] Updating Go modules to the latest versions..."
go get -u ./... || true
go mod tidy || true

echo "[*] Compiling the backend server..."
go build -o homepage ./cmd/server || { echo "[x] Build failed."; exit 1; }

echo "======================================"
echo "[ok] Compilation successful."
echo ""

# 4. Service Creation
read -p "[?] Do you want to install this as an auto-starting background service? (y/n): " INSTALL_SVC

if [[ "$INSTALL_SVC" =~ ^[Yy] ]]; then
    read -p "[?] Enter a name for the service (default: cyber-homepage): " SVC_NAME
    SVC_NAME=${SVC_NAME:-cyber-homepage}

    USER_NAME=$(whoami)
    APP_DIR=$(pwd)
    EXEC_PATH="$APP_DIR/homepage -port $APP_PORT"

    if command -v systemctl &> /dev/null; then
        echo "[*] Creating systemd service configuration..."
        cat <<EOF > /tmp/${SVC_NAME}.service
[Unit]
Description=Cyber Anime Homepage Background Service
After=network.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${APP_DIR}
ExecStart=${EXEC_PATH}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

        echo "[*] Attempting to install system-wide systemd service..."
        if sudo mv /tmp/${SVC_NAME}.service /etc/systemd/system/ 2>/dev/null; then
            sudo systemctl daemon-reload || true
            sudo systemctl enable ${SVC_NAME} || echo "[!] Failed to enable system-level service."
            if sudo systemctl start ${SVC_NAME}; then
                echo "[ok] System service '${SVC_NAME}' successfully installed and started on port ${APP_PORT}!"
                exit 0
            fi
        else
            echo "[!] Sudo unavailable. Falling back to User-level systemd service..."
            mkdir -p ~/.config/systemd/user/
            mv /tmp/${SVC_NAME}.service ~/.config/systemd/user/
            systemctl --user daemon-reload || true
            systemctl --user enable ${SVC_NAME} || echo "[!] Failed to enable user service."
            if systemctl --user start ${SVC_NAME}; then
                loginctl enable-linger ${USER_NAME} 2>/dev/null || true
                echo "[ok] User service '${SVC_NAME}' successfully installed and started on port ${APP_PORT}!"
                exit 0
            fi
        fi
    fi

    echo "[*] systemctl is missing or failed. Fallback: Running via nohup in the background..."
    nohup ${APP_DIR}/homepage -port ${APP_PORT} > homepage.log 2>&1 &
    echo "[ok] Application started in background on port ${APP_PORT} (PID $!)."
else
    echo "[ok] Setup complete! You can start the server manually by running:"
    echo "     ./homepage -port ${APP_PORT}"
fi
