export function initClock() {
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
}
