const openBtn = document.getElementById("openBtn");
const resultArea = document.getElementById("resultArea");

// Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvasWrap').appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const point = new THREE.PointLight(0xffffff, 1.2);
point.position.set(5,5,5);
scene.add(point);

// Crate
const boxGeo = new THREE.BoxGeometry(2,1,2);
const boxMat = new THREE.MeshStandardMaterial({ color: 0x156289, metalness: 0.6, roughness: 0.3 });
const box = new THREE.Mesh(boxGeo, boxMat);
scene.add(box);

// Lid
const lidGeo = new THREE.BoxGeometry(2,0.2,2);
const lidMat = new THREE.MeshStandardMaterial({ color: 0x1abc9c, metalness: 0.8, roughness: 0.2 });
const lid = new THREE.Mesh(lidGeo, lidMat);
lid.position.y = 0.6;
scene.add(lid);

// Lid animation
let lidOpen = false;
let animProgress = 0;

// Particles
const particles = new THREE.Group();
scene.add(particles);

function createParticles() {
  for (let i = 0; i < 150; i++) {
    const geom = new THREE.SphereGeometry(0.02,6,6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const p = new THREE.Mesh(geom, mat);
    p.position.set(0,0.6,0);
    p.velocity = new THREE.Vector3((Math.random()-0.5)*2, Math.random()*3, (Math.random()-0.5)*2);
    particles.add(p);
  }
}

function updateParticles(delta){
  for(let i=particles.children.length-1;i>=0;i--){
    const p = particles.children[i];
    p.position.addScaledVector(p.velocity, delta*2);
    p.velocity.y -= delta*2;
    if(p.position.y < -2) particles.remove(p);
  }
}

// Items
const items = [
  { name: "MacBook Pro M3", value: 2200 },
  { name: "iPhone 15 Pro", value: 1200 },
  { name: "Alienware Laptop", value: 3200 },
  { name: "Beats Studio Pro", value: 350 }
];

function pickItem() {
  return items[Math.floor(Math.random()*items.length)];
}

// Open button
openBtn.addEventListener("click",()=>{
  if(lidOpen) return;
  lidOpen = true;
  animProgress = 0;
  createParticles();
  resultArea.textContent = "🎁 Opening case...";
  setTimeout(()=>{
    const won = pickItem();
    resultArea.textContent = `You got: ${won.name} ($${won.value})`;
  },2000);
});

// Animate
function animate(){
  requestAnimationFrame(animate);

  if(lidOpen && animProgress < Math.PI/2){
    animProgress += 0.05;
    lid.rotation.x = -animProgress;
  }

  updateParticles(0.016);
  renderer.render(scene,camera);
}

animate();

// Responsive
window.addEventListener('resize',()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
