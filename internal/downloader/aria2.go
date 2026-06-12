package downloader

import (
	"homepage/internal/core"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

type Aria2 struct{}

type Aria2Process struct {
	cmd *exec.Cmd
}

func (p *Aria2Process) Kill() error {
	if p.cmd != nil && p.cmd.Process != nil {
		return p.cmd.Process.Kill()
	}
	return nil
}

func NewAria2() *Aria2 {
	return &Aria2{}
}

var progressRe = regexp.MustCompile(`\[#[a-zA-Z0-9]+\s+([^/]+)/([^\(\s]+)(?:\(([^%]+%)\))?.*?CN:([0-9]+).*?(?:SD:([0-9]+))?.*?DL:([^\]\s]+)(?:\s+ETA:([^\]]+))?\]`)

func (a *Aria2) Start(dl *core.Download, selectFiles string, onComplete func(err error)) (core.Process, error) {
	args := []string{"--dir=" + dl.Dir, "--summary-interval=1", "--seed-time=0", "--bt-require-crypto=true"}
	if selectFiles != "" {
		args = append(args, "--select-file="+selectFiles)
	}
	args = append(args, dl.URL)
	cmd := exec.Command("aria2c", args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	if err := cmd.Start(); err != nil {
		return nil, err
	}

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
					
					progress := lastMatch[1] + "/" + lastMatch[2]
					if lastMatch[3] != "" {
						progress = lastMatch[3]
					}
					
					peers := lastMatch[4]
					seeds := ""
					if len(lastMatch) > 5 && lastMatch[5] != "" {
						seeds = lastMatch[5]
					}
					speed := lastMatch[6]
					eta := ""
					if len(lastMatch) > 7 && lastMatch[7] != "" {
						eta = lastMatch[7]
					}

					// Ideally we'd use a callback, but for simplicity we modify dl directly.
					// Note: The manager must protect access to this if iterated over.
					dl.Progress = progress
					dl.Peers = peers
					dl.Seeds = seeds
					dl.Speed = speed
					dl.ETA = eta

					if len(output) > 2048 {
						output = output[len(output)-1024:]
					}
				}
			}
			if err != nil {
				break
			}
		}
		
		err := cmd.Wait()
		if onComplete != nil {
			onComplete(err)
		}
	}()

	return &Aria2Process{cmd: cmd}, nil
}

func (a *Aria2) FetchMetadata(magnetUrl string) (string, []core.File, error) {
	cmd := exec.Command("aria2c", "--bt-metadata-only=true", "--bt-save-metadata=true", "--bt-require-crypto=true", "--seed-time=0", magnetUrl)
	cmd.Run()

	btih := ""
	if parsed, err := url.Parse(magnetUrl); err == nil {
		xt := parsed.Query().Get("xt")
		if strings.HasPrefix(xt, "urn:btih:") {
			btih = strings.TrimPrefix(xt, "urn:btih:")
		}
	}

	torrentFile := btih + ".torrent"
	if _, err := os.Stat(torrentFile); os.IsNotExist(err) {
		torrentFile = strings.ToUpper(btih) + ".torrent"
	}

	out, err := exec.Command("aria2c", "-S", torrentFile).Output()
	if err != nil {
		return "", nil, err
	}

	lines := strings.Split(string(out), "\n")
	var files []core.File
	fileRe := regexp.MustCompile(`^\s*(\d+)\|(.+)$`)
	for _, line := range lines {
		if match := fileRe.FindStringSubmatch(line); len(match) == 3 {
			files = append(files, core.File{
				Index: match[1],
				Path:  strings.TrimSpace(match[2]),
			})
		}
	}

	return torrentFile, files, nil
}
