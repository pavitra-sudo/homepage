import { appConfig } from './config.js';

export function initDownloader() {
  const dlOverlay = document.getElementById('downloader-overlay');
  const dlClose = document.getElementById('downloader-close');
  const dlUrl = document.getElementById('dl-url');
  const dlDir = document.getElementById('dl-dir');
  const dlStartBtn = document.getElementById('dl-start-btn');
  const dlFetchBtn = document.getElementById('dl-fetch-btn');
  const dlSelectFilesContainer = document.getElementById('dl-select-files-container');
  const dlList = document.getElementById('downloads-list');
  const dlBrowseBtn = document.getElementById('dl-browse-btn');
  const dlActiveWidget = document.getElementById('dl-active-widget');

  dlClose.addEventListener('click', () => {
    dlOverlay.classList.remove('active');
  });

  dlOverlay.addEventListener('click', (e) => {
    if (e.target === dlOverlay) dlOverlay.classList.remove('active');
  });

  dlUrl.addEventListener('input', () => {
    dlStartBtn.disabled = dlUrl.value.trim() === '';
  });

  dlFetchBtn.addEventListener('click', async () => {
    const url = dlUrl.value.trim();
    if (!url || (!url.startsWith('magnet:') && !url.endsWith('.torrent'))) return;
    
    dlFetchBtn.innerText = "Fetching...";
    dlStartBtn.disabled = true;
    dlSelectFilesContainer.style.display = 'none';
    dlSelectFilesContainer.innerHTML = '';
    
    try {
      const res = await fetch('/api/downloads/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!res.ok) throw new Error("Failed to fetch metadata");
      
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        dlSelectFilesContainer.style.display = 'block';
        let html = '<div style="font-size: 0.8rem; margin-bottom: 0.5rem; color: #ccc;">Select files to download:</div>';
        data.files.forEach(f => {
          html += `<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
            <input type="checkbox" class="dl-file-cb" value="${f.index}" checked>
            <span style="font-size: 0.8rem; word-break: break-all; color: var(--accent-red);">${f.path}</span>
          </div>`;
        });
        dlSelectFilesContainer.innerHTML = html;
        dlStartBtn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching metadata. Is it a valid magnet link?");
    } finally {
      dlFetchBtn.innerText = "Fetch Metadata";
    }
  });

  dlStartBtn.addEventListener('click', async () => {
    const url = dlUrl.value.trim();
    const dir = dlDir.value.trim() || appConfig.downloadDir;
    if (!url) return;

    let selectFiles = [];
    document.querySelectorAll('.dl-file-cb:checked').forEach(cb => {
      selectFiles.push(cb.value);
    });
    const selectFilesStr = selectFiles.join(',');

    dlStartBtn.innerText = "Starting...";
    dlStartBtn.disabled = true;
    try {
      await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, dir, select_files: selectFilesStr })
      });
      dlUrl.value = '';
      dlSelectFilesContainer.style.display = 'none';
      dlSelectFilesContainer.innerHTML = '';
    } catch (err) {
      console.error(err);
    } finally {
      dlStartBtn.innerText = "Start Download";
    }
  });

  window.deleteDownload = async (id) => {
    try {
      await fetch(`/api/downloads?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };

  dlBrowseBtn.addEventListener('click', async () => {
    dlBrowseBtn.innerText = '...';
    try {
      const res = await fetch('/api/fs/native-picker');
      const data = await res.json();
      if (data.path) {
        dlDir.value = data.path;
      }
    } catch (err) {
      console.error('Failed to open native picker:', err);
    } finally {
      dlBrowseBtn.innerText = 'Browse';
    }
  });

  setInterval(async () => {
    try {
      const res = await fetch('/api/downloads');
      const data = await res.json();
      
      // Update global floating widget
      if (!data || data.length === 0) {
        dlActiveWidget.classList.remove('active');
      } else {
        const displayData = data.slice(0, 3);
        dlActiveWidget.innerHTML = '';
        let hasActive = false;
        
        displayData.forEach(dl => {
          if (dl.status === 'removed') return;
          hasActive = true;
          const fileName = dl.name || dl.url.split('/').pop() || dl.id;
          const progress = dl.progress || '0%';
          const isComplete = dl.status === 'complete';
          
          const item = document.createElement('div');
          item.className = 'dl-aw-item';
          item.innerHTML = `
            <div class="dl-aw-title" title="${fileName}">${fileName}</div>
            <div class="dl-aw-progress-bg">
              <div class="dl-aw-progress-fill ${isComplete ? 'complete' : ''}" style="width: ${progress}"></div>
            </div>
          `;
          dlActiveWidget.appendChild(item);
        });
        
        if (hasActive) {
          dlActiveWidget.classList.add('active');
        } else {
          dlActiveWidget.classList.remove('active');
        }
      }

      // Update modal list if open
      if (!dlOverlay.classList.contains('active')) return;
      
      if (!data || data.length === 0) {
        dlList.innerHTML = '<div class="loading-text">No active downloads</div>';
        return;
      }
      
      data.sort((a, b) => b.id.localeCompare(a.id));
      
      dlList.innerHTML = '';
      data.forEach(dl => {
        const el = document.createElement('div');
        el.className = `dl-item ${dl.status}`;
        
        const fileName = dl.name || dl.url.split('/').pop() || dl.id;
        const progress = dl.progress || '0%';
        const speed = dl.speed || '0B/s';
        const eta = dl.eta || '--';
        const seeds = dl.seeds || '0';
        const peers = dl.peers || '0';
        
        el.innerHTML = `
          <div class="dl-header">
            <div class="dl-name" title="${fileName}">${fileName}</div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <div class="dl-status">${dl.status}</div>
              <button onclick="deleteDownload('${dl.id}')" style="background: rgba(255,0,0,0.2); border: 1px solid rgba(255,0,0,0.5); color: white; cursor: pointer; border-radius: 4px; padding: 2px 8px; font-size: 0.8rem; font-weight: bold; transition: all 0.2s;">&times;</button>
            </div>
          </div>
          <div class="dl-progress-bar">
            <div class="dl-progress-fill" style="width: ${progress}"></div>
          </div>
          <div class="dl-stats">
            <span>${progress}</span>
            <span>${speed} | ETA: ${eta} | SD: ${seeds} | PR: ${peers}</span>
          </div>
        `;
        dlList.appendChild(el);
      });
    } catch (err) {
      // ignore
    }
  }, 1000);
}
