import { savedQuicklinks, setSavedQuicklinks } from './config.js';

export function initQuickLinks() {
  const quicklinksOverlay = document.getElementById('quicklinks-overlay');
  const quicklinksClose = document.getElementById('quicklinks-close');
  const editQuicklinksBtn = document.getElementById('edit-quicklinks-btn');
  const addQuicklinkBtn = document.getElementById('add-quicklink-btn');
  const addLinkForm = document.getElementById('add-link-form');
  const qlName = document.getElementById('ql-name');
  const qlUrl = document.getElementById('ql-url');
  const qlSubmitBtn = document.getElementById('ql-submit-btn');
  const qlContainer = document.getElementById('quicklinks-container');

  let qlEditMode = false;

  quicklinksClose.addEventListener('click', () => {
    quicklinksOverlay.classList.remove('active');
    if (qlEditMode) {
      qlEditMode = false;
      addLinkForm.classList.add('hidden');
      addQuicklinkBtn.style.display = 'none';
      renderQuickLinks();
    }
  });

  quicklinksOverlay.addEventListener('click', (e) => {
    if (e.target === quicklinksOverlay) {
      quicklinksOverlay.classList.remove('active');
      if (qlEditMode) {
        qlEditMode = false;
        addLinkForm.classList.add('hidden');
        addQuicklinkBtn.style.display = 'none';
        renderQuickLinks();
      }
    }
  });

  editQuicklinksBtn.addEventListener('click', () => {
    qlEditMode = !qlEditMode;
    if (qlEditMode) {
      addQuicklinkBtn.style.display = 'block';
      qlContainer.classList.add('edit-mode');
    } else {
      addQuicklinkBtn.style.display = 'none';
      addLinkForm.classList.add('hidden');
      qlContainer.classList.remove('edit-mode');
    }
    renderQuickLinks();
  });

  addQuicklinkBtn.addEventListener('click', () => {
    addLinkForm.classList.toggle('hidden');
  });

  qlSubmitBtn.addEventListener('click', () => {
    const name = qlName.value.trim();
    let url = qlUrl.value.trim();
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    savedQuicklinks.push({ name, url });
    setSavedQuicklinks(savedQuicklinks);
    
    qlName.value = '';
    qlUrl.value = '';
    addLinkForm.classList.add('hidden');
    renderQuickLinks();
  });

  window.deleteQuicklink = (index) => {
    savedQuicklinks.splice(index, 1);
    setSavedQuicklinks(savedQuicklinks);
    renderQuickLinks();
  };

  function renderQuickLinks() {
    qlContainer.innerHTML = '';
    savedQuicklinks.forEach((link, index) => {
      const el = document.createElement('div');
      el.className = 'quicklink-item';
      
      let domain = "";
      try {
        domain = new URL(link.url).hostname;
      } catch(e) {
        domain = link.url;
      }
      const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

      el.innerHTML = `
        ${qlEditMode ? `<button class="quicklink-delete" onclick="deleteQuicklink(${index})">&times;</button>` : ''}
        <div class="quicklink-icon">
          <img src="${iconUrl}" alt="" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PGxpbmUgeDE9IjEyIiB5MT0iMTYiIHgyPSIxMiIgeTI9IjEyIj48L2xpbmU+PGxpbmUgeDE9IjEyIiB5MT0iOCIgeDI9IjEyLjAxIiB5Mj0iOCI+PC9saW5lPjwvc3ZnPg=='">
        </div>
        <div class="quicklink-label" title="${link.name}">${link.name}</div>
      `;
      
      if (!qlEditMode) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          window.location.href = link.url;
        });
      }
      
      qlContainer.appendChild(el);
    });
  }

  renderQuickLinks();
  return renderQuickLinks;
}
