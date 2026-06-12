import { loadConfigs } from './config.js';
import { initClock } from './clock.js';
import { initParticles } from './particles.js';
import { loadQuote } from './quotes.js';
import { initQuickLinks } from './quicklinks.js';
import { initSchedule } from './schedule.js';
import { initSpotify } from './spotify.js';
import { initQRGenerator } from './qrgenerator.js';
import { initDownloader } from './downloader.js';
import { initInventory } from './inventory.js';

async function init() {
  const renderQuickLinks = initQuickLinks();
  await loadConfigs(renderQuickLinks);
  
  initClock();
  initParticles();
  loadQuote();
  initSchedule();
  initSpotify();
  initQRGenerator();
  initDownloader();
  initInventory();

  setInterval(loadQuote, 10000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
