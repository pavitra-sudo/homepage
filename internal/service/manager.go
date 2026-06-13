package service

import (
	"homepage/internal/core"
	"net/url"
	"strings"
	"sync"
	"time"
)

type DownloadManager struct {
	downloads map[string]*core.Download
	processes map[string]core.Process
	mu        sync.Mutex
	engine    core.Downloader
}

func NewDownloadManager(engine core.Downloader) *DownloadManager {
	return &DownloadManager{
		downloads: make(map[string]*core.Download),
		processes: make(map[string]core.Process),
		engine:    engine,
	}
}

func (m *DownloadManager) GetDownloads() []*core.Download {
	m.mu.Lock()
	defer m.mu.Unlock()
	list := make([]*core.Download, 0, len(m.downloads))
	for _, d := range m.downloads {
		list = append(list, d)
	}
	return list
}

func (m *DownloadManager) AddDownload(reqUrl, dir, selectFiles string) (*core.Download, error) {
	name := ""
	if parsed, err := url.Parse(reqUrl); err == nil {
		if dn := parsed.Query().Get("dn"); dn != "" {
			name = dn
		} else if parsed.Scheme == "http" || parsed.Scheme == "https" {
			pathParts := strings.Split(parsed.Path, "/")
			if len(pathParts) > 0 && pathParts[len(pathParts)-1] != "" {
				name = pathParts[len(pathParts)-1]
			}
		}
	}
	
	if name == "" {
		if strings.HasPrefix(reqUrl, "magnet:") {
			name = "Unknown Torrent"
		} else {
			name = "Unknown Download"
		}
	}

	id := time.Now().Format("20060102150405")
	dl := &core.Download{
		ID:     id,
		URL:    reqUrl,
		Dir:    dir,
		Name:   name,
		Status: "downloading",
	}

	m.mu.Lock()
	m.downloads[id] = dl
	m.mu.Unlock()

	process, err := m.engine.Start(dl, selectFiles, func(err error) {
		m.mu.Lock()
		defer m.mu.Unlock()
		if err != nil {
			dl.Status = "error"
		} else {
			dl.Status = "completed"
			dl.Progress = "100%"
			dl.Speed = "0B/s"
			dl.ETA = ""
		}
		delete(m.processes, id)
	})

	if err != nil {
		m.mu.Lock()
		dl.Status = "error"
		m.mu.Unlock()
		return dl, err
	}

	m.mu.Lock()
	m.processes[id] = process
	m.mu.Unlock()

	return dl, nil
}

func (m *DownloadManager) DeleteDownload(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if process, ok := m.processes[id]; ok {
		process.Kill()
		delete(m.processes, id)
	}
	delete(m.downloads, id)
	return nil
}

func (m *DownloadManager) FetchMetadata(reqUrl string) (string, []core.File, error) {
	return m.engine.FetchMetadata(reqUrl)
}
