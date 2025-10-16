const board = document.getElementById("board");
const playBtn = document.getElementById("playBtn");
const results = document.getElementById("results");
const riskSelect = document.getElementById("risk");

const totalNumbers = 40;
let selectedNumbers = [];

// Generate dynamic multiplier table based on risk and picks
function getMultiplierTable(risk, picks) {
  const table = [];
  for (let hits = 0; hits <= picks; hits++) {
    let multiplier;
    switch (risk) {
      case "low":
        multiplier = hits === 0 ? 0 : Math.pow(hits, 1.3);
        break;
      case "medium":
        multiplier = hits === 0 ? 0 : Math.pow(hits, 1.6);
        break;
      case "high":
        multiplier = hits === 0 ? 0 : Math.pow(hits, 2) + Math.floor(Math.random() * hits);
        break;
      default:
        multiplier = hits === 0 ? 0 : hits;
    }
    table.push(multiplier.toFixed(1));
  }
  return table;
}

// Build the board
for (let i = 1; i <= totalNumbers; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";

  const numberLabel = document.createElement("div");
  numberLabel.className = "number-label";
  numberLabel.textContent = i;
  cell.appendChild(numberLabel);

  const multiplierLabel = document.createElement("div");
  multiplierLabel.className = "multiplier-label";
  multiplierLabel.textContent = "";
  cell.appendChild(multiplierLabel);

  cell.addEventListener("click", () => {
    if (selectedNumbers.includes(i)) {
      selectedNumbers = selectedNumbers.filter(x => x !== i);
      cell.classList.remove("selected");
      multiplierLabel.textContent = "";
    } else if (selectedNumbers.length < 10) {
      selectedNumbers.push(i);
      cell.classList.add("selected");
      const table = getMultiplierTable(riskSelect.value, selectedNumbers.length);
      multiplierLabel.textContent = `x${table[selectedNumbers.length]}`;
    }
  });

  board.appendChild(cell);
}

// Play function
playBtn.onclick = async () => {
  if (selectedNumbers.length === 0) return alert("Pick at least 1 number!");

  const risk = riskSelect.value;
  const drawCount = (risk === "high") ? 9 : 10;

  const drawn = [];
  while (drawn.length < drawCount) {
    const n = Math.floor(Math.random() * totalNumbers) + 1;
    if (!drawn.includes(n)) drawn.push(n);
  }

  results.innerHTML = "";
  document.querySelectorAll(".cell").forEach(c => c.classList.remove("hit"));

  // Animate hits
  for (let i = 0; i < drawn.length; i++) {
    await new Promise(res => setTimeout(res, 150));
    const cell = Array.from(document.querySelectorAll(".cell"))
      .find(c => parseInt(c.querySelector(".number-label").textContent) === drawn[i]);
    if (cell) cell.classList.add("hit");
  }

  const hits = selectedNumbers.filter(n => drawn.includes(n));
  const table = getMultiplierTable(risk, selectedNumbers.length);
  const multiplier = hits.length === selectedNumbers.length ? table[hits.length] : 0;

  // Pop-up overlay (small)
  const popup = document.createElement("div");
  popup.className = "win-popup";
  popup.textContent = hits.length === selectedNumbers.length
      ? `${multiplier}x`
      : "0x";
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1500);

  results.innerHTML = `
    <p>You hit ${hits.length} / ${selectedNumbers.length} numbers</p>
    <p>Drawn numbers: ${drawn.join(", ")}</p>
  `;

  // Update multiplier labels
  document.querySelectorAll(".cell.selected").forEach((c, idx) => {
    const table = getMultiplierTable(risk, selectedNumbers.length);
    c.querySelector(".multiplier-label").textContent = `x${table[idx+1]}`;
  });
};
