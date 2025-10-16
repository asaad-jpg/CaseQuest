const board = document.getElementById("board");
const startBtn = document.getElementById("startBtn");
const mineSelect = document.getElementById("mineCount");
const results = document.getElementById("results");
const multiplierDisplay = document.getElementById("multiplierDisplay");

let minePositions = [];
let revealedTiles = 0;
let gameActive = false;
let multiplier = 1.0;
const totalTiles = 25;

function generateBoard() {
  board.innerHTML = "";
  for (let i = 0; i < totalTiles; i++) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.addEventListener("click", () => revealTile(tile, i));
    board.appendChild(tile);
  }
}

function startGame() {
  minePositions = [];
  revealedTiles = 0;
  multiplier = 1.0;
  gameActive = true;
  results.textContent = "";
  multiplierDisplay.textContent = `Multiplier: x${multiplier.toFixed(2)}`;

  generateBoard();

  const mineCount = parseInt(mineSelect.value);
  while (minePositions.length < mineCount) {
    const pos = Math.floor(Math.random() * totalTiles);
    if (!minePositions.includes(pos)) minePositions.push(pos);
  }
}

function revealTile(tile, index) {
  if (!gameActive || tile.classList.contains("revealed")) return;

  tile.classList.add("revealed");

  if (minePositions.includes(index)) {
    tile.classList.add("mine");
    gameActive = false;
    results.innerHTML = `<span style="color:#ff5c5c;">💥 You hit a mine! Game Over.</span>`;
    revealAllMines();
  } else {
    tile.classList.add("safe");
    revealedTiles++;

    multiplier += 0.15 + (parseInt(mineSelect.value) / 100);
    multiplierDisplay.textContent = `Multiplier: x${multiplier.toFixed(2)}`;

    sparkleEffect(tile);

    if (revealedTiles === totalTiles - minePositions.length) {
      gameActive = false;
      results.innerHTML = `<span style="color:#5cff8d;">🎉 You cleared the board! x${multiplier.toFixed(2)}</span>`;
    }
  }
}

function sparkleEffect(tile) {
  for (let i = 0; i < 5; i++) {
    const spark = document.createElement("div");
    spark.className = "sparkle";
    spark.style.left = `${Math.random() * 80}px`;
    spark.style.top = `${Math.random() * 80}px`;
    tile.appendChild(spark);
    setTimeout(() => spark.remove(), 500);
  }
}

function revealAllMines() {
  document.querySelectorAll(".tile").forEach((tile, i) => {
    if (minePositions.includes(i)) tile.classList.add("mine");
  });
}

startBtn.addEventListener("click", startGame);

// Initialize on load
generateBoard();
