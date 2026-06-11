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
