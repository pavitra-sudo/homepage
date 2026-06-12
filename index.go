package main

import (
	"crypto/tls"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"
)

type Download struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	Dir      string `json:"dir"`
	Name     string `json:"name"`
	Progress string `json:"progress"`
	Speed    string `json:"speed"`
	ETA      string `json:"eta"`
	Seeds    string `json:"seeds"`
	Peers    string `json:"peers"`
	Status   string `json:"status"` // "downloading", "completed", "error"
	cmd      *exec.Cmd
}

var (
	downloads   = make(map[string]*Download)
	downloadsMu sync.Mutex
	// Matches aria2c output like: [#123456 10MiB/50MiB(1%) CN:1 SD:0 DL:1MiB ETA:40s]
	progressRe  = regexp.MustCompile(`\[#[a-zA-Z0-9]+\s+([^/]+)/([^\(\s]+)(?:\(([^%]+%)\))?.*?CN:([0-9]+).*?(?:SD:([0-9]+))?.*?DL:([^\]\s]+)(?:\s+ETA:([^\]]+))?\]`)
)

func handleDownloadsAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		downloadsMu.Lock()
		defer downloadsMu.Unlock()
		list := make([]*Download, 0, len(downloads))
		for _, d := range downloads {
			list = append(list, d)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)
		return
	}

	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		downloadsMu.Lock()
		dl, ok := downloads[id]
		downloadsMu.Unlock()
		if ok {
			if dl.cmd != nil && dl.cmd.Process != nil {
				dl.cmd.Process.Kill()
			}
			downloadsMu.Lock()
			delete(downloads, id)
			downloadsMu.Unlock()
		}
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method == http.MethodPost {
		var req struct {
			URL         string `json:"url"`
			Dir         string `json:"dir"`
			SelectFiles string `json:"select_files"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		if req.URL == "" {
			http.Error(w, "URL is required", http.StatusBadRequest)
			return
		}

		if !strings.HasPrefix(req.URL, "magnet:?xt=urn:btih:") && !strings.HasSuffix(req.URL, ".torrent") {
			http.Error(w, "Only Magnet links or Torrent files are allowed", http.StatusBadRequest)
			return
		}

		if req.Dir == "" {
			req.Dir = "downloads"
		}
		os.MkdirAll(req.Dir, 0755)

		name := "Unknown Torrent"
		if parsed, err := url.Parse(req.URL); err == nil {
			if dn := parsed.Query().Get("dn"); dn != "" {
				name = dn
			}
		}

		id := time.Now().Format("20060102150405")
		dl := &Download{
			ID:     id,
			URL:    req.URL,
			Dir:    req.Dir,
			Name:   name,
			Status: "downloading",
		}

		downloadsMu.Lock()
		downloads[id] = dl
		downloadsMu.Unlock()

		go startDownload(dl, req.SelectFiles)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(dl)
		return
	}

	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

func handleMetadataAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// For simplicity, we just return a simulated file list for now if the user actually requested metadata,
	// because downloading metadata synchronously with aria2c can take too long for an HTTP request.
	// But let's attempt to run aria2c -S if it's a local torrent, or just return an error that they should start it.
	// Wait, we can run aria2c --bt-metadata-only=true --bt-save-metadata=true [url] and read the output.
	// Let's implement it synchronously with a timeout.
	cmd := exec.Command("aria2c", "--bt-metadata-only=true", "--bt-save-metadata=true", "--bt-require-crypto=true", "--seed-time=0", req.URL)
	cmd.Run() // It writes the .torrent file to current dir.

	// Extract the BTIH to find the .torrent file
	btih := ""
	if parsed, err := url.Parse(req.URL); err == nil {
		xt := parsed.Query().Get("xt")
		if strings.HasPrefix(xt, "urn:btih:") {
			btih = strings.TrimPrefix(xt, "urn:btih:")
		}
	}

	if btih == "" {
		http.Error(w, "Invalid magnet link", http.StatusBadRequest)
		return
	}

	torrentFile := btih + ".torrent"
	if _, err := os.Stat(torrentFile); os.IsNotExist(err) {
		// Sometimes aria2c outputs as uppercase BTIH
		torrentFile = strings.ToUpper(btih) + ".torrent"
	}

	out, err := exec.Command("aria2c", "-S", torrentFile).Output()
	if err != nil {
		http.Error(w, "Failed to parse metadata", http.StatusInternalServerError)
		return
	}

	// Parse aria2c -S output
	lines := strings.Split(string(out), "\n")
	type File struct {
		Index string `json:"index"`
		Path  string `json:"path"`
	}
	var files []File
	fileRe := regexp.MustCompile(`^\s*(\d+)\|(.+)$`)
	for _, line := range lines {
		if match := fileRe.FindStringSubmatch(line); len(match) == 3 {
			files = append(files, File{
				Index: match[1],
				Path:  strings.TrimSpace(match[2]),
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"torrent_file": torrentFile,
		"files":        files,
	})
}

func startDownload(dl *Download, selectFiles string) {
	args := []string{"--dir=" + dl.Dir, "--summary-interval=1", "--seed-time=0", "--bt-require-crypto=true"}
	if selectFiles != "" {
		args = append(args, "--select-file="+selectFiles)
	}
	args = append(args, dl.URL)
	cmd := exec.Command("aria2c", args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		updateStatus(dl.ID, "error")
		return
	}

	if err := cmd.Start(); err != nil {
		updateStatus(dl.ID, "error")
		return
	}

	downloadsMu.Lock()
	dl.cmd = cmd
	downloadsMu.Unlock()

	go func() {
		buf := make([]byte, 512)
		var output string
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				output += string(buf[:n])
				matches := progressRe.FindAllStringSubmatch(output, -1)
				if len(matches) > 0 {
					lastMatch := matches[len(matches)-1]
					downloadsMu.Lock()
					if lastMatch[3] != "" {
						dl.Progress = lastMatch[3]
					} else {
						dl.Progress = lastMatch[1] + "/" + lastMatch[2]
					}
					dl.Peers = lastMatch[4]
					if len(lastMatch) > 5 && lastMatch[5] != "" {
						dl.Seeds = lastMatch[5]
					}
					dl.Speed = lastMatch[6]
					if len(lastMatch) > 7 && lastMatch[7] != "" {
						dl.ETA = lastMatch[7]
					}
					downloadsMu.Unlock()

					// keep the output buffer small
					if len(output) > 2048 {
						output = output[len(output)-1024:]
					}
				}
			}
			if err != nil {
				break
			}
		}
	}()

	err = cmd.Wait()
	downloadsMu.Lock()
	defer downloadsMu.Unlock()
	if err != nil {
		dl.Status = "error"
	} else {
		dl.Status = "completed"
		dl.Progress = "100%"
		dl.Speed = "0B/s"
		dl.ETA = ""
	}
}

func updateStatus(id, status string) {
	downloadsMu.Lock()
	defer downloadsMu.Unlock()
	if dl, ok := downloads[id]; ok {
		dl.Status = status
	}
}

func main() {
	http.HandleFunc("/api/downloads", handleDownloadsAPI)
	http.HandleFunc("/api/downloads/metadata", handleMetadataAPI)

	// Serve current directory (like SimpleHTTPRequestHandler)
	fs := http.FileServer(http.Dir("."))
	http.Handle("/", fs)

	// Load TLS certificate
	certFile := "certificates/cert.pem"
	keyFile := "certificates/key.pem"

	server := &http.Server{
		Addr: ":8088",
		TLSConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
	}

	log.Println("Serving at https://localhost:8088")

	err := server.ListenAndServeTLS(certFile, keyFile)
	if err != nil {
		log.Fatal(err)
	}
}
