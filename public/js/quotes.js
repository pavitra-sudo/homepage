const scrambleLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;':,./<>?あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";

export function scrambleText(element, newText) {
  let iteration = 0;
  clearInterval(element.dataset.interval);

  element.dataset.interval = setInterval(() => {
    element.innerText = newText
      .split("")
      .map((letter, index) => {
        if (index < iteration) {
          return newText[index];
        }
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

    iteration += 1 / 2;
  }, 30);
}

export async function loadQuote() {
  try {
    const res = await fetch("config/quotes.json");
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
