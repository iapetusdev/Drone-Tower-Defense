/*
Hi people looking at the code :)

There's an easter egg in the code - see if you can find it
No, CMD-F doesn't work
If you find it and it looks wierd, that was for stopping CMD-F


To-do
- Add more comments/ fix the unnecessary THREEJS parts
- Imporve game length/how the gameplay works 
-Fix panning
- Remove HUD from the game when you click and it places a thing (what mom doesn't like)


*/


//THREEJS stuff
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 80, 520);

//Camera and the camera angle (What else did you think camera ment?)
const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.1, 2500); //wider frame of view
const camRig = new THREE.Group();
scene.add(camRig);
camRig.add(camera);

// angle
camera.position.set(0, 115, 170);
camera.lookAt(0, 0, 0);
let orbitYaw = 0;        //Orbit
const orbitSpeed = 1.8;  

//The accual rendering
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

//light
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const lightSource = new THREE.DirectionalLight(0xffffff, 0.9);//I thought this was funny, the things I used to learn THREEJS from wanted to use "sun" as where light was coming from. I perfer just having a lightsource, but it does sound wierd.
lightSource.position.set(160, 220, 120);// Move this around for light
scene.add(lightSource);

//the basics about the world
const ground = new THREE.Mesh(//Possibly confusing, "mesh" is anything 3d that THREEJS makes
  new THREE.PlaneGeometry(1100, 1100),
  new THREE.MeshStandardMaterial({ color: 0x141b33, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

//Core sphere that you defend
const CORE_R = 12;
const core = new THREE.Mesh(
  new THREE.SphereGeometry(CORE_R, 28, 20),
  new THREE.MeshStandardMaterial({
    color: 0x84a6ff,
    emissive: 0x203060,
    roughness: 0.35,
  })
);
core.position.y = CORE_R;
scene.add(core);

//The ring around the core

const coreRing = new THREE.Mesh(
  new THREE.RingGeometry(CORE_R * 2.4, CORE_R * 3.0, 56),
  new THREE.MeshBasicMaterial({
    color: 0x7aa2ff,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  })
);
coreRing.rotation.x = -Math.PI / 2;
coreRing.position.y = 0.06;
scene.add(coreRing);

//Connection for HUD and shop
const hud = document.getElementById("hud");
const shop = document.getElementById("shop");

//End of game pop-up that tells you that the game is over
const gameoverPopup = document.createElement("div");
gameoverPopup.id = "gameoverPopup";
gameoverPopup.innerHTML = `<div class="box" id="gameoverText"></div>`;
document.body.appendChild(gameoverPopup);

const gameoverText = gameoverPopup.querySelector("#gameoverText");
let gameOverShown = false;

function showGameOverPopup() {
  const survived = Math.floor(timeAlive);
  gameoverText.textContent = `They got to the center base.\n End of game.\nSurvived ${survived} seconds.\n\nPress R to restart.`;
  gameoverPopup.style.display = "flex";
  gameOverShown = true;
}

function hideGameOverPopup() {
  gameoverPopup.style.display = "none";
  gameOverShown = false;
}

//Varibles
let money = 30.0;//Starting money
let Bops = 0;
let gameOver = false;
let timeAlive = 0;

const enemies = [];   // {mesh, hp, maxHp, sp, wob, state,vy, spin, targetY}
const defenders = []; // defenders that are placed by the player (what else would they be??????)
const fires = [];   // {mesh, vx, vz, vy, life, dmg, splash, owner}
//Even though this is a fighting game, I'm a pacifist so fires and stuff like that are used instead of other words

//Spawning
let spawnBudget = 0;
let baseSpawnRate = 1.25; // per sec
let spawnGrowth = 1.015; // Bet you missed this, but the drones grow in numbers exponentrally
let maxSpawnRate = 30;//Just so things don't crash

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist2(x1, z1, x2, z2) { const dx = x1 - x2, dz = z1 - z2; return dx * dx + dz * dz; }

// Defenders
const defender_TYPES = [
  { key: "1", name: "SIMPLE", cost: 7,  range: 100,  fireDelay: 0.3, dmg: 3, splash: 0 },//As for the strengths and weaknesses of the defenders, I kinda just thought of a number and did that number. I'll probably update it, but basically very little time was spent balencing powers. I purposely made simple really good, though. Maybe I sould add more. 
  { key: "2", name: "RAPID",  cost: 12, range: 75,  fireDelay: 0.1, dmg: 2, splash: 0 },
  { key: "3", name: "SNIPER", cost: 17, range: 200, fireDelay: 0.5, dmg: 9, splash: 0 },
  { key: "4", name: "CANNON", cost: 22, range: 125, fireDelay: 0.75, dmg: 6, splash: 40 }
];//The keys are for navigating through the keyboard

let selectedIndex = 0;

function getSelectedList() {//Atribute names are sometime so wierd, I like doing textSecondText when naming stuff, but sometimes it looks wierd. Like who likes "getSelectedList". Sounds really boring
  return defender_TYPES;
}


const shopEls = [];

function buildShopIfNeeded() {
  const list = getSelectedList();
  if (shopEls.length === list.length) return;

  shop.innerHTML = "";
  shopEls.length = 0;

  for (let i = 0; i < list.length; i++) {
    const el = document.createElement("div");
    el.className = "shopItem";
    el.addEventListener("click", () => {
      selectedIndex = i;
      updateShopUI();
    });
    shop.appendChild(el);
    shopEls.push(el);
  }
}

function updateShopUI() {
  const list = getSelectedList();
  buildShopIfNeeded();

  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    const el = shopEls[i];

    el.classList.toggle("selected", i === selectedIndex);
    el.classList.toggle("disabled", money + 1e-9 < t.cost);

    const dps = (t.dmg / t.fireDelay).toFixed(1);
    el.textContent =
      `${t.name}  ($${t.cost})\n` +
      `Range ${t.range}  DPS ${dps}` +
      (t.splash > 0 ? `  Splash ${t.splash}` : "");
  }
}


function createEnemyDrone(colorHex) {
  const g = new THREE.Group();


  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.55,
    emissive: 0x110014
  });

  //Rest of this is the THREEJS 3d build
  //I'm sorry to admit this, but a lot of the shapes were trial and error

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 6.5, 6, 12), bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.6;
  g.add(body);

  const camMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.35 });
  const camPod = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 6.5, 16), camMat);
  camPod.rotation.x = Math.PI / 2;
  camPod.position.set(0, -0.4, -3.5);
  g.add(camPod);

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 16),
    new THREE.MeshBasicMaterial({ color: 0x1b3a66 })
  );
  lens.position.set(0, -0.4, -6.8);
  lens.rotation.y = Math.PI;
  g.add(lens);


  const armMat = new THREE.MeshStandardMaterial({ color: 0x30384a, roughness: 0.9 });
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 2.0), armMat);
  arm1.position.y = 0.6;
  g.add(arm1);

  const arm2 = arm1.clone();
  arm2.rotation.y = Math.PI / 2;
  g.add(arm2);

  const rotorHubMat = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.8 });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x2b6cff, // “blue blade” look
    roughness: 0.25,
    emissive: 0x061020,
    emissiveIntensity: 0.8
  });

  const hubGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 12);
  const bladeGeo = new THREE.BoxGeometry(8.0, 0.18, 1.2);

  const rotors = [];
  const rotorPositions = [
    [ 9.0, 1.2,  0.0],
    [-9.0, 1.2,  0.0],
    [ 0.0, 1.2,  9.0],
    [ 0.0, 1.2, -9.0],
  ];

  for (const [x,y,z] of rotorPositions) {
    const r = new THREE.Group();
    r.position.set(x, y, z);

    const hub = new THREE.Mesh(hubGeo, rotorHubMat);
    r.add(hub);

    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.35;
    r.add(blade);

    //Second rotor blade rotated 90°
    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    r.add(blade2);

    g.add(r);
    rotors.push(r);
  }

  g.userData.rotors = rotors;
  // random per-drone spin speed
  g.userData.rotorSpin = 12 + Math.random() * 8;

  return g;
}


function createdefenderDrone(colorHex) {
  const g = new THREE.Group();

  // Body (slightly cleaner + “camera pod”)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.45,
    emissive: 0x061020
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(3.0, 6.0, 6, 12), bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.7;
  g.add(body);

  const camMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.35 });
  const camPod = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6.0, 16), camMat);
  camPod.rotation.x = Math.PI / 2;
  camPod.position.set(0, -0.2, -3.2);
  g.add(camPod);

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 16),
    new THREE.MeshBasicMaterial({ color: 0x2a4b88 })
  );
  lens.position.set(0, -0.2, -6.2);
  lens.rotation.y = Math.PI;
  g.add(lens);

  // Arms (cross)
  const armMat = new THREE.MeshStandardMaterial({ color: 0x2a3555, roughness: 0.9 });
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 2.0), armMat);
  arm1.position.y = 0.7;
  g.add(arm1);

  const arm2 = arm1.clone();
  arm2.rotation.y = Math.PI / 2;
  g.add(arm2);

  // Rotors + blue blades
  const rotorHubMat = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.8 });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x2b6cff,
    roughness: 0.25,
    emissive: 0x061020,
    emissiveIntensity: 0.9
  });

  const hubGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 12);
  const bladeGeo = new THREE.BoxGeometry(8.2, 0.18, 1.2);

  const rotors = [];
  const rotorPositions = [
    [ 9.0, 1.3,  0.0],
    [-9.0, 1.3,  0.0],
    [ 0.0, 1.3,  9.0],
    [ 0.0, 1.3, -9.0],
  ];

  for (const [x,y,z] of rotorPositions) {
    const r = new THREE.Group();
    r.position.set(x, y, z);

    const hub = new THREE.Mesh(hubGeo, rotorHubMat);
    r.add(hub);

    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.35;
    r.add(blade);

    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    r.add(blade2);

    g.add(r);
    rotors.push(r);
  }

  // store for animation
  g.userData.rotors = rotors;
  g.userData.rotorSpin = 16; 

  return g;
}


function createfireMesh(isCannon) {
  if (isCannon) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffc06a })
    );
  }
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xa0b0ff })
  );
}


//Spawning
function updateSpawn(dt) {
  const rate = clamp(baseSpawnRate * Math.pow(spawnGrowth, timeAlive), 0, maxSpawnRate);
  spawnBudget += rate * dt;

  let safety = 0;
  while (spawnBudget >= 1 && safety < 12) {
    spawnBudget -= 1;
    safety++;
    spawnEnemy();
  }
}

function spawnEnemy() {
  const a = Math.random() * Math.PI * 2;
  const R = 290 + Math.random() * 30;
  const x = Math.cos(a) * R;
  const z = Math.sin(a) * R;

  const diff = clamp(1 + timeAlive, 1, 100);
  const maxHp = 12 + diff * 0.75;
  const sp = 15 + diff * 0.07;

  const hardness = clamp(diff / 100, 0, 1);
  const col = new THREE.Color().lerpColors(
    new THREE.Color(0x78ebbe),
    new THREE.Color(0xff5a78),
    hardness
  );

  const mesh = createEnemyDrone(col.getHex());

  //Where enemies spawn
  const startY = (Math.random() < 0.55) ? (55 + Math.random() * 70) : (18 + Math.random() * 12);
  const targetY = 18 + Math.random() * 6;

  mesh.position.set(x, startY, z);
  scene.add(mesh);

  enemies.push({
    mesh,
    hp: maxHp,
    maxHp,
    sp,
    wob: Math.random() * 1000,
    state: "alive",
    vy: 0,
    spin: (Math.random() * 2 - 1) * 2.0,
    targetY
  });
}

//Enemies
function canPlacedefender(x, z) {
  if (x * x + z * z < (CORE_R + 34) * (CORE_R + 34)) return false;
  for (let i = 0; i < defenders.length; i++) {
    const a = defenders[i];
    if (dist2(x, z, a.mesh.position.x, a.mesh.position.z) < 22 * 22) return false;
  }
  return true;
}

function findClosestEnemy(x, z, range) {
  let best = -1;
  let bestD2 = range * range;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.state !== "alive") continue;
    const d2 = dist2(x, z, e.mesh.position.x, e.mesh.position.z);
    if (d2 <= bestD2) { bestD2 = d2; best = i; }
  }
  return best;
}

function shoot(att, enemy) {
  const bx = att.mesh.position.x;
  const by = att.mesh.position.y;
  const bz = att.mesh.position.z;

  const ex = enemy.mesh.position.x;
  const ey = enemy.mesh.position.y;
  const ez = enemy.mesh.position.z;

  const dx = ex - bx;
  const dy = (ey - by) * 0.15; // mild vertical lead
  const dz = ez - bz;
  const d = Math.hypot(dx, dz) + 1e-6;

  const isCannon = att.splash > 0;
  const speed = isCannon ? 70 : 95;

  const b = createfireMesh(isCannon);
  b.position.set(bx, by - 2, bz);
  scene.add(b);

  fires.push({
    mesh: b,
    vx: (dx / d) * speed,
    vy: dy * speed,
    vz: (dz / d) * speed,
    life: isCannon ? 1.7 : 1.3,
    dmg: att.dmg,
    splash: att.splash,
    owner: att
  });
}

//Drift (this is what I might need to change)
function updatedefenders(dt) {
  for (let i = 0; i < defenders.length; i++) {
    const a = defenders[i];

    // hover bob (always)
    a.hoverT += dt;
    a.mesh.position.y = a.baseY + Math.sin(a.hoverT * 4.5) * 1.2;

    a.cd -= dt;
    if (a.cd > 0) continue;

    const idx = findClosestEnemy(a.mesh.position.x, a.mesh.position.z, a.range);

    // no enemies => idle drift
    if (idx < 0) {
      a.idleT += dt * a.idleSpeed;

      const ox = Math.sin(a.idleT * 1.7) * a.idleRadius;
      const oz = Math.cos(a.idleT * 1.1) * a.idleRadius * 0.8;

      const targetX = a.homeX + ox;
      const targetZ = a.homeZ + oz;

      // smooth “approach” without snapping
      const s = 1 - Math.pow(0.001, dt);
      a.mesh.position.x += (targetX - a.mesh.position.x) * s;
      a.mesh.position.z += (targetZ - a.mesh.position.z) * s;

      // gentle yaw while idle
      a.mesh.rotation.y += 0.35 * dt;
      continue;
    }

    // has a target
    const e = enemies[idx];

    // ease back to home while fighting (so wandering never drifts away forever)
    const r = 1 - Math.pow(0.02, dt);
    a.mesh.position.x += (a.homeX - a.mesh.position.x) * r;
    a.mesh.position.z += (a.homeZ - a.mesh.position.z) * r;

    // face target
    const dx = e.mesh.position.x - a.mesh.position.x;
    const dz = e.mesh.position.z - a.mesh.position.z;
    a.mesh.rotation.y = Math.atan2(dx, dz);

    shoot(a, e);
    a.cd = a.fireDelay;
  }
}

//Hits
function damageEnemy(e, dmg) {
  if (e.state !== "alive") return false;
  e.hp -= dmg;
  if (e.hp <= 0) {
    e.hp = 0;
    BopEnemy(e);
    return true;
  }
  return false;
}


//Bop is a euphemism for kill, I'm a pacifist but still coded a fighting game 
function BopEnemy(e) {
  if (e.state !== "alive") return;
  e.state = "dying";
  e.vy = 0;
  e.mesh.rotation.x = (Math.random() * 0.8 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
  e.mesh.rotation.z = (Math.random() * 0.8 + 0.2) * (Math.random() < 0.5 ? -1 : 1);

  Bops++;
  money += timeAlive/Bops;//Getting money per bop
}

function updatefires(dt) {
  for (let i = fires.length - 1; i >= 0; i--) {
    const b = fires[i];
    b.life -= dt;

    b.mesh.position.x += b.vx * dt;
    b.mesh.position.y += b.vy * dt;
    b.mesh.position.z += b.vz * dt;

    // collision (simple sphere)
    let hit = null;
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (e.state !== "alive") continue;
      const dx = b.mesh.position.x - e.mesh.position.x;
      const dz = b.mesh.position.z - e.mesh.position.z;
      if (dx * dx + dz * dz < 11 * 11) { hit = e; break; }
    }

    if (hit) {
      if (b.splash > 0) {
        // splash
        const r2 = b.splash * b.splash;
        const cx = hit.mesh.position.x;
        const cz = hit.mesh.position.z;
        for (let j = 0; j < enemies.length; j++) {
          const e2 = enemies[j];
          if (e2.state !== "alive") continue;
          if (dist2(cx, cz, e2.mesh.position.x, e2.mesh.position.z) <= r2) {
            damageEnemy(e2, b.dmg);
            var totalPlay /*E ast er e g g*/ = 17
          }
        }
      } else {
        damageEnemy(hit, b.dmg);
      }

      scene.remove(b.mesh);
      fires.splice(i, 1);
      continue;
    }

    if (b.life <= 0 || b.mesh.position.y < -50) {
      scene.remove(b.mesh);
      fires.splice(i, 1);
    }
  }
}

//  Enemies 
function updateEnemies(dt) {
  const gravity = 95; // fall speed accel

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const p = e.mesh.position;

    if (e.state === "alive") {
      // descend to target flight height if spawned high
      const dy = e.targetY - p.y;
      p.y += clamp(dy, -40 * dt, 40 * dt);

      // steer toward core with a little wobble
      const dx = -p.x;
      const dz = -p.z;
      const d = Math.hypot(dx, dz) + 1e-6;

      const wob = Math.sin((timeAlive * 2.1) + e.wob) * 0.22;
      const tx = (dx / d) + wob * (dz / d);
      const tz = (dz / d) - wob * (dx / d);

      p.x += tx * e.sp * dt;
      p.z += tz * e.sp * dt;

      // face movement
      e.mesh.rotation.y = Math.atan2(tx, tz);

      // rotor spin
      const rs = e.mesh.userData.rotorSpin || 14;
      const rotors = e.mesh.userData.rotors;
      if (rotors) {
        for (let k = 0; k < rotors.length; k++) {
          rotors[k].rotation.y += rs * dt * (k % 2 === 0 ? 1 : -1);
      }
    }


      // lose condition (use ground-plane distance)
      if (d < CORE_R + 3) {
        gameOver = true;
        if (!gameOverShown) showGameOverPopup();
      }
    } else {
      ///The drones falling out of the sky :)
      e.vy -= gravity * dt;
      p.y += e.vy * dt;

      e.mesh.rotation.y += e.spin * dt;
      e.mesh.rotation.x += (e.spin * 0.7) * dt;
      e.mesh.rotation.z += (e.spin * 0.9) * dt;

      if (p.y < -120) {
        scene.remove(e.mesh);
        enemies.splice(i, 1);
      }
    }
  }
}

//The panning/moving which isn't really working

const keys = Object.create(null);
addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

addEventListener("wheel", (e) => {
  camera.position.y = clamp(camera.position.y + e.deltaY * 0.06, 45, 260);
  camera.position.z = clamp(camera.position.z + e.deltaY * 0.10, 70, 420);
}, { passive: true });

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function screenToGround(clientX, clientY) {
  mouse.x = (clientX / innerWidth) * 2 - 1;
  mouse.y = -(clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(ground, false);
  return hits.length ? hits[0].point : null;
}

let dragging = false;
let dragStartWorld = null;
let rigStart = new THREE.Vector3();

//Event listeners
//Yeah I love that they are called that

addEventListener("pointerdown", (ev) => {
  // Right/middle: pan drag
  if (ev.button === 2 || ev.button === 1) {
    dragging = true;
    dragStartWorld = screenToGround(ev.clientX, ev.clientY);
    rigStart.copy(camRig.position);
    return;
  }

  if (gameOver) return;

  const list = getSelectedList();
  const def = list[selectedIndex];

  // money check
  if (money + 1e-9 < def.cost) return;

  const p = screenToGround(ev.clientX, ev.clientY);
  if (!p) return;

  if (!canPlacedefender(p.x, p.z)) return;

  const colorByType = [0xbfd5ff, 0x9cffd6, 0xffa6c2, 0xffc06a][selectedIndex] || 0xbfd5ff;

  const mesh = createdefenderDrone(colorByType);
  mesh.position.set(p.x, 18, p.z); // hover height
  scene.add(mesh);

  defenders.push({
    mesh,
    range: def.range,
    fireDelay: def.fireDelay,
    cd: 0,
    dmg: def.dmg,
    splash: def.splash,

    baseY: 18,
    hoverT: Math.random() * 10,

    // idle drift home + tuning
    homeX: p.x,
    homeZ: p.z,
    idleT: Math.random() * 1000,
    idleSpeed: 0.6 + Math.random() * 0.8,
    idleRadius: 2.0 + Math.random() * 2.5
  });

  money -= def.cost;
  updateShopUI();
});

addEventListener("pointermove", (ev) => {
  if (!dragging) return;
  const nowWorld = screenToGround(ev.clientX, ev.clientY);
  if (!dragStartWorld || !nowWorld) return;

  const dx = dragStartWorld.x - nowWorld.x;
  const dz = dragStartWorld.z - nowWorld.z;
  camRig.position.set(
    clamp(rigStart.x + dx, -260, 260),
    0,
    clamp(rigStart.z + dz, -260, 260)
  );
});

addEventListener("pointerup", () => { dragging = false; dragStartWorld = null; });

/* prevent browser context menu so right-drag works */
addEventListener("contextmenu", (e) => e.preventDefault());

//Panning
function updateKeyboardPan(dt) {
  const pan = 120 * dt;

  //This didn't really work with rotating
  let mx = 0, mz = 0;//Moving around
  if (keys["a"] || keys["arrowleft"])  mx -= pan;
  if (keys["d"] || keys["arrowright"]) mx += pan;
  if (keys["w"] || keys["arrowup"])    mz -= pan;
  if (keys["s"] || keys["arrowdown"])  mz += pan;

  camRig.position.x = clamp(camRig.position.x + mx, -260, 260);
  camRig.position.z = clamp(camRig.position.z + mz, -260, 260);


  // Use Q/E to rotate around the current rig center
  if (keys["q"]) orbitYaw += orbitSpeed * dt;
  if (keys["e"]) orbitYaw -= orbitSpeed * dt;

  // (optional) also allow Shift + A/D to rotate
  if (keys["shift"] && keys["a"]) orbitYaw += orbitSpeed * dt;
  if (keys["shift"] && keys["d"]) orbitYaw -= orbitSpeed * dt;

  // --- Apply orbit: camera circles around the rig ---
  const r = camera.position.z; // keep your current zoom radius
  camera.position.x = Math.sin(orbitYaw) * r;
  camera.position.z = Math.cos(orbitYaw) * r;

 
  camera.lookAt(camRig.position.x, 0, camRig.position.z);
}


//Select type keys 1-4 + restart
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const list = getSelectedList();

  for (let i = 0; i < list.length; i++) {
    if (k === list[i].key) {
      selectedIndex = i;
      updateShopUI();
    }
  }

  if (k === "r") restart();
});

//When startinf a new game
function restart() {
  for (const e of enemies) scene.remove(e.mesh);
  for (const a of defenders) scene.remove(a.mesh);
  for (const b of fires) scene.remove(b.mesh);

  enemies.length = 0;
  defenders.length = 0;
  fires.length = 0;

  money = 30.0;//Restart money, make sure it's the same as above
  Bops = 0;
  gameOver = false;
  timeAlive = 0;
  spawnBudget = 0;
  camRig.position.set(0, 0, 0);

  hideGameOverPopup();
  updateShopUI();
}

updateShopUI();

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (!gameOver) {
    timeAlive += dt;
    updateSpawn(dt);
    updateEnemies(dt);
    updatedefenders(dt);
    updatefires(dt);
  } else {
    //still let dying drones fall
    updateEnemies(dt);
    updatefires(dt);
  }

  updateKeyboardPan(dt);

  const list = getSelectedList();
  const def = list[selectedIndex];

  hud.textContent =
    (gameOver ? "GAME OVER — press R to restart\n" : "") +
    "Selected: " + def.name + " ($" + def.cost + ")\n" +
    "Money $" + money.toFixed(1) +
    "  Bops " + Bops +
    "  Time " + Math.floor(timeAlive) + "s\n" +
    "Defenders " + defenders.length +
    "  Enemies " + enemies.length +
    "  Fires " + fires.length;

  // keep shop disabled/selected states accurate as money changes
  updateShopUI();

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

//Resizing when the screen is changed mid-game

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

//Yay! 850 lines of code!
