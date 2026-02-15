import * as THREE from "./vendor/three.module.js";

const canvas = document.getElementById("app");
const badge = document.querySelector(".badge");

function setBadge(text) {
  if (badge) badge.textContent = text;
}

function startFallback2D() {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    setBadge("WebGL unavailable");
    return;
  }

  setBadge("WebGL blocked - 2D fallback");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function draw(t) {
    const w = canvas.width;
    const h = canvas.height;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0f1522");
    bg.addColorStop(1, "#06090f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const x = w * 0.5 + Math.cos(t * 0.002) * 80;
    const y = h * 0.55 + Math.sin(t * 0.003) * 20;

    ctx.fillStyle = "#66b3ff";
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

function startThree() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (err) {
    console.error("WebGL init failed, switching to fallback:", err);
    startFallback2D();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1522);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 8, 11);

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  scene.add(sun);

  const planeHalf = 7;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(planeHalf * 2, planeHalf * 2),
    new THREE.MeshStandardMaterial({ color: 0x1f2d45, roughness: 0.9, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI * 0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(planeHalf * 2, 14, 0x5f7da8, 0x385071);
  grid.position.y = 0.01;
  scene.add(grid);

  const radius = 0.45;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0x6db3ff, roughness: 0.35, metalness: 0.2 })
  );
  ball.position.set(0, radius, 0);
  ball.castShadow = true;
  scene.add(ball);

  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
  window.addEventListener("keydown", (e) => {
    if (e.code in keys) keys[e.code] = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.code in keys) keys[e.code] = false;
  });

  const velocity = new THREE.Vector3(0, 0, 0);
  const inputDir = new THREE.Vector3(0, 0, 0);

  const accel = 18.0;
  const damping = 4.8;
  const gravity = -24.0;
  const bounce = 0.45;
  const wallBounce = 0.6;
  const maxSpeed = 7.5;

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.033);

    inputDir.set(0, 0, 0);
    if (keys.KeyW) inputDir.z -= 1;
    if (keys.KeyS) inputDir.z += 1;
    if (keys.KeyA) inputDir.x -= 1;
    if (keys.KeyD) inputDir.x += 1;
    if (inputDir.lengthSq() > 0) inputDir.normalize();

    velocity.x += inputDir.x * accel * dt;
    velocity.z += inputDir.z * accel * dt;

    const planar = new THREE.Vector2(velocity.x, velocity.z);
    const speed = planar.length();
    if (speed > maxSpeed) {
      planar.setLength(maxSpeed);
      velocity.x = planar.x;
      velocity.z = planar.y;
    }

    const dampFactor = Math.max(0, 1 - damping * dt);
    velocity.x *= dampFactor;
    velocity.z *= dampFactor;

    velocity.y += gravity * dt;

    ball.position.addScaledVector(velocity, dt);

    if (ball.position.y < radius) {
      ball.position.y = radius;
      if (Math.abs(velocity.y) > 0.2) {
        velocity.y = -velocity.y * bounce;
      } else {
        velocity.y = 0;
      }
    }

    const limit = planeHalf - radius;

    if (ball.position.x > limit) {
      ball.position.x = limit;
      velocity.x = -Math.abs(velocity.x) * wallBounce;
    } else if (ball.position.x < -limit) {
      ball.position.x = -limit;
      velocity.x = Math.abs(velocity.x) * wallBounce;
    }

    if (ball.position.z > limit) {
      ball.position.z = limit;
      velocity.z = -Math.abs(velocity.z) * wallBounce;
    } else if (ball.position.z < -limit) {
      ball.position.z = -limit;
      velocity.z = Math.abs(velocity.z) * wallBounce;
    }

    const rollAxis = new THREE.Vector3(velocity.z, 0, -velocity.x);
    if (rollAxis.lengthSq() > 1e-6) {
      rollAxis.normalize();
      const angularSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) / radius;
      ball.rotateOnWorldAxis(rollAxis, angularSpeed * dt);
    }

    const targetCam = new THREE.Vector3(ball.position.x, 8, ball.position.z + 11);
    camera.position.lerp(targetCam, 1 - Math.exp(-5 * dt));
    camera.lookAt(ball.position.x, radius * 0.7, ball.position.z);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  setBadge("WASD Ball Physics");
  animate();
}

startThree();
