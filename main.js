import * as THREE from "./vendor/three.module.js";

const canvas = document.getElementById("app");
const badge = document.querySelector(".badge");

function setBadge(text) {
  if (badge) badge.textContent = text;
}

function randomId(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function colorFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  const c = new THREE.Color();
  c.setHSL(h / 360, 0.7, 0.58);
  return c;
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

  const sessionId = randomId();
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "lobby";

  const remotes = new Map();
  let sendState = null;
  let room = null;
  let netState = "connecting";

  function updateBadge() {
    setBadge(`WASD Ball Physics | ID ${sessionId} | Room ${roomId} | ${netState}`);
  }

  function createRemoteBall(peerId, remoteId) {
    const remoteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 24),
      new THREE.MeshStandardMaterial({ color: colorFromId(remoteId), roughness: 0.4, metalness: 0.15 })
    );
    remoteMesh.castShadow = true;
    remoteMesh.position.set(0, radius, 0);
    scene.add(remoteMesh);

    remotes.set(peerId, {
      id: remoteId,
      mesh: remoteMesh,
      targetPos: remoteMesh.position.clone(),
      targetQuat: remoteMesh.quaternion.clone(),
      lastSeen: performance.now(),
    });

    return remotes.get(peerId);
  }

  async function initRealtime() {
    try {
      const { joinRoom } = await import("https://cdn.jsdelivr.net/npm/trystero/+esm");
      room = joinRoom({ appId: "asis5528-ball-physics-v1" }, roomId);

      const [send, get] = room.makeAction("state");
      sendState = send;

      room.onPeerJoin((peerId) => {
        if (sendState) {
          sendState({
            id: sessionId,
            px: ball.position.x,
            py: ball.position.y,
            pz: ball.position.z,
            qx: ball.quaternion.x,
            qy: ball.quaternion.y,
            qz: ball.quaternion.z,
            qw: ball.quaternion.w,
          }, peerId);
        }
      });

      room.onPeerLeave((peerId) => {
        const remote = remotes.get(peerId);
        if (!remote) return;
        scene.remove(remote.mesh);
        remote.mesh.geometry.dispose();
        remote.mesh.material.dispose();
        remotes.delete(peerId);
      });

      get((payload, peerId) => {
        if (!payload || !payload.id || payload.id === sessionId) return;

        let remote = remotes.get(peerId);
        if (!remote) remote = createRemoteBall(peerId, payload.id);

        remote.targetPos.set(payload.px || 0, payload.py || radius, payload.pz || 0);
        remote.targetQuat.set(payload.qx || 0, payload.qy || 0, payload.qz || 0, payload.qw || 1);
        remote.lastSeen = performance.now();
      });

      netState = "online";
      updateBadge();

      window.addEventListener("beforeunload", () => {
        if (room && room.leave) room.leave();
      });
    } catch (err) {
      console.warn("Realtime disabled:", err);
      netState = "offline";
      updateBadge();
    }
  }

  updateBadge();
  initRealtime();

  const clock = new THREE.Clock();
  let netTick = 0;

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

    const stalePeers = [];
    for (const [peerId, remote] of remotes.entries()) {
      const alpha = 1 - Math.exp(-10 * dt);
      remote.mesh.position.lerp(remote.targetPos, alpha);
      remote.mesh.quaternion.slerp(remote.targetQuat, alpha);

      if (performance.now() - remote.lastSeen > 15000) {
        scene.remove(remote.mesh);
        remote.mesh.geometry.dispose();
        remote.mesh.material.dispose();
        stalePeers.push(peerId);
      }
    }
    for (const peerId of stalePeers) remotes.delete(peerId);

    const targetCam = new THREE.Vector3(ball.position.x, 8, ball.position.z + 11);
    camera.position.lerp(targetCam, 1 - Math.exp(-5 * dt));
    camera.lookAt(ball.position.x, radius * 0.7, ball.position.z);

    netTick += dt;
    if (sendState && netTick > 0.05) {
      netTick = 0;
      sendState({
        id: sessionId,
        px: ball.position.x,
        py: ball.position.y,
        pz: ball.position.z,
        qx: ball.quaternion.x,
        qy: ball.quaternion.y,
        qz: ball.quaternion.z,
        qw: ball.quaternion.w,
      });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

startThree();
