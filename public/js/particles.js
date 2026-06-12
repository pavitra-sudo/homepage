export function initParticles() {
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

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, `rgba(255, 100, 100, ${p.life})`);
      gradient.addColorStop(0.4, `rgba(255, 0, 60, ${p.life * 0.8})`);
      gradient.addColorStop(1, `rgba(255, 0, 60, 0)`);

      ctx.fillStyle = gradient;
      ctx.fill();

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
}
