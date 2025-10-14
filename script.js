<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>3D Crate Opener</title>
<style>
  html,body { height:100%; margin:0; background:#0b0b0f; overflow:hidden; font-family:Inter,system-ui,Arial; }
  #container { position:fixed; inset:0; pointer-events:none; } /* canvas container */
  #ui { position: absolute; left: 50%; transform: translateX(-50%); bottom: 36px; z-index: 20; pointer-events:auto; text-align:center; width:520px; }
  #openBtn { padding: 14px 26px; font-size:16px; border-radius:12px; border:0; background: linear-gradient(90deg,#ff6b6b,#ffb86b); color:#111; font-weight:700; cursor:pointer; box-shadow:0 8px 30px rgba(255,107,107,0.12); }
  #resultArea { position: absolute; left: 18px; top: 18px; color:#fff; z-index:10; pointer-events:auto; }
  /* simple fallback message */
  #noWebGL { position: absolute; left: 50%; top: 8px; transform: translateX(-50%); color:#fff; opacity:0.85; font-size:13px; }
</style>
</head>
<body>
<div id="container"></div>

<div id="resultArea"></div>

<div id="ui">
  <button id="openBtn">OPEN CASE</button>
</div>

<div id="noWebGL" style="display:none">WebGL not supported. Using fallback animations.</div>

<!-- Three.js (modules via unpkg) -->
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'https://unpkg.com/three@0.158.0/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/ShaderPass.js';

const container = document.getElementById('container');
const openBtn = document.getElementById('openBtn');
const resultArea = document.getElementById('resultArea');
const noWebGLWarning = document.getElementById('noWebGL');

let scene, camera, renderer, composer, clock;
let crateGroup, lidMesh;
let particleSystem, particlesGeo, particlesMat;
let mixer; // optional for GLTF animations
let isAnimating = false;

const MODEL_URL = ""; // <-- paste your .glb/.gltf URL here; if blank, uses procedural box
const USE_MODEL = MODEL_URL.trim().length > 0;

// detect mobile and lower complexity
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

// -------------------- init --------------------
function init() {
  // Basic scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x00000a, 0.02);

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  camera.position.set(0, 1.6, 4);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // Lights
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(-5, 8, 6); scene.add(rim);

  const fill = new THREE.HemisphereLight(0xffffee, 0x080820, 0.6);
  scene.add(fill);

  // subtle ground reflection plane (cheap)
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x080816, metalness: 0.2, roughness: 0.6 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20,20), groundMat);
  ground.rotation.x = -Math.PI/2; ground.position.y = -1.2; scene.add(ground);

  // create crate group placeholder
  crateGroup = new THREE.Group();
  scene.add(crateGroup);

  // environment glow sphere behind
  const bg = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0b1330, side: THREE.BackSide }));
  bg.position.set(0,0,-5); scene.add(bg);

  // Controls for debugging (disable in production if you want)
  // const controls = new OrbitControls(camera, renderer.domElement);
  // controls.enableDamping = true; controls.enabled = false;

  // postprocessing composer & bloom
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.8, 0.5, 0.85);
  bloom.threshold = 0.12;
  bloom.strength = 0.9;
  bloom.radius = 0.7;
  composer.addPass(bloom);

  const fxaa = new ShaderPass(FXAAShader);
  fxaa.material.uniforms['resolution'].value.set(1 / width, 1 / height);
  composer.addPass(fxaa);

  // clock
  clock = new THREE.Clock();

  // load model or procedural crate
  if (USE_MODEL) loadModel(MODEL_URL);
  else createProceduralCrate();

  // particles
  setupParticles();

  // resize
  window.addEventListener('resize', onResize);

  // check WebGL support fallback
  if (!renderer.capabilities.isWebGL2 && !renderer.context) {
    noWebGLWarning.style.display = 'block';
  }

  animate();
}

// -------------------- load GLTF --------------------
async function loadModel(url) {
  const loader = new GLTFLoader();
  loader.load(url, (g) => {
    // find the crate mesh and optionally the lid by naming convention
    const root = g.scene;
    root.traverse(n => {
      n.castShadow = true; n.receiveShadow = true;
    });

    // attempt to find lid by name "lid" or "top"
    const lidCandidate = root.getObjectByName('lid') || root.getObjectByName('Lid') || root.getObjectByName('top') || root.getObjectByName('Top');
    if (lidCandidate) {
      lidMesh = lidCandidate;
    } else {
      // fallback: split first child into lid by duplicating and offsetting
      // easier: assume model has a separate mesh for top; if not, you can edit the GLB in Blender and name the lid "lid"
      console.warn('No lid named found. For best results name the lid mesh "lid" in Blender/GLTF.');
    }

    crateGroup.add(root);

    // if GLTF has animations, prepare mixer
    if (g.animations && g.animations.length) {
      mixer = new THREE.AnimationMixer(root);
      g.animations.forEach(a => mixer.clipAction(a).play());
      // optionally stop mixer until open
      mixer.timeScale = 0;
    }
  }, undefined, e => {
    console.error('GLTF load error', e);
    // fallback to procedural
    crateGroup.clear(); createProceduralCrate();
  });
}

// -------------------- procedural crate --------------------
function createProceduralCrate() {
  // base box
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x222a36, metalness: 0.2, roughness: 0.4 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.6), boxMat);
  box.position.set(0,0,0);
  crateGroup.add(box);

  // lid as separate mesh so we can animate it
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x2d3a4a, metalness: 0.45, roughness: 0.25, emissive: 0x07203a, emissiveIntensity: 0.1 });
  lidMesh = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.18, 1.62), lidMat);
  lidMesh.position.set(0, 0.6, 0);
  // shift pivot to back edge so it opens like a hinge: use group wrapper
  const lidWrapper = new THREE.Group();
  lidWrapper.position.set(0, 0.6, -0.78); // hinge line at back (-z)
  lidMesh.position.set(0, 0, 0.78); // offset lid inside wrapper
  lidWrapper.add(lidMesh);
  crateGroup.add(lidWrapper);
  lidMesh.userData.wrapper = lidWrapper;

  // decorative strip lights
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xffb86b }));
  strip.position.set(0, 0.59, 0.79);
  crateGroup.add(strip);
}

// -------------------- particles --------------------
function setupParticles() {
  const count = isMobile ? 80 : 220;
  particlesGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const velocity = [];
  for (let i=0;i<count;i++){
    positions[i*3] = 0; positions[i*3+1] = 0; positions[i*3+2] = 0;
    size[i] = Math.random()*6 + 2;
    velocity.push(new THREE.Vector3((Math.random()-0.5)*3, Math.random()*4+1.4, (Math.random()-0.5)*3));
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  particlesGeo.setAttribute('size', new THREE.BufferAttribute(size,1));
  particleSystem = { geo: particlesGeo, velocity, alive: false, age:0, life:1.6 };

  particlesMat = new THREE.PointsMaterial({
    size: 0.08, sizeAttenuation: true, transparent:true,
    map: generateParticleTexture(), depthWrite:false, alphaTest:0.02
  });

  const points = new THREE.Points(particlesGeo, particlesMat);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  particleSystem.object = points;
}

// tiny particle texture using canvas
function generateParticleTexture(){
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,200,150,0.9)');
  g.addColorStop(0.5, 'rgba(255,120,60,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,size,size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// -------------------- trigger animation (call from your openBtn click) --------------------
async function playCrateOpenAnimation() {
  if (isAnimating) return;
  isAnimating = true;

  // crate wiggle / pop
  await tweenCrateScale(0.95, 80);
  await tweenCrateScale(1.08, 180);
  await tweenCrateScale(1.0, 120);

  // animate lid
  const lidWrapper = lidMesh?.userData?.wrapper || lidMesh;
  if (lidWrapper) {
    // open over 600ms
    await tweenRotation(lidWrapper, { x: -Math.PI * 0.55 }, 600, true);
  } else if (mixer) {
    // if model has animations, unpause them
    mixer.timeScale = 1;
    await waitForSeconds(0.65);
  }

  // explosion / particles
  burstParticles();

  // camera shake & zoom
  await cameraPopAndShake();

  // keep animation on screen for a moment
  await waitForSeconds(0.9);

  // optionally close lid back (comment out if you want it open)
  if (lidWrapper) {
    await tweenRotation(lidWrapper, { x: 0 }, 400, true);
  }

  isAnimating = false;
}

// small tween helpers (promise-based)
function tweenCrateScale(target, ms) {
  return new Promise(res=>{
    const start = crateGroup.scale.x;
    const delta = target - start;
    const startT = performance.now();
    function step(t){
      const p = Math.min(1, (t-startT)/ms);
      const ease = easeOutBack(p);
      crateGroup.scale.setScalar(start + delta * ease);
      if (p < 1) requestAnimationFrame(step);
      else res();
    }
    requestAnimationFrame(step);
  });
}

function tweenRotation(obj, toEuler, ms, useLocal=false) {
  return new Promise(res=>{
    const startX = (useLocal ? obj.rotation.x : obj.rotation.x);
    const startY = (useLocal ? obj.rotation.y : obj.rotation.y);
    const startZ = (useLocal ? obj.rotation.z : obj.rotation.z);
    const targetX = toEuler.x !== undefined ? toEuler.x : startX;
    const targetY = toEuler.y !== undefined ? toEuler.y : startY;
    const targetZ = toEuler.z !== undefined ? toEuler.z : startZ;
    const startT = performance.now();
    function step(t){
      const p = Math.min(1,(t-startT)/ms);
      const ease = easeOutCubic(p);
      obj.rotation.x = startX + (targetX - startX) * ease;
      obj.rotation.y = startY + (targetY - startY) * ease;
      obj.rotation.z = startZ + (targetZ - startZ) * ease;
      if (p < 1) requestAnimationFrame(step);
      else res();
    }
    requestAnimationFrame(step);
  });
}

function easeOutBack(t){ const c1=1.70158; const c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); }
function easeOutCubic(t){ return 1 - Math.pow(1-t,3); }
function waitForSeconds(s){ return new Promise(r=>setTimeout(r, s*1000)); }

// -------------------- particle burst --------------------
function burstParticles(){
  const ps = particleSystem;
  if (!ps) return;
  const points = ps.object;
  const pos = points.geometry.attributes.position.array;
  const count = pos.length/3;
  // initialize positions at crate top
  for (let i=0;i<count;i++){
    pos[i*3] = (Math.random()-0.5)*0.2;
    pos[i*3+1] = 0.6 + Math.random()*0.1;
    pos[i*3+2] = (Math.random()-0.5)*0.2;
  }
  points.geometry.attributes.position.needsUpdate = true;
  ps.alive = true; ps.age = 0;
  points.visible = true;
}

// -------------------- camera shake / pop --------------------
function cameraPopAndShake() {
  return new Promise(res=>{
    const startPos = camera.position.clone();
    const duration = 700;
    const start = performance.now();

    function step(t){
      const p = Math.min(1,(t-start)/duration);
      const ease = easeOutCubic(p);
      // zoom forward then back
      camera.position.lerpVectors(startPos, new THREE.Vector3(0,1.2,2.7), ease);
      // small shake using sin + random
      const shake = (1 - p) * 0.04;
      camera.rotation.z = (Math.random()*2-1) * shake;
      camera.rotation.x = (Math.random()*2-1) * shake * 0.6;
      if (p < 1) requestAnimationFrame(step);
      else {
        // reset rotations
        camera.position.copy(startPos);
        camera.rotation.set(0,0,0);
        res();
      }
    }
    requestAnimationFrame(step);
  });
}

// -------------------- render loop --------------------
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // particle physics update if alive
  if (particleSystem && particleSystem.alive) {
    particleSystem.age += dt;
    const attr = particleSystem.geo.attributes.position;
    const arr = attr.array;
    for (let i=0;i<particleSystem.velocity.length;i++){
      arr[i*3]   += particleSystem.velocity[i].x * dt;
      arr[i*3+1] += particleSystem.velocity[i].y * dt;
      arr[i*3+2] += particleSystem.velocity[i].z * dt;
      // gravity
      particleSystem.velocity[i].y -= 5 * dt;
      // small drag
      particleSystem.velocity[i].multiplyScalar(0.995);
    }
    attr.needsUpdate = true;
    particleSystem.object.material.opacity = 1 - (particleSystem.age / particleSystem.life);
    if (particleSystem.age > particleSystem.life) {
      particleSystem.alive = false;
      particleSystem.object.visible = false;
    }
  }

  // GLTF mixer update
  if (mixer) {
    mixer.update(dt);
  }

  // composer render (bloom)
  composer.render(dt);
}

// -------------------- resize --------------------
function onResize(){
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
  composer.setSize(w,h);
}

// -------------------- user integration --------------------
init();

// Hook into your existing open button -> play 3D animation then proceed with your DOM reveal.
// If you want the 3D animation to run when the page's openBtn clicked, we override/add listener:
openBtn.addEventListener('click', async (e) => {
  // run 3D sequence
  await playCrateOpenAnimation();

  // after animation completes, dispatch a custom event so your existing script can continue
  // Example: your existing code listens for "crateOpened" to show the item card
  window.dispatchEvent(new CustomEvent('crateOpened3D'));
});

// if you want to automatically show the DOM prize when 3D is done, add a listener:
window.addEventListener('crateOpened3D', () => {
  // your existing reveal logic can be here, or keep it in your other file
  // e.g., call showPrizeUI(); or trigger the click flow
  console.log('3D animation finished - fire DOM reveal now');
});

</script>
</body>
</html>
