document.addEventListener('DOMContentLoaded', () => {
  const dealerRow = document.getElementById('dealerRow');
  const playerRow = document.getElementById('playerRow');
  const dealerCountEl = document.getElementById('dealerCount');
  const playerCountEl = document.getElementById('playerCount');
  const resultEl = document.getElementById('result');
  const balanceBar = document.getElementById('balanceBar');

  const dealBtn = document.getElementById('dealBtn');
  const hitBtn = document.getElementById('hitBtn');
  const standBtn = document.getElementById('standBtn');
  const doubleBtn = document.getElementById('doubleBtn');
  const insuranceBtn = document.getElementById('insuranceBtn');
  const splitBtn = document.getElementById('splitBtn');

  const chips = document.getElementById('chips');
  const betInput = document.getElementById('betInput');
  const halfBtn = document.getElementById('halfBtn');
  const doubleChipBtn = document.getElementById('doubleChipBtn');

  let deck = [];
  let playerHand = [];
  let dealerHand = [];
  let currentBet = 0;
  let insuranceBet = 0;
  let roundActive = false;

  const suits = ['♠','♥','♦','♣'];
  const ranks = [
    {name:'A',v:11},{name:'2',v:2},{name:'3',v:3},{name:'4',v:4},
    {name:'5',v:5},{name:'6',v:6},{name:'7',v:7},{name:'8',v:8},
    {name:'9',v:9},{name:'10',v:10},{name:'J',v:10},{name:'Q',v:10},{name:'K',v:10}
  ];

  function buildDeck(){
    const d=[];
    suits.forEach(s => ranks.forEach(r => d.push({suit:s,name:r.name,value:r.v})));
    return shuffle(d);
  }

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  function draw(){ if(deck.length===0) deck=buildDeck(); return deck.pop(); }

  function animateCard(container, card, hidden=false){
    const el=document.createElement('div');
    el.className='card'+(hidden?' hidden':(card.suit==='♥'||card.suit==='♦'?' red':'')); 
    el.textContent=hidden?'':`${card.name}${card.suit}`;
    container.appendChild(el);
    requestAnimationFrame(()=>el.style.opacity='1');
    return el;
  }

  function renderHands(hideDealerHole=true){
    dealerRow.innerHTML='';
    playerRow.innerHTML='';
    dealerHand.forEach((c,i)=>animateCard(dealerRow,c,i===0&&roundActive&&hideDealerHole));
    playerHand.forEach(c=>animateCard(playerRow,c,false));
    playerCountEl.textContent=`Player: ${handValue(playerHand)}`;
    dealerCountEl.textContent=(roundActive&&hideDealerHole)?'Dealer: ?':`Dealer: ${handValue(dealerHand)}`;
  }

  function handValue(hand){
    let total=0, aces=0;
    hand.forEach(c=>{ total+=c.value; if(c.name==='A') aces++; });
    while(total>21 && aces>0){ total-=10; aces--; }
    return total;
  }

  function isSoft17(hand){
    let total=0, aces=0;
    hand.forEach(c=>{ total+=c.value; if(c.name==='A') aces++; });
    return total===17 && aces>0;
  }

  function refreshBalanceUI(){
    if(window.getBalance && balanceBar) balanceBar.textContent=`Balance: $${window.getBalance().toLocaleString()}`;
  }

  function resetUI(){
    playerRow.innerHTML='';
    dealerRow.innerHTML='';
    playerCountEl.textContent='Player: 0';
    dealerCountEl.textContent='Dealer: ?';
    resultEl.textContent='';
    hitBtn.disabled=true;
    standBtn.disabled=true;
    doubleBtn.disabled=true;
    insuranceBtn.disabled=true;
    splitBtn.disabled=true;
    betInput.value='';
  }

  function highlightMessage(msg){
    resultEl.textContent=msg;
    resultEl.style.opacity='0';
    resultEl.offsetHeight;
    resultEl.style.transition='opacity 0.4s';
    resultEl.style.opacity='1';
  }

  function startRound(){
    if(roundActive) return;
    if(!window.getBalance || !window.addBalance || !window.subtractBalance){ console.error('Balance system not found'); return; }

    const bet=Math.floor(Number(betInput.value)||0);
    if(bet<1){ highlightMessage('Enter a valid bet'); return; }
    if(bet>window.getBalance()){ highlightMessage('Insufficient balance'); return; }

    currentBet=bet;
    insuranceBet=0;
    roundActive=true;
    window.subtractBalance(currentBet);

    deck=buildDeck();
    playerHand=[draw(),draw()];
    dealerHand=[draw(),draw()];

    renderHands(true);
    refreshBalanceUI();
    highlightMessage('Round started');

    hitBtn.disabled=false;
    standBtn.disabled=false;
    doubleBtn.disabled=(playerHand.length===2 && window.getBalance()>=currentBet)?false:true;
    insuranceBtn.disabled=(dealerHand[0].name==='A' && window.getBalance()>=Math.floor(currentBet/2))?false:true;
    splitBtn.disabled=true;

    checkInitialBlackjack();
  }

  function playerHit(){
    if(!roundActive) return;
    playerHand.push(draw());
    renderHands(true);
    doubleBtn.disabled=true;
    if(handValue(playerHand)===21) highlightMessage('21!');
    if(handValue(playerHand)>21) setTimeout(finishRound,300);
  }

  function playerStand(){
    if(!roundActive) return;
    renderHands(false);
    dealerPlay();
  }

  function playerDouble(){
    if(!roundActive) return;
    if(window.getBalance()<currentBet){ highlightMessage('Not enough to double'); return; }
    window.subtractBalance(currentBet);
    currentBet*=2;
    playerHand.push(draw());
    renderHands(true);
    setTimeout(playerStand,200);
  }

  function takeInsurance(){
    if(!roundActive) return;
    const half=Math.floor(currentBet/2);
    if(window.getBalance()<half){ highlightMessage('Cannot take insurance'); return; }
    window.subtractBalance(half);
    insuranceBet=half;
    insuranceBtn.disabled=true;
    refreshBalanceUI();
    highlightMessage('Insurance taken');
  }

  function dealerPlay(){
    let dVal = handValue(dealerHand);
    while(dVal < 17 || isSoft17(dealerHand)){
      dealerHand.push(draw());
      renderHands(false);
      dVal = handValue(dealerHand);
    }
    finishRound();
  }

  function checkInitialBlackjack(){
    const isPlayerBlackjack = playerHand.length === 2 &&
        ((playerHand[0].name === 'A' && playerHand[1].value === 10) ||
         (playerHand[1].name === 'A' && playerHand[0].value === 10));

    const isDealerBlackjack = dealerHand.length === 2 &&
        ((dealerHand[0].name === 'A' && dealerHand[1].value === 10) ||
         (dealerHand[1].name === 'A' && dealerHand[0].value === 10));

    if(isDealerBlackjack){
        renderHands(false);
        if(isPlayerBlackjack){
            window.addBalance(currentBet);
            highlightMessage('Push — both Blackjack');
        } else {
            highlightMessage('Dealer has Blackjack — you lose');
        }
        roundActive=false;
        setTimeout(resetUI,1800);
    } else if(isPlayerBlackjack){
        window.addBalance(Math.floor(currentBet*2.5));
        highlightMessage('Blackjack! You win 3:2');
        roundActive=false;
        setTimeout(resetUI,1800);
    }
  }

  function finishRound(){
    if(!roundActive) return;
    roundActive=false;

    const p = handValue(playerHand);
    const d = handValue(dealerHand);

    // Dealer rig bias: 90% to favor dealer in non-bust situations
    const dealerFavored = Math.random() < 0.9;

    if(insuranceBet>0 && dealerHand.length===2 && 
       ((dealerHand[0].name==='A' && dealerHand[1].value===10) || 
        (dealerHand[1].name==='A' && dealerHand[0].value===10))){
      window.addBalance(insuranceBet*3);
    }

    let txt = '';
    if(p>21) txt='You busted!';
    else if(d>21) { window.addBalance(currentBet*2); txt='Dealer busted — you win!'; }
    else {
      if(dealerFavored && d >= p && d <= 21) txt='Dealer wins';
      else if(p>d) { window.addBalance(currentBet*2); txt='You win!'; }
      else if(p===d) { window.addBalance(currentBet); txt='Push — bet returned'; }
      else txt='Dealer wins';
    }

    renderHands(false);
    highlightMessage(txt);

    hitBtn.disabled=true;
    standBtn.disabled=true;
    doubleBtn.disabled=true;
    insuranceBtn.disabled=true;
    splitBtn.disabled=true;

    refreshBalanceUI();
    setTimeout(resetUI,1800);
  }

  dealBtn.addEventListener('click',startRound);
  hitBtn.addEventListener('click',playerHit);
  standBtn.addEventListener('click',playerStand);
  doubleBtn.addEventListener('click',playerDouble);
  insuranceBtn.addEventListener('click',takeInsurance);
  splitBtn.addEventListener('click',()=>highlightMessage('Split coming soon'));

  chips?.addEventListener('click',(ev)=>{
    const btn=ev.target.closest('button.chip');
    if(btn){ betInput.value=Number(btn.dataset.amount); highlightMessage(`Bet $${btn.dataset.amount}`); }
  });

  halfBtn?.addEventListener('click',()=>{ betInput.value=Math.max(1,Math.floor((Number(betInput.value)||0)/2)); });
  doubleChipBtn?.addEventListener('click',()=>{ betInput.value=(Number(betInput.value)||0)*2; });

  resetUI();
  refreshBalanceUI();
  setInterval(refreshBalanceUI,500);
});
