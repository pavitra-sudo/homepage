package api

import (
	"encoding/json"
	"homepage/internal/core"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

type Handlers struct {
	svc core.DownloadService
}

func NewHandlers(svc core.DownloadService) *Handlers {
	return &Handlers{svc: svc}
}

func (h *Handlers) HandleDownloadsAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		downloads := h.svc.GetDownloads()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(downloads)
		return
	}

	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		h.svc.DeleteDownload(id)
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

		if !strings.HasPrefix(req.URL, "magnet:") && !strings.HasSuffix(req.URL, ".torrent") && !strings.HasPrefix(req.URL, "http://") && !strings.HasPrefix(req.URL, "https://") {
			http.Error(w, "Only Magnet, Torrent, or HTTP(s) links are allowed", http.StatusBadRequest)
			return
		}

		if req.Dir == "" {
			req.Dir = "downloads"
		}
		os.MkdirAll(req.Dir, 0755)

		dl, err := h.svc.AddDownload(req.URL, req.Dir, req.SelectFiles)
		if err != nil {
			http.Error(w, "Failed to start download", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(dl)
		return
	}

	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

func (h *Handlers) HandleMetadataAPI(w http.ResponseWriter, r *http.Request) {
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

	torrentFile, files, err := h.svc.FetchMetadata(req.URL)
	if err != nil {
		http.Error(w, "Failed to parse metadata", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"torrent_file": torrentFile,
		"files":        files,
	})
}

func (h *Handlers) HandleFsNativePickerAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var pathStr string
	if runtime.GOOS == "windows" {
		cmd := exec.Command("powershell", "-NoProfile", "-Command", "& {Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; if($f.ShowDialog() -eq 'OK'){ $f.SelectedPath }}")
		out, _ := cmd.Output()
		pathStr = strings.TrimSpace(string(out))
	} else {
		cmd := exec.Command("zenity", "--file-selection", "--directory", "--title=Select Download Directory")
		out, _ := cmd.Output()
		pathStr = strings.TrimSpace(string(out))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"path": pathStr})
}
