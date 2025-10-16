// Reference global balance
const balanceDisplay = document.getElementById('balanceDisplay');
const betInput = document.getElementById('betAmount');
const spinBtn = document.getElementById('spinBtn');
const resultDiv = document.getElementById('result');
const wheel = document.getElementById('wheel');
const arrow = document.querySelector('.arrow');

function updateUI() {
    balanceDisplay.textContent = getBalance().toLocaleString();
}

updateUI();

// Spin percentages (simulate chance)
const upgrades = [
    { label: "1.2x", chance: 50, multiplier: 1.2 },
    { label: "1.5x", chance: 30, multiplier: 1.5 },
    { label: "2x",   chance: 15, multiplier: 2 },
    { label: "5x",   chance: 4,  multiplier: 5 },
    { label: "10x",  chance: 1,  multiplier: 10 }
];

spinBtn.addEventListener('click', () => {
    const bet = parseInt(betInput.value);
    if (!bet || bet <= 0) return alert("Enter a valid bet!");
    if (bet > getBalance()) return alert("Not enough balance!");

    subtractBalance(bet);
    updateUI();

    // pick outcome based on percentages
    const rand = Math.random() * 100;
    let sum = 0;
    let outcome = upgrades[0];
    for (let i=0; i<upgrades.length; i++) {
        sum += upgrades[i].chance;
        if (rand <= sum) { outcome = upgrades[i]; break; }
    }

    // rotate wheel visually
    const deg = 360 * 5 + Math.random() * 72; // random spin
    wheel.style.transition = 'transform 3s cubic-bezier(.25,.8,.25,1)';
    wheel.style.transform = `rotate(${deg}deg)`;

    spinBtn.disabled = true;
    setTimeout(() => {
        // Result
        if (outcome.multiplier > 1) {
            const winAmount = Math.floor(bet * outcome.multiplier);
            addBalance(winAmount);
            resultDiv.textContent = `🎉 You won $${winAmount.toLocaleString()} (${outcome.label})!`;
        } else {
            resultDiv.textContent = `😢 You lost $${bet.toLocaleString()}`;
        }
        updateUI();
        wheel.style.transition = '';
        spinBtn.disabled = false;
    }, 3000);
});
