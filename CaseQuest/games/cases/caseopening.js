

// -------------------- assets --------------------
const items = [
  // Use these example Cloudinary images (you can replace with local: './images/macbook.png')
  { name: "MacBook Pro M3", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381546/mba_15_m3_2024_hero_g6lzj8.png", value: 2200, rarity: "common" },
  { name: "Samsung S24 Ultra", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381567/71WcjsOVOmL_s7enwe.jpg", value: 1100, rarity: "common" },
  { name: "High-End GPU (RTX 5090)", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381591/71tV-csYdCL_o3xsot.jpg", value: 2500, rarity: "rare" },
  { name: "iPhone 15 Pro", image: "https://res.cloudinary.com/dldyaqnbq/image/upload/v1760381363/refurb-iphone-15-pro-blacktitanium-202412_obhoxy.jpg", value: 1200, rarity: "common" }
];

// Weighted picker (simple)
const rarityWeights = { common: 70, rare: 25, legendary: 5 };
function pickRandomItem() {
  const weighted = [];
  items.forEach(it => {
    const w = rarityWeights[it.rarity] || 0;
    for(let i=0;i<w;i++) weighted.push(it);
  });
  return weighted[Math.floor(Math.random()*weighted.length)];
}

// -------------------- locale -> country display --------------------
function inferCountryFromLocale() {
  const lang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  const parts = lang.split(/[-_]/);
  if(parts.length >= 2) {
    const region = parts[1].toUpperCase();
    try {
      if (typeof Intl.DisplayNames === 'function') {
        const dn = new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' });
        return dn.of(region) || region;
      }
    } catch(e){}
    return region;
  }
  return "Unknown";
}
document.getElementById('detectedCountry').textContent = inferCountryFromLocale();

// -------------------- Three.js scene --------------------
const wrap = document.getElementById('canvasWrap');
const width = wrap.clientWidth || 720;
const height = wrap.clientHeight || 450;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06060a);

const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 200);
camera.position.set(0,1.6,4);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
wrap.appendChild(renderer.domElement);

// lights
const dir = new THREE.DirectionalLight(0xffffff, 1.1); dir.position.set(-5,6,5); scene.add(dir);
const hemi = new THREE.HemisphereLight(0xffffee, 0x080820, 0.6); scene.add(hemi);

// crate group
const crate = new THREE.Group(); scene.add(crate);

// procedural crate body
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1d2430, metalness:0.25, roughness:0.45 });
const body = new THREE.Mesh(new THREE.BoxGeometry(2,1.2,1.6), bodyMat); crate.add(body);

// lid wrapped so it hinges from back edge
const lidWrapper = new THREE.Group(); lidWrapper.position.set(0,0.6,-0.78); crate.add(lidWrapper);
const lidMat = new THREE.MeshStandardMaterial({ color: 0x243644, metalness:0.55, roughness:0.3 });
const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(2.02,0.18,1.62), lidMat); lidMesh.position.set(0,0,0.78); lidWrapper.add(lidMesh);

// small strip
const strip = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.02,0.02), new THREE.MeshBasicMaterial({ color: 0xffb86b }));
strip.position.set(0,0.59,0.79); crate.add(strip);

// particles (Points)
let particles = null;
function setupParticles() {
  const count = /Mobi|Android/i.test(navigator.userAgent) ? 80 : 220;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  for(let i=0;i<count;i++){ pos[i*3]=0; pos[i*3+1]=0; pos[i*3+2]=0; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const mat = new THREE.PointsMaterial({ size:0.07, map: makeParticleTex(), transparent:true, depthWrite:false });
  const pts = new THREE.Points(geo, mat); pts.visible=false; pts.frustumCulled=false; scene.add(pts);
  particles = { pts, velocities: new Array(count).fill().map(()=>new THREE.Vector3()), age:0, life:1.6, alive:false };
}
function makeParticleTex(){
  const s=64; const c=document.createElement('canvas'); c.width=c.height=s; const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.2,'rgba(255,200,150,0.95)'); g.addColorStop(0.6,'rgba(255,120,60,0.7)'); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,s,s); return new THREE.CanvasTexture(c);
}

// burst
function burst() {
  if(!particles) return;
  const posAttr = particles.pts.geometry.attributes.position.array;
  const n = posAttr.length/3;
  for(let i=0;i<n;i++){
    posAttr[i*3]   = (Math.random()-0.5)*0.2;
    posAttr[i*3+1] = 0.6 + Math.random()*0.15;
    posAttr[i*3+2] = (Math.random()-0.5)*0.2;
    particles.velocities[i].set((Math.random()-0.5)*3, Math.random()*4+1.4, (Math.random()-0.5)*3);
  }
  particles.pts.geometry.attributes.position.needsUpdate = true;
  particles.pts.visible = true; particles.alive=true; particles.age=0;
}

// camera & animation helpers
const clock = new THREE.Clock();
let isAnimating=false;
function easeOutCubic(t){ return 1 - Math.pow(1-t,3); }

// open/close sequence
async function playOpenSequence() {
  if(isAnimating) return; isAnimating=true;
  // small squash & pop
  await tweenScale(crate,0.95,80); await tweenScale(crate,1.08,170); await tweenScale(crate,1.0,120);
  // open lid
  await tweenRotation(lidWrapper, -Math.PI*0.55, 600);
  // burst + camera pop
  burst(); await cameraPop(700);
  // keep open briefly, reveal will show in UI
  await waitMS(900);
  // close
  await tweenRotation(lidWrapper, 0, 500);
  isAnimating=false;
}

function tweenScale(obj,target,ms){
  return new Promise(res=>{
    const start=obj.scale.x; const delta=target-start; const t0=performance.now();
    (function step(now){
      const p=Math.min(1,(now-t0)/ms); const e = easeOutCubic(p);
      obj.scale.setScalar(start + delta*e);
      if(p<1) requestAnimationFrame(step); else res();
    })(t0);
  });
}
function tweenRotation(obj,targetX,ms){
  return new Promise(res=>{
    const start = obj.rotation.x; const t0 = performance.now();
    (function step(now){
      const p = Math.min(1,(now-t0)/ms); const e = easeOutCubic(p);
      obj.rotation.x = start + (targetX - start) * e;
      if(p<1) requestAnimationFrame(step); else res();
    })(t0);
  });
}
function cameraPop(ms){
  return new Promise(res=>{
    const startPos = camera.position.clone(); const t0 = performance.now();
    (function step(now){
      const p = Math.min(1,(now-t0)/ms); const e = easeOutCubic(p);
      camera.position.lerpVectors(startPos, new THREE.Vector3(0,1.1,2.7), e);
      const s = (1-p)*0.04;
      camera.rotation.z = (Math.random()*2-1) * s;
      if(p<1) requestAnimationFrame(step); else { camera.position.copy(startPos); camera.rotation.set(0,0,0); res(); }
    })(t0);
  });
}
function waitMS(ms){ return new Promise(r=>setTimeout(r,ms)); }

// render loop
function animate(){
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  // update particles
  if(particles && particles.alive){
    particles.age += dt;
    const pos = particles.pts.geometry.attributes.position.array;
    for(let i=0;i<particles.velocities.length;i++){
      pos[i*3] += particles.velocities[i].x * dt;
      pos[i*3+1] += particles.velocities[i].y * dt;
      pos[i*3+2] += particles.velocities[i].z * dt;
      particles.velocities[i].y -= 5 * dt;
      particles.velocities[i].multiplyScalar(0.995);
    }
    particles.pts.geometry.attributes.position.needsUpdate = true;
    particles.pts.material.opacity = Math.max(0, 1 - (particles.age / particles.life));
    if(particles.age > particles.life){ particles.alive=false; particles.pts.visible=false; }
  }
  renderer.render(scene,camera);
}
setupParticles = setupParticles || setupParticles; // noop if defined
setupParticles();
setupParticles(); // init
animate();

// -------------------- UI wiring --------------------
const openBtn = document.getElementById('openBtn');
const resultArea = document.getElementById('resultArea');

openBtn.addEventListener('click', async () => {
  // choose item first (so UI can show)
  const won = pickRandomItem();
  // start 3D sequence
  await playOpenSequence();
  // update UI (show image + info)
  showWonItem(won);
  // auto-close already done in sequence above
});

// show result in right panel
function showWonItem(item){
  resultArea.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className='won-item';
  const img = document.createElement('img'); img.src = item.image; img.alt = item.name;
  const name = document.createElement('div'); name.className='item-name'; name.textContent = item.name;
  const val = document.createElement('div'); val.className='item-value'; val.textContent = `$${item.value.toLocaleString()}`;
  wrap.appendChild(img); wrap.appendChild(name); wrap.appendChild(val);
  resultArea.appendChild(wrap);
}

// -------------- helper: (avoid duplicate names) --------------
function setupParticles(){
  // remove old if present
  if(particles && particles.pts){ scene.remove(particles.pts); particles=null; }
  const count = /Mobi|Android/i.test(navigator.userAgent) ? 80 : 220;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  for(let i=0;i<count;i++){ pos[i*3]=0; pos[i*3+1]=0; pos[i*3+2]=0; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const tex = makeParticleTex();
  const mat = new THREE.PointsMaterial({ size:0.08, map:tex, transparent:true, depthWrite:false });
  const pts = new THREE.Points(geo, mat); pts.visible=false; pts.frustumCulled=false; scene.add(pts);
  particles = { pts, velocities: new Array(count).fill().map(()=>new THREE.Vector3()), age:0, life:1.6, alive:false };
}
