export function initClock() {
  function updateTime() {
    const now = new Date();
    
    // Explicitly format time for India (IST)
    const timeOptions = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' };
    document.getElementById("time").innerText = now.toLocaleTimeString('en-IN', timeOptions);
  
    // Explicitly format date for India (IST)
    const dateOptions = { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("date").innerText = now.toLocaleDateString('en-IN', dateOptions);
  }
  
  setInterval(updateTime, 1000);
  updateTime();
}
