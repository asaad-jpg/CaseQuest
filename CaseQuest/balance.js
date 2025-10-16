let balance = 200000;

// Define global functions immediately
window.getBalance = () => balance;
window.addBalance = (amount) => { balance += amount; updateBalanceUI(); };
window.subtractBalance = (amount) => { balance -= amount; if(balance<0) balance=0; updateBalanceUI(); };

// Update the UI after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    const balanceBar = document.getElementById('balanceBar') || (() => {
        const el = document.createElement('div');
        el.id = 'balanceBar';
        document.body.prepend(el);
        return el;
    })();
    updateBalanceUI();
});

function updateBalanceUI() {
    const bar = document.getElementById('balanceBar');
    if (bar) bar.textContent = `Balance: $${balance.toLocaleString()}`;
}
