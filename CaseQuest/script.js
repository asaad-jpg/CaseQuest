const items = [
  { name: "MacBook Pro M3", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381546/mba_15_m3_2024_hero_g6lzj8.png", value: 2200, rarity: "common" },
  { name: "Samsung S24 Ultra", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381567/71WcjsOVOmL_s7enwe.jpg", value: 1100, rarity: "common" },
  { name: "High-End GPU (RTX 5090)", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381591/71tV-csYdCL_o3xsot.jpg", value: 2500, rarity: "rare" },
  { name: "iPhone 15 Pro", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381363/refurb-iphone-15-pro-blacktitanium-202412_obhoxy.jpg", value: 1200, rarity: "common" },
  { name: "Beats Studio Pro", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381634/MQTR3_kcdiiy.jpg", value: 350, rarity: "common" },
  { name: "Alienware Laptop", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381616/Used-Alienware-FHD-15-6-Inch-Gaming-Laptop-Intel-Core-i7-4710HQ-16-GB-RAM-1-TB_8f608d61-8877-45b8-9567-8994f1fa76a7_1.3d1313550c119b5b8b348cdefb7a7906_tr18wi.jpg", value: 3200, rarity: "rare" },
  { name: "Stream Deck", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381649/51Nw-kEg9zL._UF1000_1000_QL80__yw0hmo.jpg", value: 150, rarity: "common" }
];

const rarityWeights = { common: 70, rare: 25, legendary: 5 };

const lid = document.querySelector(".lid");
const openBtn = document.getElementById("openBtn");
const resultArea = document.getElementById("resultArea");

// Weighted random picker
function pickRandomItem() {
  const weightedArray = [];
  items.forEach(item => {
    const weight = rarityWeights[item.rarity] || 0;
    for(let i=0;i<weight;i++) weightedArray.push(item);
  });
  return weightedArray[Math.floor(Math.random()*weightedArray.length)];
}

openBtn.addEventListener("click", async () => {
  // prevent spamming button during animation
  openBtn.disabled = true;

  // clear previous item
  resultArea.innerHTML = "";

  // animate lid open
  lid.style.transform = "rotateX(115deg)";
  await wait(700);

  const won = pickRandomItem();

  // create card
  const card = document.createElement("div");
  card.className = "won-item";

  const img = document.createElement("img");
  img.src = won.image;
  img.alt = won.name;

  img.style.animation = "dropSpin 1s cubic-bezier(.25,.8,.25,1) forwards";
  img.style.transform = `rotate(${(Math.random()*40-20).toFixed(1)}deg)`;

  // rarity glow
  if(won.rarity === "rare") img.classList.add("glow-rare");
  if(won.rarity === "legendary") img.classList.add("glow-legend");

  const nm = document.createElement("div");
  nm.className = "item-name";
  nm.textContent = won.name;

  const val = document.createElement("div");
  val.className = "item-value";
  val.textContent = `$${won.value.toLocaleString()}`;

  card.appendChild(img);
  card.appendChild(nm);
  card.appendChild(val);
  resultArea.appendChild(card);

  // auto close lid
  setTimeout(() => {
    lid.style.transform = "rotateX(0deg)";
    openBtn.disabled = false; // re-enable button
  }, 900);

  // optional: webhook
  const WEBHOOK = "https://discord.com/api/webhooks/1427366097979576502/dygCapbh6RMtIvmEv3PWiNdBWinjE3cKGeBAy2bv9SFtbBNW8iy51Hm9khExhIqzg_lr";
  if(WEBHOOK && WEBHOOK.length>10){
    sendWebhook(WEBHOOK, won).catch(err=>console.warn("Webhook failed", err));
  }
});

function wait(ms){ return new Promise(res=>setTimeout(res, ms)); }

async function sendWebhook(url, won){
  const payload = {
    username:"CaseQuest",
    embeds:[{
      title:"🎁 Tech Case Opened",
      description:`**${won.name}** — $${won.value.toLocaleString()}`,
      color:16755200,
      image:{url:won.image}
    }]
  };
  await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
}
