package core

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
}

type File struct {
	Index string `json:"index"`
	Path  string `json:"path"`
}

type Downloader interface {
	Start(dl *Download, selectFiles string, onComplete func(err error)) (Process, error)
	FetchMetadata(url string) (string, []File, error)
}

type Process interface {
	Kill() error
}

type DownloadService interface {
	GetDownloads() []*Download
	AddDownload(url, dir, selectFiles string) (*Download, error)
	DeleteDownload(id string) error
	FetchMetadata(url string) (string, []File, error)
}
