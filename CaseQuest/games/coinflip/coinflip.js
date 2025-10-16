const coin = document.getElementById("coin");
const goldBtn = document.getElementById("goldBtn");
const purpleBtn = document.getElementById("purpleBtn");
const flipBtn = document.getElementById("flipBtn");
const result = document.getElementById("result");

let chosenSide = null;
let flipping = false;

goldBtn.addEventListener("click", () => chooseSide("gold"));
purpleBtn.addEventListener("click", () => chooseSide("purple"));

function chooseSide(side) {
  chosenSide = side;
  goldBtn.classList.toggle("selected", side === "gold");
  purpleBtn.classList.toggle("selected", side === "purple");
  result.textContent = `You chose ${side.toUpperCase()}!`;
}

flipBtn.addEventListener("click", () => {
  if (!chosenSide) {
    result.textContent = "Please choose a side first!";
    return;
  }
  if (flipping) return;
  flipping = true;

  result.textContent = "Flipping...";

  // Decide outcome
  const randomResult = Math.random() < 0.5 ? "gold" : "purple";

  // Ensure the spin visually matches the outcome
  const rotations = Math.floor(Math.random() * 4) + 4;
  const finalRotation =
    randomResult === "gold"
      ? rotations * 180
      : rotations * 180 + 180;

  coin.style.transition = "transform 2s cubic-bezier(.36,.07,.19,.97)";
  coin.style.transform = `rotateY(${finalRotation}deg)`;

  setTimeout(() => {
    flipping = false;
    coin.style.transition = "none";

    if (randomResult === chosenSide) {
      result.innerHTML = `🎉 You won! It landed on <span style="color:${
        randomResult === "gold" ? "#ffd166" : "#a855f7"
      };">${randomResult.toUpperCase()}</span>!`;
    } else {
      result.innerHTML = `💀 You lost! It landed on <span style="color:${
        randomResult === "gold" ? "#ffd166" : "#a855f7"
      };">${randomResult.toUpperCase()}</span>.`;
    }
  }, 2000);
});
