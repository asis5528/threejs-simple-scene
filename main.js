import * as THREE from "./vendor/three.module.js";

const canvas = document.getElementById("app");
const badge = document.querySelector(".badge");

function setBadge(text) {
  if (badge) badge.textContent = text;
}

function randomId(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function colorFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  const c = new THREE.Color();
  c.setHSL(h / 360, 0.7, 0.58);
  return c;
}

function sanitizeName(name, fallback) {
  const trimmed = (name || "").trim().slice(0, 18);
  return trimmed || fallback;
}

function sanitizeRoom(room) {
  const cleaned = (room || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  return cleaned || "lobby";
}

const APP_ID = "asis5528-ball-physics";

function makeNameSprite(text) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  c.width = 512;
  c.height = 128;

  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "rgba(10,16,28,0.7)";
  const pad = 12;
  const w = c.width - pad * 2;
  const h = c.height - pad * 2;
  const r = 20;
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(pad + w - r, pad);
  ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + r);
  ctx.lineTo(pad + w, pad + h - r);
  ctx.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h);
  ctx.lineTo(pad + r, pad + h);
  ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(173,210,255,0.45)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#f4f9ff";
  ctx.font = "bold 54px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);

  const texture = new THREE.CanvasTexture(c);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.5, 0.62, 1);
  sprite.position.set(0, 1.2, 0);
  return sprite;
}

function setNameSpriteText(sprite, text) {
  const next = makeNameSprite(text);
  const oldMat = sprite.material;
  const oldMap = oldMat && oldMat.map;
  sprite.material = next.material;
  if (oldMat) oldMat.dispose();
  if (oldMap) oldMap.dispose();
}

function createStartUI(defaultName, defaultRoom) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = "rgba(2,6,12,0.72)";
    overlay.style.zIndex = "1000";
    overlay.style.backdropFilter = "blur(6px)";

    const card = document.createElement("div");
    card.style.width = "min(92vw, 420px)";
    card.style.padding = "18px";
    card.style.borderRadius = "14px";
    card.style.background = "#101a2a";
    card.style.border = "1px solid #2a3d5f";
    card.style.boxShadow = "0 18px 50px rgba(0,0,0,0.35)";

    const title = document.createElement("div");
    title.textContent = "Join Ball Room";
    title.style.color = "#eef5ff";
    title.style.font = "700 22px Segoe UI";
    title.style.marginBottom = "12px";

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Username";
    nameLabel.style.display = "block";
    nameLabel.style.color = "#c8d8f0";
    nameLabel.style.font = "600 13px Segoe UI";
    nameLabel.style.marginBottom = "6px";

    const nameInput = document.createElement("input");
    nameInput.value = defaultName;
    nameInput.maxLength = 18;
    nameInput.placeholder = "Your name";
    nameInput.style.width = "100%";
    nameInput.style.boxSizing = "border-box";
    nameInput.style.marginBottom = "12px";
    nameInput.style.padding = "10px 12px";
    nameInput.style.borderRadius = "10px";
    nameInput.style.border = "1px solid #35507b";
    nameInput.style.background = "#0a1220";
    nameInput.style.color = "#e9f3ff";

    const roomLabel = document.createElement("label");
    roomLabel.textContent = "Room";
    roomLabel.style.display = "block";
    roomLabel.style.color = "#c8d8f0";
    roomLabel.style.font = "600 13px Segoe UI";
    roomLabel.style.marginBottom = "6px";

    const roomInput = document.createElement("input");
    roomInput.value = defaultRoom;
    roomInput.maxLength = 24;
    roomInput.placeholder = "lobby";
    roomInput.style.width = "100%";
    roomInput.style.boxSizing = "border-box";
    roomInput.style.marginBottom = "14px";
    roomInput.style.padding = "10px 12px";
    roomInput.style.borderRadius = "10px";
    roomInput.style.border = "1px solid #35507b";
    roomInput.style.background = "#0a1220";
    roomInput.style.color = "#e9f3ff";

    const hint = document.createElement("div");
    hint.textContent = "Share the same room with friends to see each other in realtime.";
    hint.style.color = "#9fb3d4";
    hint.style.font = "12px Segoe UI";
    hint.style.marginBottom = "14px";

    const joinBtn = document.createElement("button");
    joinBtn.textContent = "Join";
    joinBtn.style.width = "100%";
    joinBtn.style.padding = "10px 12px";
    joinBtn.style.border = "0";
    joinBtn.style.borderRadius = "10px";
    joinBtn.style.background = "#4ea1ff";
    joinBtn.style.color = "#041124";
    joinBtn.style.font = "700 14px Segoe UI";
    joinBtn.style.cursor = "pointer";

    card.appendChild(title);
    card.appendChild(nameLabel);
    card.appendChild(nameInput);
    card.appendChild(roomLabel);
    card.appendChild(roomInput);
    card.appendChild(hint);
    card.appendChild(joinBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const submit = () => {
      const chosenName = sanitizeName(nameInput.value, defaultName);
      const chosenRoom = sanitizeRoom(roomInput.value);
      document.body.removeChild(overlay);
      resolve({ playerName: chosenName, roomId: chosenRoom });
    };

    joinBtn.addEventListener("click", submit);
    nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    roomInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    setTimeout(() => nameInput.focus(), 0);
  });
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

async function startThree() {
  const sessionId = randomId();
  const params = new URLSearchParams(window.location.search);
  const defaultName = sanitizeName(params.get("name") || localStorage.getItem("ball_player_name") || `Player-${sessionId}`, `Player-${sessionId}`);
  const defaultRoom = sanitizeRoom(params.get("room") || localStorage.getItem("ball_room") || "lobby");

  const joinData = await createStartUI(defaultName, defaultRoom);
  const playerName = joinData.playerName;
  const roomId = joinData.roomId;

  localStorage.setItem("ball_player_name", playerName);
  localStorage.setItem("ball_room", roomId);
  const nextUrl = `${window.location.pathname}?room=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}`;
  history.replaceState(null, "", nextUrl);

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
  const paintCanvas = document.createElement("canvas");
  const paintCtx = paintCanvas.getContext("2d");
  paintCanvas.width = 1024;
  paintCanvas.height = 1024;
  paintCtx.fillStyle = "#ffffff";
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
  const paintTexture = new THREE.CanvasTexture(paintCanvas);
  paintTexture.needsUpdate = true;
  paintTexture.colorSpace = THREE.SRGBColorSpace;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(planeHalf * 2, planeHalf * 2),
    new THREE.MeshStandardMaterial({ map: paintTexture, roughness: 0.9, metalness: 0.02 })
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
  ball.add(makeNameSprite(playerName));

  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
  let paintMode = "draw";
  window.addEventListener("keydown", (e) => {
    if (e.code in keys) keys[e.code] = true;
    if (e.code === "KeyP" && !e.repeat) {
      paintMode = paintMode === "draw" ? "erase" : "draw";
      updateBadge();
    }
  });
  window.addEventListener("keyup", (e) => { if (e.code in keys) keys[e.code] = false; });

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

  const remotes = new Map();
  let sendState = null;
  let sendPaint = null;
  let room = null;
  let netState = "connecting";

  function updateBadge() {
    setBadge(`WASD Ball Physics | ${playerName} (${sessionId}) | ${paintMode.toUpperCase()} (P) | Room ${roomId} | ${netState} | Peers ${remotes.size}`);
  }

  function paintAtWorld(x, z, mode) {
    const u = (x + planeHalf) / (planeHalf * 2);
    const v = (z + planeHalf) / (planeHalf * 2);
    if (u < 0 || u > 1 || v < 0 || v > 1) return;

    const px = u * paintCanvas.width;
    const py = v * paintCanvas.height;
    paintCtx.fillStyle = mode === "erase" ? "#ffffff" : "#d91f2e";
    paintCtx.beginPath();
    paintCtx.arc(px, py, 14, 0, Math.PI * 2);
    paintCtx.fill();
    paintTexture.needsUpdate = true;
  }

  function createRemoteBall(peerId, remoteId, remoteName) {
    const remoteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 24),
      new THREE.MeshStandardMaterial({ color: colorFromId(remoteId), roughness: 0.4, metalness: 0.15 })
    );
    remoteMesh.castShadow = true;
    remoteMesh.position.set(0, radius, 0);
    scene.add(remoteMesh);

    const label = makeNameSprite(remoteName || `Player-${remoteId}`);
    remoteMesh.add(label);

    const now = performance.now();
    const remote = {
      id: remoteId,
      name: remoteName || `Player-${remoteId}`,
      mesh: remoteMesh,
      label,
      netPos: remoteMesh.position.clone(),
      netVel: new THREE.Vector3(),
      netQuat: remoteMesh.quaternion.clone(),
      netTs: now,
      lastSeen: now,
    };

    remotes.set(peerId, remote);
    updateBadge();
    return remote;
  }

  async function initRealtime() {
    try {
      const { joinRoom } = await import("https://cdn.jsdelivr.net/npm/trystero/+esm");
      room = joinRoom({ appId: APP_ID, relayRedundancy: 5 }, roomId);

      const [send, get] = room.makeAction("state");
      const [sendPaintAction, getPaintAction] = room.makeAction("paint");
      sendState = send;
      sendPaint = sendPaintAction;

      room.onPeerJoin((peerId) => {
        if (sendState) broadcastState(peerId);
      });

      room.onPeerLeave((peerId) => {
        const remote = remotes.get(peerId);
        if (!remote) return;
        scene.remove(remote.mesh);
        remote.mesh.geometry.dispose();
        remote.mesh.material.dispose();
        if (remote.label && remote.label.material && remote.label.material.map) remote.label.material.map.dispose();
        if (remote.label && remote.label.material) remote.label.material.dispose();
        remotes.delete(peerId);
        updateBadge();
      });

      get((payload, peerId) => {
        if (!payload || !payload.id || payload.id === sessionId) return;

        const remoteName = sanitizeName(payload.n || `Player-${payload.id}`, `Player-${payload.id}`);
        let remote = remotes.get(peerId);
        if (!remote) remote = createRemoteBall(peerId, payload.id, remoteName);

        if (remote.name !== remoteName) {
          remote.name = remoteName;
          setNameSpriteText(remote.label, remoteName);
        }

        remote.netPos.set(payload.px || 0, payload.py || radius, payload.pz || 0);
        remote.netVel.set(payload.vx || 0, payload.vy || 0, payload.vz || 0);
        remote.netQuat.set(payload.qx || 0, payload.qy || 0, payload.qz || 0, payload.qw || 1);
        remote.netTs = payload.ts || Date.now();
        remote.lastSeen = performance.now();
      });

      getPaintAction((payload) => {
        if (!payload) return;
        paintAtWorld(payload.x || 0, payload.z || 0, payload.m === "erase" ? "erase" : "draw");
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
  let paintTick = 0;
  function broadcastState(targetPeerId) {
    if (!sendState) return;
    const payload = {
      id: sessionId,
      n: playerName,
      px: ball.position.x,
      py: ball.position.y,
      pz: ball.position.z,
      vx: velocity.x,
      vy: velocity.y,
      vz: velocity.z,
      qx: ball.quaternion.x,
      qy: ball.quaternion.y,
      qz: ball.quaternion.z,
      qw: ball.quaternion.w,
      ts: Date.now(),
    };
    if (targetPeerId) sendState(payload, targetPeerId);
    else sendState(payload);
  }

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
      velocity.y = Math.abs(velocity.y) > 0.2 ? -velocity.y * bounce : 0;
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
      const ageSec = Math.min(Math.max((Date.now() - remote.netTs) / 1000, 0), 0.35);
      const predicted = remote.netPos.clone().addScaledVector(remote.netVel, ageSec);
      const alpha = 1 - Math.exp(-18 * dt);
      remote.mesh.position.lerp(predicted, alpha);
      remote.mesh.quaternion.slerp(remote.netQuat, 1 - Math.exp(-14 * dt));

      if (performance.now() - remote.lastSeen > 30000) {
        scene.remove(remote.mesh);
        remote.mesh.geometry.dispose();
        remote.mesh.material.dispose();
        if (remote.label && remote.label.material && remote.label.material.map) remote.label.material.map.dispose();
        if (remote.label && remote.label.material) remote.label.material.dispose();
        stalePeers.push(peerId);
      }
    }
    for (const peerId of stalePeers) remotes.delete(peerId);
    if (stalePeers.length) updateBadge();

    const targetCam = new THREE.Vector3(ball.position.x, 8, ball.position.z + 11);
    camera.position.lerp(targetCam, 1 - Math.exp(-6 * dt));
    camera.lookAt(ball.position.x, radius * 0.7, ball.position.z);

    paintAtWorld(ball.position.x, ball.position.z, paintMode);
    paintTick += dt;
    if (sendPaint && paintTick > 1 / 20) {
      paintTick = 0;
      sendPaint({ x: ball.position.x, z: ball.position.z, m: paintMode });
    }

    netTick += dt;
    if (sendState && netTick > 1 / 20) {
      netTick = 0;
      broadcastState();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

startThree();
