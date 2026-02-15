import * as THREE from "./vendor/three.module.js";

const canvas = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1522);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(2.8, 1.8, 4.8);

scene.add(new THREE.AmbientLight(0xffffff, 0.65));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(5, 6, 4);
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({ color: 0x1e2a42, roughness: 0.9, metalness: 0.05 })
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -1;
scene.add(floor);

const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshNormalMaterial());
scene.add(cube);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(1.8, 0.08, 24, 96),
  new THREE.MeshStandardMaterial({ color: 0xffb870, roughness: 0.35, metalness: 0.2 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = -0.15;
scene.add(ring);

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onResize);

const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  cube.rotation.x = t * 0.45;
  cube.rotation.y = t * 0.7;
  cube.position.y = Math.sin(t * 1.1) * 0.22;

  ring.rotation.z = t * 0.35;

  camera.position.x = Math.cos(t * 0.22) * 4.8;
  camera.position.z = Math.sin(t * 0.22) * 4.8;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
