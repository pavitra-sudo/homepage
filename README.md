# Cyber Anime Homepage

A fully modular, cyberpunk-themed custom dashboard built with a Go backend and a vanilla ES6 JavaScript frontend. It features an integrated download manager, a daily anime schedule tracker, a live Spotify visualizer widget, dynamic quick links, and a QR code generator.

## Features

*   **Aria2 Download Manager**: Directly handles Torrents and Magnet links securely using the `aria2c` process. Includes dual-step metadata fetching for granular file selection, progress tracking, and secure deletion.
*   **Anime Schedule Tracker**: Integrates with the Jikan (MyAnimeList) API to track what anime is airing today, complete with real-time countdowns.
*   **Spotify Stream Integration**: Includes an embedded player with an animated audio-visualizer widget for tracking active playback.
*   **Modular Architecture**: Built utilizing strict SOLID principles. The Go backend features decoupled services for state management and HTTP handling, while the Javascript frontend utilizes modular ES imports.
*   **Aesthetic UI**: High-end glassmorphism design with a customizable animated cursor trail (`particles.js`), real-time scrambling quote text, and a persistent looping video background.

## Prerequisites

To run this dashboard, your system must have the following dependencies installed:
*   **[Go (Golang)](https://go.dev/)**: Required to compile and run the backend web server.
*   **[Aria2](https://aria2.github.io/)**: Required for the download manager to operate. The binary `aria2c` must be accessible in your system's PATH.

## Installation & Setup

We have provided automated setup scripts for both Linux/macOS and Windows to automatically install dependencies, update Go modules to their latest versions, and compile the backend.

### For Linux / macOS
1. Open your terminal and navigate to the project directory.
2. Make the script executable:
   ```bash
   chmod +x setup.sh
   ```
3. Run the script:
   ```bash
   ./setup.sh
   ```
   *Note: This script will attempt to install or upgrade `aria2` using your system's package manager (`apt`, `dnf`, `pacman`, or `brew`) if you have `sudo` privileges.*

### For Windows
1. Open Command Prompt or PowerShell and navigate to the project directory.
2. Run the batch script:
   ```cmd
   setup.bat
   ```
   *Note: On Windows, you will need to install `aria2` manually from their [releases page](https://github.com/aria2/aria2/releases) and ensure `aria2c.exe` is added to your Environment Variables PATH.*

## Running the Dashboard

Once the setup script finishes compiling the backend, a new binary file (`homepage` on Linux/macOS, or `homepage.exe` on Windows) will be created.

1. Start the server:
   ```bash
   # Linux/macOS
   ./homepage
   
   # Windows
   homepage.exe
   ```
2. Open your web browser and navigate to:
   ```
   https://localhost:8088
   ```

*Note: Since the server uses local SSL certificates for secure local HTTP traffic (required for privacy and some browser features), you may need to accept the self-signed certificate warning in your browser.*

## Customization
*   **Background Videos**: Drop new `.mp4` files into `public/backgrounds/` and update `public/index.html`.
*   **Quotes**: Edit `public/quotes/quotes.json` to change the randomly generated dashboard text.
*   **Configuration**: Modify `public/config/` JSON files to adjust your Spotify playlist URI or default download directory.
