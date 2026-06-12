export const appConfig = { 
  spotifyUri: null, 
  animeApiEndpoint: "https://api.jikan.moe/v4/schedules",
  downloadDir: "downloads" 
};

export let savedQuicklinks = JSON.parse(localStorage.getItem('saved_quicklinks')) || [];

export function setSavedQuicklinks(links) {
  savedQuicklinks = links;
  localStorage.setItem('saved_quicklinks', JSON.stringify(savedQuicklinks));
}

export async function loadConfigs(renderQuickLinksCallback) {
  try {
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

    const mediaRes = await fetch('config/inventory/spotifystream.json');
    if (mediaRes.ok) {
      const mediaConfig = await mediaRes.json();
      appConfig.spotifyUri = mediaConfig.spotify_uri;
    }

    if (!localStorage.getItem('saved_quicklinks')) {
      const qlRes = await fetch('config/inventory/quicklinks.json');
      if (qlRes.ok) {
        const defaultLinks = await qlRes.json();
        setSavedQuicklinks(defaultLinks);
        if (renderQuickLinksCallback) renderQuickLinksCallback();
      }
    }

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

    const animeRes = await fetch('config/inventory/animeschedular.json');
    if (animeRes.ok) {
      const animeConfig = await animeRes.json();
      if (animeConfig.api_endpoint) {
        appConfig.animeApiEndpoint = animeConfig.api_endpoint;
      }
    }

    const ariaRes = await fetch('config/inventory/aria2.json');
    if (ariaRes.ok) {
      const ariaConfig = await ariaRes.json();
      if (ariaConfig.download_dir) {
        appConfig.downloadDir = ariaConfig.download_dir;
      }
    }
  } catch (err) {
    console.error("Failed to load modular configs", err);
  }
}
