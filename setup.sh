#!/bin/bash

# Error handling: Do not exit on error immediately so we can trigger fallbacks
handle_error() {
    echo "[!] A step encountered an error on line $1. Attempting fallback..."
}
trap 'handle_error $LINENO' ERR

echo "======================================"
echo " Automated Cyber Homepage Setup"
echo "======================================"

# 1. Check/Install aria2c
if ! command -v aria2c &> /dev/null; then
    echo "[*] aria2c could not be found. Attempting to install..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y aria2 || echo "[!] apt-get failed."
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y aria2 || echo "[!] dnf failed."
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm aria2 || echo "[!] pacman failed."
    elif command -v brew &> /dev/null; then
        brew install aria2 || echo "[!] brew failed."
    else
        echo "[!] Automatic installation failed. Please install aria2c manually: https://aria2.github.io/"
    fi
else
    echo "[ok] aria2c is already installed."
fi

# 2. Check/Update Go dependencies
if command -v go &> /dev/null; then
    echo "[*] Updating Go modules to the latest versions..."
    go get -u ./... || true
    go mod tidy || true
    
    echo "[*] Compiling the backend server..."
    go build -o homepage ./cmd/server || { echo "[x] Build failed."; exit 1; }
else
    echo "[x] Go compiler is not installed."
    echo "    Please install Go from https://go.dev/ to compile the backend."
    exit 1
fi

echo "======================================"
echo "[ok] Compilation successful."
echo ""

# 3. Service Creation
read -p "[?] Do you want to install this as an auto-starting background service? (y/n): " INSTALL_SVC

if [[ "$INSTALL_SVC" =~ ^[Yy] ]]; then
    read -p "[?] Enter a name for the service (default: cyber-homepage): " SVC_NAME
    SVC_NAME=${SVC_NAME:-cyber-homepage}

    USER_NAME=$(whoami)
    APP_DIR=$(pwd)
    EXEC_PATH="$APP_DIR/homepage"

    if command -v systemctl &> /dev/null; then
        echo "[*] Creating systemd service configuration..."
        
        # Create the service file in /tmp first
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
            sudo systemctl enable ${SVC_NAME} || echo "[!] Failed to enable service at system level."
            if sudo systemctl start ${SVC_NAME}; then
                echo "[ok] System service '${SVC_NAME}' successfully installed, enabled, and started!"
                exit 0
            else
                echo "[!] Failed to start system service. Initiating fallback..."
            fi
        else
            echo "[!] Sudo privileges unavailable or write failed. Falling back to User-level systemd service..."
            
            mkdir -p ~/.config/systemd/user/
            mv /tmp/${SVC_NAME}.service ~/.config/systemd/user/
            
            systemctl --user daemon-reload || true
            systemctl --user enable ${SVC_NAME} || echo "[!] Failed to enable user service."
            if systemctl --user start ${SVC_NAME}; then
                # Linger allows the user service to run even when not logged in
                loginctl enable-linger ${USER_NAME} 2>/dev/null || echo "[!] Linger could not be enabled, service runs only while logged in."
                echo "[ok] User service '${SVC_NAME}' successfully installed, enabled, and started!"
                exit 0
            else
                echo "[!] Failed to start user service. Initiating final fallback..."
            fi
        fi
    fi

    # Final Fallback: Nohup (if systemctl is missing or failed)
    echo "[*] systemctl is missing or failed. Fallback: Running via nohup in the background..."
    nohup ${EXEC_PATH} > homepage.log 2>&1 &
    echo "[ok] Application started in background (PID $!). It will run until you restart your machine."
else
    echo "[ok] Setup complete! You can start the server manually by running:"
    echo "     ./homepage"
fi
