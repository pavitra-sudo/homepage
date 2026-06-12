// Clock
function updateTime() {
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();
  h = h < 10 ? "0" + h : h;
  m = m < 10 ? "0" + m : m;
  document.getElementById("time").innerText = `${h}:${m}`;

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("date").innerText = now.toLocaleDateString(undefined, options);
}

setInterval(updateTime, 1000);
updateTime();

// ── Configuration Loading ──
window.appConfig = { spotifyUri: null, animeApiEndpoint: "https://api.jikan.moe/v4/schedules" };

async function loadConfigs() {
  try {
    // 1. Search Config
    const searchRes = await fetch('config/search.json');
    if (searchRes.ok) {
      const searchConfig = await searchRes.json();
      const form = document.getElementById('search-form');
      const input = document.getElementById('search-input');
      if (form && input) {
        form.action = searchConfig.engine;
        input.name = searchConfig.param;
        input.placeholder = searchConfig.placeholder;
      }
    }

    // 2. Media Config
    const mediaRes = await fetch('config/inventory/spotifystream.json');
    if (mediaRes.ok) {
      const mediaConfig = await mediaRes.json();
      window.appConfig.spotifyUri = mediaConfig.spotify_uri;
    }

    // 3. Quick Links Defaults
    if (!localStorage.getItem('saved_quicklinks')) {
      const qlRes = await fetch('config/inventory/quicklinks.json');
      if (qlRes.ok) {
        const defaultLinks = await qlRes.json();
        localStorage.setItem('saved_quicklinks', JSON.stringify(defaultLinks));
        savedQuicklinks = defaultLinks;
        if (typeof renderQuickLinks === 'function') renderQuickLinks();
      }
    }

    // 4. UI Config (Background & Icon)
    const uiRes = await fetch('config/ui.json');
    if (uiRes.ok) {
      const uiConfig = await uiRes.json();
      const tabIcon = document.getElementById('tab-icon');
      if (tabIcon && uiConfig.tab_icon) {
        tabIcon.href = uiConfig.tab_icon;
      }
      
      const bgVideoSrc = document.getElementById('bg-video-src');
      const bgVideo = document.getElementById('bg-video');
      if (bgVideoSrc && bgVideo && uiConfig.bg_video) {
        if (!bgVideoSrc.src.endsWith(uiConfig.bg_video)) {
          bgVideoSrc.src = uiConfig.bg_video;
          bgVideo.load();
        }
      }
    }

    // 5. Anime Schedule Config
    const animeRes = await fetch('config/inventory/animeschedular.json');
    if (animeRes.ok) {
      const animeConfig = await animeRes.json();
      if (animeConfig.api_endpoint) {
        window.appConfig.animeApiEndpoint = animeConfig.api_endpoint;
      }
    }

    // 6. Aria2 Config
    const ariaRes = await fetch('config/inventory/aria2.json');
    if (ariaRes.ok) {
      const ariaConfig = await ariaRes.json();
      if (ariaConfig.download_dir) {
        window.appConfig.downloadDir = ariaConfig.download_dir;
      }
    }
  } catch (err) {
    console.error("Failed to load modular configs", err);
  }
}
loadConfigs();

// ── Cursor Trail: Glowing Red Particles ──
const canvas = document.getElementById("cursor-canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const particles = [];
let mouse = { x: -100, y: -100 };

document.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;

  // Spawn particles on mouse movement
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: mouse.x,
      y: mouse.y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 2 + Math.random() * 4,
    });
  }
});

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    p.size *= 0.98;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // Red glow particle
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

    // Inner bright core
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, `rgba(255, 100, 100, ${p.life})`);
    gradient.addColorStop(0.4, `rgba(255, 0, 60, ${p.life * 0.8})`);
    gradient.addColorStop(1, `rgba(255, 0, 60, 0)`);

    ctx.fillStyle = gradient;
    ctx.fill();

    // Outer glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    const outerGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    outerGlow.addColorStop(0, `rgba(255, 0, 60, ${p.life * 0.15})`);
    outerGlow.addColorStop(1, `rgba(255, 0, 60, 0)`);
    ctx.fillStyle = outerGlow;
    ctx.fill();
  }

  requestAnimationFrame(animate);
}

animate();

// ── Fetch and Display Anime Quotes ──
const scrambleLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;':,./<>?あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";

function scrambleText(element, newText) {
  let iteration = 0;
  clearInterval(element.dataset.interval);

  element.dataset.interval = setInterval(() => {
    element.innerText = newText
      .split("")
      .map((letter, index) => {
        if (index < iteration) {
          return newText[index];
        }
        // Don't scramble spaces and punctuation for a cleaner structure
        const char = newText[index];
        if (char.match(/[\s"'\.,!\?\-—\(\)]/)) {
          return char;
        }
        return scrambleLetters[Math.floor(Math.random() * scrambleLetters.length)];
      })
      .join("");

    if (iteration >= newText.length) {
      clearInterval(element.dataset.interval);
    }

    // Slower decryption speed (was 1/3)
    iteration += 1 / 2;
  }, 30); // Slower frame rate (was 30ms)
}

async function loadQuote() {
  try {
    const res = await fetch("quotes/quotes.json");
    if (!res.ok) throw new Error("Failed to load quotes");
    const quotes = await res.json();
    if (quotes && quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      scrambleText(document.getElementById("quote-text"), `"${randomQuote.text}"`);
      scrambleText(document.getElementById("quote-author"), `— ${randomQuote.author} (${randomQuote.source})`);
    }
  } catch (err) {
    console.error("Error fetching quotes:", err);
    scrambleText(document.getElementById("quote-text"), `"Whatever happens, happens."`);
    scrambleText(document.getElementById("quote-author"), "— Spike Spiegel (Cowboy Bebop)");
  }
}

loadQuote();

// ── Inventory & Schedule Modals ──
const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let currentDayIndex = new Date().getDay(); // 0 is Sunday

// Elements
const inventoryBtn = document.getElementById('inventory-btn');
const inventoryOverlay = document.getElementById('inventory-overlay');
const inventoryClose = document.getElementById('inventory-close');
const inventoryEditBtn = document.getElementById('inventory-edit-btn');
const inventoryGrid = document.getElementById('inventory-grid');

const scheduleOverlay = document.getElementById('schedule-overlay');
const scheduleClose = document.getElementById('schedule-close');
const spotifyOverlay = document.getElementById('spotify-overlay');
const spotifyClose = document.getElementById('spotify-close');

const prevBtn = document.getElementById('prev-day');
const nextBtn = document.getElementById('next-day');
const dayLabel = document.getElementById('current-day-label');
const scheduleContainer = document.getElementById('schedule-container');

// Tool Registry
const tools = [
  {
    id: 'quicklinks',
    label: 'Quick Links',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    action: () => {
      inventoryOverlay.classList.remove('active');
      document.getElementById('quicklinks-overlay').classList.add('active');
      
      // Reset edit mode when opening
      qlEditMode = false;
      document.getElementById('quicklinks-container').classList.remove('edit-mode');
      document.getElementById('edit-quicklinks-btn').classList.remove('active');
      document.getElementById('add-quicklink-btn').style.display = 'none';
      document.getElementById('add-link-form').classList.add('hidden');
      
      renderQuickLinks();
    }
  },
  {
    id: 'schedule',
    label: 'Anime Schedule',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M10 8v8l6-4-6-4z"></path></svg>',
    action: () => {
      inventoryOverlay.classList.remove('active');
      scheduleOverlay.classList.add('active');
      currentDayIndex = new Date().getDay();
      fetchSchedule();
    }
  },
  {
    id: 'spotify',
    label: 'Spotify',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>',
    action: () => {
      inventoryOverlay.classList.remove('active');
      spotifyOverlay.classList.add('active');
    }
  },
  {
    id: 'qrgenerator',
    label: 'QR Generator',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>',
    action: () => {
      inventoryOverlay.classList.remove('active');
      document.getElementById('qr-overlay').classList.add('active');
      setTimeout(() => document.getElementById('qr-input').focus(), 100);
    }
  },
  {
    id: 'downloader',
    label: 'Downloader',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    action: () => {
      inventoryOverlay.classList.remove('active');
      document.getElementById('downloader-overlay').classList.add('active');
      setTimeout(() => document.getElementById('dl-url').focus(), 100);
      
      // Auto-fill dir from config if not filled
      const dirInput = document.getElementById('dl-dir');
      if (!dirInput.value && window.appConfig.downloadDir) {
        dirInput.value = window.appConfig.downloadDir;
      }
    }
  }
];

// Load prefs
let inventoryPrefs = JSON.parse(localStorage.getItem('inventory_prefs')) || {};
tools.forEach(tool => {
  if (inventoryPrefs[tool.id] === undefined) {
    inventoryPrefs[tool.id] = true; // default enabled
  }
});

let isEditMode = false;

function renderInventory() {
  inventoryGrid.innerHTML = '';
  tools.forEach(tool => {
    const isEnabled = inventoryPrefs[tool.id];
    if (!isEditMode && !isEnabled) return; // Skip disabled items in normal mode

    const item = document.createElement('div');
    item.className = 'inventory-item';
    if (!isEnabled) item.classList.add('disabled');
    
    item.innerHTML = `
      <div class="inventory-icon">${tool.icon}</div>
      <div class="inventory-label">${tool.label}</div>
    `;

    item.addEventListener('click', () => {
      if (isEditMode) {
        inventoryPrefs[tool.id] = !inventoryPrefs[tool.id];
        localStorage.setItem('inventory_prefs', JSON.stringify(inventoryPrefs));
        renderInventory();
      } else {
        tool.action();
      }
    });

    inventoryGrid.appendChild(item);
  });
}

// Edit Mode Toggle
inventoryEditBtn.addEventListener('click', () => {
  isEditMode = !isEditMode;
  if (isEditMode) {
    inventoryGrid.classList.add('edit-mode');
    inventoryEditBtn.classList.add('active');
  } else {
    inventoryGrid.classList.remove('edit-mode');
    inventoryEditBtn.classList.remove('active');
  }
  renderInventory();
});

// Inventory Modal Logic
inventoryBtn.addEventListener('click', () => {
  isEditMode = false; // Always open in normal mode
  inventoryGrid.classList.remove('edit-mode');
  inventoryEditBtn.classList.remove('active');
  renderInventory(); 
  inventoryOverlay.classList.add('active');
});

inventoryClose.addEventListener('click', () => {
  inventoryOverlay.classList.remove('active');
});

inventoryOverlay.addEventListener('click', (e) => {
  if (e.target === inventoryOverlay) inventoryOverlay.classList.remove('active');
});

// Schedule Modal Overlays
scheduleClose.addEventListener('click', () => {
  scheduleOverlay.classList.remove('active');
});

scheduleOverlay.addEventListener('click', (e) => {
  if (e.target === scheduleOverlay) scheduleOverlay.classList.remove('active');
});

// Spotify Modal Overlays
spotifyClose.addEventListener('click', () => {
  spotifyOverlay.classList.remove('active');
});

spotifyOverlay.addEventListener('click', (e) => {
  if (e.target === spotifyOverlay) spotifyOverlay.classList.remove('active');
});

// Navigation
prevBtn.addEventListener('click', () => {
  currentDayIndex = (currentDayIndex - 1 + 7) % 7;
  fetchSchedule();
});

nextBtn.addEventListener('click', () => {
  currentDayIndex = (currentDayIndex + 1) % 7;
  fetchSchedule();
});

let countdownInterval;

function getNextAiringDate(dayName, timeStr) {
  if (!dayName || !timeStr || dayName === 'Unknown') return { targetDate: null, airedToday: false };
  
  const days = { 'sundays': 0, 'mondays': 1, 'tuesdays': 2, 'wednesdays': 3, 'thursdays': 4, 'fridays': 5, 'saturdays': 6 };
  const targetDay = days[dayName.toLowerCase()];
  if (targetDay === undefined) return { targetDate: null, airedToday: false };

  const [hours, minutes] = timeStr.split(':').map(Number);
  
  const now = new Date();
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  
  let targetJst = new Date(jstNow);
  targetJst.setUTCHours(hours, minutes, 0, 0);
  
  let daysUntil = (targetDay - jstNow.getUTCDay() + 7) % 7;
  let airedToday = false;
  
  if (daysUntil === 0 && targetJst.getTime() <= jstNow.getTime()) {
    daysUntil = 7;
    airedToday = true;
  }
  
  targetJst.setUTCDate(targetJst.getUTCDate() + daysUntil);
  
  const trueUtcTarget = new Date(targetJst.getTime() - (9 * 60 * 60 * 1000));
  return { targetDate: trueUtcTarget, airedToday };
}

function updateCountdowns() {
  const timeElements = document.querySelectorAll('.anime-time[data-target]');
  const now = new Date().getTime();
  
  timeElements.forEach(el => {
    const target = parseInt(el.getAttribute('data-target'));
    const distance = target - now;
    
    if (distance < 0) {
      el.innerText = "Airing Now";
      return;
    }
    
    const d = Math.floor(distance / (1000 * 60 * 60 * 24));
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((distance % (1000 * 60)) / 1000);
    
    const dStr = d > 0 ? `${d}d ` : '';
    el.innerText = `Airs in: ${dStr}${h}h ${m}m ${s}s`;
  });
}

function formatDayLabel(index) {
  const today = new Date();
  const todayIndex = today.getDay();
  
  let diff = index - todayIndex;
  if (diff < 0) {
    diff += 7; 
  }
  
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  const formattedDate = `${targetDate.getDate().toString().padStart(2, '0')}/${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const dayName = daysOfWeek[index];
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  
  return `${capitalizedDay} ${formattedDate}`;
}

async function fetchSchedule() {
  const day = daysOfWeek[currentDayIndex];
  dayLabel.innerText = formatDayLabel(currentDayIndex);
  scheduleContainer.innerHTML = '<div class="loading-text">Decoupling Data Stream...</div>';

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  try {
    const res = await fetch(`${window.appConfig.animeApiEndpoint}?filter=${day}`);
    const data = await res.json();
    
    if (data.data && data.data.length > 0) {
      scheduleContainer.innerHTML = '';
      
      const todayIndex = new Date().getDay();
      let addedCount = 0;

      data.data.forEach(anime => {
        let targetDate = null;
        let airedToday = false;
        
        if (anime.broadcast && anime.broadcast.day && anime.broadcast.time) {
          const nextAiring = getNextAiringDate(anime.broadcast.day, anime.broadcast.time);
          targetDate = nextAiring.targetDate;
          airedToday = nextAiring.airedToday;
        }

        // Skip if we are viewing today and it already aired (or if the next airing was pushed to next week due to timezone offsets)
        if (currentDayIndex === todayIndex) {
          const isNextWeek = targetDate && (targetDate.getTime() - new Date().getTime() > 2 * 24 * 60 * 60 * 1000);
          if (airedToday || isNextWeek) {
            return;
          }
        }

        addedCount++;
        const title = anime.title_english || anime.title;
        const imgUrl = anime.images.webp.image_url;
        const broadcastStr = anime.broadcast.string || "Broadcast time unknown";
        const episodes = anime.episodes ? `Ep ${anime.episodes}` : 'Ongoing';
        
        const item = document.createElement('div');
        item.className = 'anime-item';
        
        const timeHtml = targetDate 
          ? `<div class="anime-time" data-target="${targetDate.getTime()}">Calculating...</div>`
          : `<div class="anime-time">${broadcastStr}</div>`;

        item.innerHTML = `
          <img src="${imgUrl}" class="anime-thumb" alt="${title}" loading="lazy">
          <div class="anime-info">
            <div class="anime-title">${title}</div>
            <div class="anime-meta">${episodes}</div>
            ${timeHtml}
          </div>
        `;
        scheduleContainer.appendChild(item);
      });

      if (addedCount === 0) {
        scheduleContainer.innerHTML = '<div class="loading-text">No more anime airing today.</div>';
      } else {
        updateCountdowns();
        countdownInterval = setInterval(updateCountdowns, 1000);
      }
    } else {
      scheduleContainer.innerHTML = '<div class="loading-text">No data found for this day.</div>';
    }
  } catch (err) {
    console.error(err);
    scheduleContainer.innerHTML = '<div class="loading-text">Error connecting to Jikan API.</div>';
  }
}

// ── Spotify Now Playing Widget Logic ──
const nowPlayingWidget = document.getElementById('now-playing-widget');
const npTitle = document.getElementById('np-title');
let currentTrackUri = null;

window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const element = document.getElementById('spotify-iframe');
  const options = {
    width: '100%',
    height: '352',
    uri: window.appConfig.spotifyUri || 'spotify:playlist:16SjqfOmAiWIFoiC3elUwT'
  };
  const callback = (EmbedController) => {
    EmbedController.addListener('playback_update', e => {
      const { isPaused, isBuffering, playingURI } = e.data;
      
      if (!isPaused && !isBuffering) {
        nowPlayingWidget.classList.add('active');
        
        // Only fetch title if the track changed
        if (playingURI && playingURI !== currentTrackUri) {
          currentTrackUri = playingURI;
          npTitle.innerText = "Loading track data...";
          
          fetch(`https://open.spotify.com/oembed?url=${playingURI}`)
            .then(res => res.json())
            .then(data => {
              if (data && data.title) {
                npTitle.innerText = data.title;
              } else {
                npTitle.innerText = "Spotify Stream";
              }
            })
            .catch(err => {
              console.error("Error fetching track data", err);
              npTitle.innerText = "Spotify Stream";
            });
        }
      } else {
        nowPlayingWidget.classList.remove('active');
      }
    });
  };
  IFrameAPI.createController(element, options, callback);
};

// ── Quick Links Logic ──
const quicklinksOverlay = document.getElementById('quicklinks-overlay');
const quicklinksClose = document.getElementById('quicklinks-close');
const editQuicklinksBtn = document.getElementById('edit-quicklinks-btn');
const addQuicklinkBtn = document.getElementById('add-quicklink-btn');
const addLinkForm = document.getElementById('add-link-form');
const qlSubmitBtn = document.getElementById('ql-submit-btn');
const qlNameInput = document.getElementById('ql-name');
const qlUrlInput = document.getElementById('ql-url');
const quicklinksContainer = document.getElementById('quicklinks-container');

let qlEditMode = false;

let savedQuicklinks = JSON.parse(localStorage.getItem('saved_quicklinks')) || [];

function renderQuickLinks() {
  quicklinksContainer.innerHTML = '';
  savedQuicklinks.forEach((link, index) => {
    const item = document.createElement('div');
    item.className = 'quicklink-item';
    
    // Simple way to get a domain from a URL to fetch favicon
    let domain = '';
    try {
      domain = new URL(link.url).hostname;
    } catch(e) {
      domain = link.url;
    }
    
    const iconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    
    item.innerHTML = `
      <a href="${link.url}" class="quicklink-icon" target="_blank" rel="noopener noreferrer">
        <img src="${iconUrl}" alt="${link.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">
      </a>
      <div class="quicklink-label">${link.name}</div>
      <div class="quicklink-delete" data-index="${index}">&times;</div>
    `;
    
    quicklinksContainer.appendChild(item);
  });

  // Attach delete listeners
  document.querySelectorAll('.quicklink-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const idx = e.target.getAttribute('data-index');
      savedQuicklinks.splice(idx, 1);
      localStorage.setItem('saved_quicklinks', JSON.stringify(savedQuicklinks));
      renderQuickLinks();
    });
  });
}

editQuicklinksBtn.addEventListener('click', () => {
  qlEditMode = !qlEditMode;
  if (qlEditMode) {
    quicklinksContainer.classList.add('edit-mode');
    editQuicklinksBtn.classList.add('active');
    addQuicklinkBtn.style.display = 'flex';
  } else {
    quicklinksContainer.classList.remove('edit-mode');
    editQuicklinksBtn.classList.remove('active');
    addQuicklinkBtn.style.display = 'none';
    addLinkForm.classList.add('hidden');
  }
});

quicklinksClose.addEventListener('click', () => {
  quicklinksOverlay.classList.remove('active');
  // Reset form and edit state when closed
  qlEditMode = false;
  quicklinksContainer.classList.remove('edit-mode');
  editQuicklinksBtn.classList.remove('active');
  addQuicklinkBtn.style.display = 'none';
  addLinkForm.classList.add('hidden'); 
});

quicklinksOverlay.addEventListener('click', (e) => {
  if (e.target === quicklinksOverlay) {
    quicklinksOverlay.classList.remove('active');
    qlEditMode = false;
    quicklinksContainer.classList.remove('edit-mode');
    editQuicklinksBtn.classList.remove('active');
    addQuicklinkBtn.style.display = 'none';
    addLinkForm.classList.add('hidden');
  }
});

addQuicklinkBtn.addEventListener('click', () => {
  addLinkForm.classList.toggle('hidden');
  if(!addLinkForm.classList.contains('hidden')) {
    qlNameInput.focus();
  }
});

qlSubmitBtn.addEventListener('click', () => {
  const name = qlNameInput.value.trim();
  let url = qlUrlInput.value.trim();
  
  if (name && url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    savedQuicklinks.push({ name, url });
    localStorage.setItem('saved_quicklinks', JSON.stringify(savedQuicklinks));
    qlNameInput.value = '';
    qlUrlInput.value = '';
    addLinkForm.classList.add('hidden');
    renderQuickLinks();
  }
});

// ── QR Generator Logic ──
const qrOverlay = document.getElementById('qr-overlay');
const qrClose = document.getElementById('qr-close');
const qrInput = document.getElementById('qr-input');
const qrGenerateBtn = document.getElementById('qr-generate-btn');
const qrImage = document.getElementById('qr-image');
const qrPlaceholder = document.getElementById('qr-placeholder');
const qrDownloadBtn = document.getElementById('qr-download-btn');

qrClose.addEventListener('click', () => {
  qrOverlay.classList.remove('active');
});

qrOverlay.addEventListener('click', (e) => {
  if (e.target === qrOverlay) qrOverlay.classList.remove('active');
});

qrGenerateBtn.addEventListener('click', () => {
  const text = qrInput.value.trim();
  if (text) {
    qrPlaceholder.style.display = 'none';
    qrImage.style.display = 'block';
    qrDownloadBtn.style.display = 'block';
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}&color=000000&bgcolor=ffffff`;
  } else {
    qrPlaceholder.style.display = 'block';
    qrImage.style.display = 'none';
    qrDownloadBtn.style.display = 'none';
  }
});

qrDownloadBtn.addEventListener('click', async () => {
  try {
    const res = await fetch(qrImage.src);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'qrcode.png';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (err) {
    console.error('Error downloading QR code:', err);
    window.open(qrImage.src, '_blank');
  }
});

qrInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    qrGenerateBtn.click();
  }
});

// ── Download Manager Logic ──
const dlOverlay = document.getElementById('downloader-overlay');
const dlClose = document.getElementById('downloader-close');
const dlUrl = document.getElementById('dl-url');
const dlDir = document.getElementById('dl-dir');
const dlStartBtn = document.getElementById('dl-start-btn');
const dlFetchBtn = document.getElementById('dl-fetch-btn');
const dlSelectFilesContainer = document.getElementById('dl-select-files-container');
const dlList = document.getElementById('downloads-list');

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
          <span style="font-size: 0.8rem; word-break: break-all;">${f.path}</span>
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
  const dir = dlDir.value.trim();
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

// Polling for downloads
setInterval(async () => {
  if (!dlOverlay.classList.contains('active')) return;
  
  try {
    const res = await fetch('/api/downloads');
    const data = await res.json();
    
    if (!data || data.length === 0) {
      dlList.innerHTML = '<div class="loading-text">No active downloads</div>';
      return;
    }
    
    // Sort so newest are likely first or based on status
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
    // Ignore fetch errors if server is down
  }
}, 1000);
