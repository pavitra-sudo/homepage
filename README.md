# Cyber Anime Homepage

A high-performance, visually striking custom homepage designed with a cyberpunk red-black glassmorphism aesthetic. This project serves as a personalized dashboard, featuring dynamic widgets, an interactive environment, and a modular "Inventory Hub" for various utility tools.

## Features

- **Dynamic Visuals:** Looping video background with a subtle red vignette glow and a responsive glowing red particle cursor trail.
- **Search Integration:** Centrally placed, animated search bar configured via local JSON.
- **Anime Quotes Widget:** Displays random anime quotes from a local data source with a cool terminal-style text scrambling decryption effect.
- **Spotify Now Playing:** Context-aware widget that visualizes active Spotify playback with a CSS-animated equalizer.
- **System Inventory Hub:** A unified modular tool interface containing:
  - **Quick Links:** Add, edit, and delete personal web links. Automatically fetches website favicons and saves them to local storage.
  - **Anime Schedule:** Tracks what's airing today or any day of the week using the Jikan API. Includes countdowns to the exact air time.
  - **Spotify Stream:** Embedded Spotify player modal for continuous music playback.
  - **QR Generator:** Generate, display, and instantly download QR codes for any text or URL.
- **Secure Local Server:** Powered by a lightweight Go server (`index.go`) running on HTTPS to avoid browser security restrictions for APIs and modular fetch requests.

---

## Prerequisites

- [Go](https://golang.org/doc/install) (1.16 or higher)
- Web Browser

### Generate TLS Certificates

Since the server uses HTTPS (required for some browser features like clipboard or secure contexts), you must generate local SSL certificates.

1. Open a terminal in the root of the project.
2. Create the `certificates` directory:
   ```bash
   mkdir certificates
   ```
3. Generate a self-signed certificate using OpenSSL (or use `mkcert` for trusted local certs):
   ```bash
   openssl req -x509 -newkey rsa:4096 -keyout certificates/key.pem -out certificates/cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
   ```

---

## Running Manually

1. Open your terminal in the project directory.
2. Run the Go server:
   ```bash
   go run index.go
   ```
3. Open your browser and navigate to: `https://localhost:8088` (You may need to accept the self-signed certificate warning in your browser).

---

## Running as a Background System Service

To have the homepage server start automatically in the background when you boot your computer, follow the instructions for your operating system.

### 🐧 Linux (Systemd Service)

1. First, compile the Go server to an executable binary:
   ```bash
   go build -o homepage_server index.go
   ```
2. Create a new systemd service file:
   ```bash
   sudo nano /etc/systemd/system/homepage.service
   ```
3. Paste the following configuration (replace `/path/to/homepage` with your actual absolute project path and update the `User`):
   ```ini
   [Unit]
   Description=Cyber Anime Homepage Local Server
   After=network.target

   [Service]
   Type=simple
   User=YOUR_USERNAME
   WorkingDirectory=/path/to/homepage
   ExecStart=/path/to/homepage/homepage_server
   Restart=on-failure
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
4. Reload systemd, enable the service to start on boot, and start it:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable homepage
   sudo systemctl start homepage
   ```
5. Check the status to ensure it's running:
   ```bash
   sudo systemctl status homepage
   ```

### 🪟 Windows

You have two main options on Windows: using the Startup Folder (easier) or creating a proper Background Service using NSSM.

#### Option 1: The Startup Folder (Easiest)

1. Compile the Go server to a Windows executable:
   ```cmd
   go build -o homepage_server.exe index.go
   ```
2. Create a new text file in the project folder named `start_homepage.vbs`. This VBScript will run the server completely invisibly without leaving a command prompt window open.
3. Paste the following into `start_homepage.vbs` (change the path to match yours):
   ```vbscript
   Set WshShell = CreateObject("WScript.Shell") 
   WshShell.CurrentDirectory = "C:\path\to\homepage"
   WshShell.Run chr(34) & "C:\path\to\homepage\homepage_server.exe" & Chr(34), 0
   Set WshShell = Nothing
   ```
4. Press `Win + R`, type `shell:startup`, and press Enter. This opens your Startup folder.
5. Right-click the `start_homepage.vbs` file, select "Create shortcut", and move that shortcut into the Startup folder.

#### Option 2: Windows Service using NSSM (Robust)

1. Compile the executable:
   ```cmd
   go build -o homepage_server.exe index.go
   ```
2. Download [NSSM (Non-Sucking Service Manager)](http://nssm.cc/) and extract it.
3. Open an Administrator Command Prompt and navigate to the extracted `nssm\win64` folder.
4. Run the install command:
   ```cmd
   nssm install HomepageServer
   ```
5. A GUI window will pop up. Configure the following:
   - **Path:** Browse and select your `homepage_server.exe`.
   - **Details tab:** Set the Display name to "Cyber Anime Homepage Server".
6. Click **Install service**.
7. Start the service by running:
   ```cmd
   nssm start HomepageServer
   ```
   *Note: Ensure the `certificates` directory is in the same folder as the `.exe` so the server can find it.*

---

## Configuration

The homepage behavior is highly modular and reads from local JSON files located in the `config/` directory.

- **`config/search.json`:** Configures the default search engine, parameters, and placeholder text.
- **`config/ui.json`:** Defines the background video path and browser tab icon.
- **`config/inventory/spotifystream.json`:** Sets the default Spotify playlist/album URI.
- **`config/inventory/animeschedular.json`:** Specifies the Jikan API endpoint for anime schedules.
- **`quotes/quotes.json`:** A list of quotes displayed randomly by the quote widget.
