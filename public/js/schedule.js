import { appConfig } from './config.js';

export function initSchedule() {
  const scheduleOverlay = document.getElementById('schedule-overlay');
  const scheduleClose = document.getElementById('schedule-close');
  const prevBtn = document.getElementById('prev-day');
  const nextBtn = document.getElementById('next-day');
  const dayLabel = document.getElementById('current-day-label');
  const scheduleContainer = document.getElementById('schedule-container');

  scheduleClose.addEventListener('click', () => {
    scheduleOverlay.classList.remove('active');
  });

  scheduleOverlay.addEventListener('click', (e) => {
    if (e.target === scheduleOverlay) scheduleOverlay.classList.remove('active');
  });

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let currentDayIndex = new Date().getDay();

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
    if (diff < 0) diff += 7; 
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

    if (countdownInterval) clearInterval(countdownInterval);

    try {
      const res = await fetch(`${appConfig.animeApiEndpoint}?filter=${day}`);
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

          if (currentDayIndex === todayIndex) {
            const isNextWeek = targetDate && (targetDate.getTime() - new Date().getTime() > 2 * 24 * 60 * 60 * 1000);
            if (airedToday || isNextWeek) return;
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

  window.fetchSchedule = () => {
    currentDayIndex = new Date().getDay();
    fetchSchedule();
  };
}
