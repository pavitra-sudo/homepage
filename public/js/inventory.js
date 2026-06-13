export function initInventory() {
  const inventoryBtn = document.getElementById('inventory-btn');
  const inventoryOverlay = document.getElementById('inventory-overlay');
  const inventoryClose = document.getElementById('inventory-close');
  const inventoryGrid = document.getElementById('inventory-grid');
  const inventoryEditBtn = document.getElementById('inventory-edit-btn');

  let inventoryEditMode = false;

  const defaultTools = [
    { id: 'anime-schedule', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>', title: 'Anime Schedule' },
    { id: 'spotify-stream', icon: '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>', title: 'Spotify Stream' },
    { id: 'qr-generator', icon: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>', title: 'QR Generator' },
    { id: 'download-manager', icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>', title: 'Downloader' },
    { id: 'quick-links', icon: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>', title: 'Quick Links' }
  ];

  let inventoryPrefs = JSON.parse(localStorage.getItem('inventory_prefs')) || defaultTools.map(t => t.id);

  function renderInventory() {
    inventoryGrid.innerHTML = '';
    const visibleTools = defaultTools.filter(t => inventoryPrefs.includes(t.id));
    
    if (inventoryEditMode) {
      inventoryGrid.classList.add('edit-mode');
      defaultTools.forEach(tool => {
        const isVisible = inventoryPrefs.includes(tool.id);
        const card = document.createElement('div');
        card.className = `inventory-item ${isVisible ? '' : 'disabled'}`;
        card.innerHTML = `
          <div class="inventory-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${tool.icon}
            </svg>
          </div>
          <div class="inventory-label">${tool.title}</div>
        `;
        
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isVisible) {
            inventoryPrefs = inventoryPrefs.filter(id => id !== tool.id);
          } else {
            inventoryPrefs.push(tool.id);
          }
          localStorage.setItem('inventory_prefs', JSON.stringify(inventoryPrefs));
          renderInventory();
        });
        
        inventoryGrid.appendChild(card);
      });
    } else {
      inventoryGrid.classList.remove('edit-mode');
      visibleTools.forEach(tool => {
        const card = document.createElement('div');
        card.className = 'inventory-item';
        card.innerHTML = `
          <div class="inventory-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${tool.icon}
            </svg>
          </div>
          <div class="inventory-label">${tool.title}</div>
        `;
        
        card.addEventListener('click', () => {
          inventoryOverlay.classList.remove('active');
          if (tool.id === 'anime-schedule') {
            document.getElementById('schedule-overlay').classList.add('active');
            if (window.fetchSchedule) window.fetchSchedule();
          } else if (tool.id === 'spotify-stream') {
            document.getElementById('spotify-overlay').classList.add('active');
          } else if (tool.id === 'qr-generator') {
            document.getElementById('qr-overlay').classList.add('active');
            document.getElementById('qr-input').focus();
          } else if (tool.id === 'download-manager') {
            document.getElementById('downloader-overlay').classList.add('active');
          } else if (tool.id === 'quick-links') {
            document.getElementById('quicklinks-overlay').classList.add('active');
          }
        });
        
        inventoryGrid.appendChild(card);
      });
    }
  }

  inventoryEditBtn.addEventListener('click', () => {
    inventoryEditMode = !inventoryEditMode;
    if (inventoryEditMode) {
      inventoryEditBtn.classList.add('active');
    } else {
      inventoryEditBtn.classList.remove('active');
    }
    renderInventory();
  });

  inventoryBtn.addEventListener('click', () => {
    inventoryEditMode = false;
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

  renderInventory();
}
