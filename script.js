import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

const openBtn = document.getElementById("openBtn");
const resultArea = document.getElementById("resultArea");

// Create Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const point = new THREE.PointLight(0xffffff, 1.2);
point.position.set(5, 5, 5);
scene.add(point);

// Create crate (main box)
const boxGeometry = new THREE.BoxGeometry(2, 1, 2);
const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x156289, metalness: 0.6, roughness: 0.3 });
const box = new THREE.Mesh(boxGeometry, boxMaterial);
scene.add(box);

// Lid (separate mesh)
const lidGeometry = new THREE.BoxGeometry(2, 0.2, 2);
const lidMaterial = new THREE.MeshStandardMaterial({ color: 0x1abc9c, metalness: 0.8, roughness: 0.2 });
const lid = new THREE.Mesh(lidGeometry, lidMaterial);
lid.position.y = 0.6;
scene.add(lid);

// Animation vars
let lidOpen = false;
let animationProgress = 0;

// Particle system
const particles = new THREE.Group();
scene.add(particles);

function createParticles() {
  for (let i = 0; i < 150; i++) {
    const geom = new THREE.SphereGeometry(0.02, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particle = new THREE.Mesh(geom, mat);
    particle.position.set(0, 0.6, 0);
    particle.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 3,
      (Math.random() - 0.5) * 2
    );
    particles.add(particle);
  }
}

function updateParticles(delta) {
  for (let i = particles.children.length - 1; i >= 0; i--) {
    const p = particles.children[i];
    p.position.addScaledVector(p.velocity, delta * 2);
    p.velocity.y -= delta * 2;
    if (p.position.y < -2) particles.remove(p);
  }
}

// Open case function
openBtn.addEventListener("click", () => {
  if (lidOpen) return;
  lidOpen = true;
  animationProgress = 0;
  createParticles();
  resultArea.textContent = "🎁 Opening case...";
  setTimeout(() => {
    resultArea.textContent = "You got: MacBook Pro M3 💻";
  }, 2000);
});

function animate() {
  requestAnimationFrame(animate);

  // Animate lid
  if (lidOpen && animationProgress < Math.PI / 2) {
    animationProgress += 0.05;
    lid.rotation.x = -animationProgress;
  }

  updateParticles(0.016);
  renderer.render(scene, camera);
}

animate();

// Handle resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
