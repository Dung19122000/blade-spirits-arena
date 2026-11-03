const socket = io();

const CHARACTERS = {
  ember: { key:'ember', name:'Hỏa Vệ', title:'Kiếm sĩ bùng nổ', color:0xff7043, accent:'#ff7043', hp:145, desc:'Áp sát mạnh, chém nặng và tuyệt kỹ gây sát thương lớn phía trước.' },
  tide: { key:'tide', name:'Thủy Ảnh', title:'Vệ sĩ ổn định', color:0x4fc3f7, accent:'#4fc3f7', hp:175, desc:'Máu cao, trụ giao tranh tốt, hợp chế độ săn Boss.' },
  storm: { key:'storm', name:'Lôi Phong', title:'Tốc độ sấm chớp', color:0xffd54f, accent:'#ffd54f', hp:135, desc:'Lao lướt nhanh, rất linh hoạt trong PvP.' },
  blossom: { key:'blossom', name:'Hoa Kiếm', title:'Mỹ kiếm sĩ', color:0xf48fb1, accent:'#f48fb1', hp:150, desc:'Tuyệt kỹ quét rộng, giao tranh khu vực mạnh.' },
  frost: { key:'frost', name:'Băng Tinh', title:'Phong cách lạnh lùng', color:0x8de3ff, accent:'#8de3ff', hp:160, desc:'Cân bằng giữa sát thương và phòng thủ.' },
  eclipse: { key:'eclipse', name:'Dạ Kiếm', title:'Bóng đêm tinh luyện', color:0xb39ddb, accent:'#b39ddb', hp:142, desc:'Đòn kết thúc sắc bén, phong cách ám ảnh.' }
};

let selectedCharacter = 'ember';
let selectedMode = 'pvp';
let roomState = null;
let joined = false;
let localId = null;
let feedTimeouts = [];
const keys = {};

const ui = {
  overlay: document.getElementById('overlay'),
  nameInput: document.getElementById('nameInput'),
  roomInput: document.getElementById('roomInput'),
  joinBtn: document.getElementById('joinBtn'),
  startBtn: document.getElementById('startBtn'),
  statusText: document.getElementById('statusText'),
  scoreboard: document.getElementById('scoreboard'),
  hpBar: document.getElementById('hpBar'),
  xpBar: document.getElementById('xpBar'),
  hpText: document.getElementById('hpText'),
  levelText: document.getElementById('levelText'),
  playerName: document.getElementById('playerName'),
  playerClass: document.getElementById('playerClass'),
  roomText: document.getElementById('roomText'),
  modeText: document.getElementById('modeText'),
  bossText: document.getElementById('bossText'),
  characterStrip: document.getElementById('characterStrip'),
  characterDetail: document.getElementById('characterDetail'),
  feed: document.getElementById('feed')
};

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMode = btn.dataset.mode;
    ui.modeText.textContent = selectedMode === 'boss' ? 'Co-op Săn Boss' : 'PvP Arena';
  });
});

ui.joinBtn.addEventListener('click', () => {
  socket.emit('joinRoom', {
    roomCode: ui.roomInput.value || 'DUNG01',
    name: ui.nameInput.value || 'Kiếm sĩ',
    characterId: selectedCharacter,
    mode: selectedMode
  });
  ui.statusText.textContent = 'Đang vào phòng...';
  joined = true;
});
ui.startBtn.addEventListener('click', () => socket.emit('startMatch'));

function toast(text){
  const div = document.createElement('div');
  div.className = 'feed-msg';
  div.textContent = text;
  ui.feed.prepend(div);
  const t = setTimeout(()=> div.remove(), 3600);
  feedTimeouts.push(t);
}

socket.on('connect', () => { localId = socket.id; toast('Đã kết nối máy chủ.'); });
socket.on('messageLog', msg => toast(msg));
socket.on('roomState', state => {
  roomState = state;
  ui.roomText.textContent = `Room: ${state.code}`;
  ui.modeText.textContent = state.mode === 'boss' ? 'Co-op Săn Boss' : 'PvP Arena';
  ui.statusText.textContent = `Phòng ${state.code} • ${state.players.length} người chơi`;
  if (joined) ui.overlay.style.display = 'none';
  updateScoreboard();
});

function updateScoreboard(){
  if (!roomState) return;
  const sorted = [...roomState.players].sort((a,b)=> (b.score - a.score) || (b.level - a.level));
  ui.scoreboard.innerHTML = '';
  sorted.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'score-line';
    row.innerHTML = `<div class="rank">${idx+1}</div><div><div>${p.name}</div><small>${CHARACTERS[p.characterId]?.name || 'Kiếm sĩ'} • Lv.${p.level}</small></div><div>${p.score} K</div>`;
    ui.scoreboard.appendChild(row);
  });
}

// Character picker UI
Object.values(CHARACTERS).forEach(ch => {
  const btn = document.createElement('button');
  btn.className = 'char-card' + (ch.key === selectedCharacter ? ' active' : '');
  btn.innerHTML = `<strong>${ch.name}</strong><small>${ch.title}</small>`;
  btn.addEventListener('click', () => {
    selectedCharacter = ch.key;
    [...ui.characterStrip.children].forEach(c=>c.classList.remove('active'));
    btn.classList.add('active');
    updateCharacterDetail();
    buildPreviewCharacter();
  });
  ui.characterStrip.appendChild(btn);
});

function updateCharacterDetail(){
  const c = CHARACTERS[selectedCharacter];
  ui.characterDetail.innerHTML = `<strong style="color:${c.accent}">${c.name}</strong><br>${c.desc}<br><br>HP cơ bản: <strong>${c.hp}</strong><br>Phong cách: <strong>${c.title}</strong>`;
}
updateCharacterDetail();

// Three.js main game scene
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a1221, 35, 120);
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 12, 16);

const hemi = new THREE.HemisphereLight(0xa9c8ff, 0x061018, 0.85);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xd8e4ff, 1.45);
moon.position.set(18, 28, 12);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -70; moon.shadow.camera.right = 70; moon.shadow.camera.top = 70; moon.shadow.camera.bottom = -70;
scene.add(moon);

const ambientParticles = [];
const actors = new Map();
let bossActor = null;
let healActors = new Map();
let shrineGroup = null;
let previewScene, previewCamera, previewRenderer, previewRoot;

function makeGradientSky(){
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(160, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { topColor: { value: new THREE.Color(0x253a6b) }, bottomColor: { value: new THREE.Color(0x050912) } },
      vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + vec3(0.0, 18.0, 0.0)).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), 1.2),0.0)), 1.0); }`
    })
  );
  scene.add(sky);
  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 24), new THREE.MeshBasicMaterial({ color:0xf2f6ff }));
  moonMesh.position.set(-34, 35, -70);
  scene.add(moonMesh);
}
makeGradientSky();

function makeGround(){
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(60, 64),
    new THREE.MeshStandardMaterial({ color:0x122232, roughness:0.98, metalness:0.02 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(12, 15, 64),
    new THREE.MeshStandardMaterial({ color:0x4b1c2b, roughness:0.7, metalness:0.2, emissive:0x220611 })
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.02;
  scene.add(ring);

  for (let i=0;i<7;i++) {
    const lantern = makeLantern();
    const angle = i / 7 * Math.PI * 2;
    lantern.position.set(Math.cos(angle)*26, 0, Math.sin(angle)*26);
    scene.add(lantern);
  }

  shrineGroup = new THREE.Group();
  for(let side=-1; side<=1; side+=2){
    const bamboo = new THREE.Group();
    for(let i=0;i<12;i++){
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.22, rand(4,6.8), 8), new THREE.MeshStandardMaterial({ color:0x355c3d, roughness:1 }));
      stem.position.set(rand(0,4)*side + rand(-.8,.8), stem.geometry.parameters.height/2, -24 + rand(-7,7));
      stem.castShadow = true; stem.receiveShadow = true;
      bamboo.add(stem);
    }
    shrineGroup.add(bamboo);
  }
  const torii = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color:0x993333, roughness:0.65, metalness:0.15 });
  const post1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8, 1.1), redMat); post1.position.set(-7,4,-22);
  const post2 = post1.clone(); post2.position.x = 7;
  const cross1 = new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, 1.5), redMat); cross1.position.set(0,7.2,-22);
  const cross2 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 1.8), redMat); cross2.position.set(0,8.2,-22);
  [post1,post2,cross1,cross2].forEach(m=>{m.castShadow=true; m.receiveShadow=true; torii.add(m);});
  shrineGroup.add(torii);
  scene.add(shrineGroup);

  const petals = new THREE.BufferGeometry();
  const petalCount = 220;
  const positions = new Float32Array(petalCount * 3);
  for (let i=0;i<petalCount;i++){
    positions[i*3] = rand(-48,48);
    positions[i*3+1] = rand(1,16);
    positions[i*3+2] = rand(-48,48);
  }
  petals.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pts = new THREE.Points(petals, new THREE.PointsMaterial({ color:0xffc7d8, size:0.22, transparent:true, opacity:0.8 }));
  pts.userData.isPetals = true;
  scene.add(pts);
  ambientParticles.push(pts);
}
function makeLantern(){
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,4.2,8), new THREE.MeshStandardMaterial({ color:0x303848, roughness:1 }));
  post.position.y = 2.1;
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.1,1.6,1.1), new THREE.MeshStandardMaterial({ color:0xffd8a4, emissive:0xffb56b, emissiveIntensity:1.1 }));
  lamp.position.y = 4.4;
  const halo = new THREE.PointLight(0xffc175, 1.6, 12, 2);
  halo.position.y = 4.4;
  g.add(post, lamp, halo);
  return g;
}
makeGround();

function makeCircularAura(color, radius = 1.6) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - .08, radius, 32),
    new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.55, side:THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.05;
  return ring;
}

function buildCharacterMesh(key){
  const ch = CHARACTERS[key] || CHARACTERS.ember;
  const g = new THREE.Group();
  g.userData.swing = 0;
  const bodyMat = new THREE.MeshStandardMaterial({ color: ch.color, roughness:.55, metalness:.18 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a2330, roughness:.75 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf6d3bf, roughness:.95 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x10131c, roughness:1 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.05,1.55,.8), bodyMat);
  torso.position.y = 2.45;
  torso.castShadow = true;
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.5,0.12), dark);
  chestPlate.position.set(0,2.55,0.47);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 22, 22), skin);
  head.position.y = 3.7; head.castShadow = true;
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16, 0, Math.PI*2, 0, Math.PI/1.6), hair);
  hairCap.position.set(0,3.82,0);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(.42,.07,8,24), bodyMat);
  scarf.position.set(0,3.06,0); scarf.rotation.x = Math.PI/2;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(.05,8,8), new THREE.MeshBasicMaterial({ color:0xffffff })); eyeL.position.set(-.16,3.74,.38);
  const eyeR = eyeL.clone(); eyeR.position.x = .16;

  const leftArm = new THREE.Group(); const rightArm = new THREE.Group();
  const leftLeg = new THREE.Group(); const rightLeg = new THREE.Group();
  const upperArmGeo = new THREE.CylinderGeometry(.16,.18,.85,8);
  const lowerArmGeo = new THREE.CylinderGeometry(.12,.13,.7,8);
  const legGeo = new THREE.CylinderGeometry(.16,.18,1.1,8);
  function makeLimb(group, upperGeo, lowerGeo, side = 1){
    const upper = new THREE.Mesh(upperGeo, bodyMat);
    upper.position.y = -.42;
    const lower = new THREE.Mesh(lowerGeo, dark);
    lower.position.y = -1.08;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.11,10,10), skin);
    hand.position.y = -1.42;
    [upper, lower, hand].forEach(m => { m.castShadow=true; });
    group.add(upper, lower, hand);
    group.position.set(side * .72, 2.92, 0);
  }
  function makeLeg(group, side=1){
    const leg = new THREE.Mesh(legGeo, dark); leg.position.y = -.55; leg.castShadow=true;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(.13,.14,.95,8), dark); shin.position.y = -1.43; shin.castShadow=true;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.28,.18,.58), bodyMat); foot.position.set(0,-1.94,.13); foot.castShadow=true;
    group.add(leg, shin, foot); group.position.set(side*.34,1.5,0);
  }
  makeLimb(leftArm, upperArmGeo, lowerArmGeo, -1);
  makeLimb(rightArm, upperArmGeo, lowerArmGeo, 1);
  makeLeg(leftLeg, -1);
  makeLeg(rightLeg, 1);

  const cloak = new THREE.Mesh(new THREE.CylinderGeometry(.75, 1.2, 1.8, 12, 1, true), new THREE.MeshStandardMaterial({ color: new THREE.Color(ch.color).multiplyScalar(.7), roughness:.75, side:THREE.DoubleSide }));
  cloak.position.set(0,2.25,-.25);
  cloak.rotation.x = .05;

  const swordGroup = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.6, .18), new THREE.MeshStandardMaterial({ color:0xc8f1ff, emissive: ch.color, emissiveIntensity:.28, metalness:.9, roughness:.18 }));
  blade.position.y = -0.95;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(.36,.08,.26), bodyMat); guard.position.y = -0.12;
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.55,8), dark); hilt.position.y = .2;
  swordGroup.add(blade, guard, hilt);
  swordGroup.position.set(.88,2.92,0);
  swordGroup.rotation.z = .35;

  const aura = makeCircularAura(ch.color);
  const healAura = makeCircularAura(0x5cffb8, 1.35); healAura.visible = false;
  const slash = new THREE.Mesh(new THREE.TorusGeometry(1.5, .07, 8, 40, Math.PI*0.95), new THREE.MeshBasicMaterial({ color: ch.color, transparent:true, opacity:0 }));
  slash.rotation.x = Math.PI/2; slash.position.y = 1.8;

  g.add(torso, chestPlate, head, hairCap, eyeL, eyeR, scarf, cloak, leftArm, rightArm, leftLeg, rightLeg, swordGroup, aura, healAura, slash);
  g.userData = { leftArm, rightArm, leftLeg, rightLeg, swordGroup, slash, aura, healAura, cloak, bodyColor: ch.color, label: ch.name };
  return g;
}

function createNameSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(8,14,26,.74)';
  ctx.roundRect?.(8,10,240,42,14);
  if(!ctx.roundRect){ ctx.fillRect(8,10,240,42); }
  ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = '600 24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 31);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map:texture, transparent:true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.8, .95, 1);
  return sprite;
}

function syncActors() {
  if (!roomState) return;
  const aliveIds = new Set();
  roomState.players.forEach(p => {
    aliveIds.add(p.id);
    let actor = actors.get(p.id);
    if (!actor) {
      const root = buildCharacterMesh(p.characterId);
      root.position.set(p.x, 0, p.z);
      root.castShadow = true;
      const label = createNameSprite(p.name);
      label.position.y = 5.2;
      root.add(label);
      root.userData.target = { x:p.x, z:p.z, rot:p.rot };
      scene.add(root);
      actors.set(p.id, { mesh: root, label, state:'idle', remote: p.id !== localId });
      if (p.id === localId) toast('Đã vào trận. Chúc Dũng chiến thắng!');
    }
    actor = actors.get(p.id);
    actor.target = p;
  });
  for (const [id, actor] of actors.entries()) {
    if (!aliveIds.has(id)) { scene.remove(actor.mesh); actors.delete(id); }
  }
  syncBoss(); syncPickups();
}

function syncBoss(){
  if (!roomState) return;
  if (roomState.mode === 'boss' && roomState.boss) {
    if (!bossActor) {
      bossActor = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.9, 4.8, 18), new THREE.MeshStandardMaterial({ color:0x5b2234, emissive:0x290815, emissiveIntensity:.55, roughness:.6 }));
      body.position.y = 2.6; body.castShadow = true;
      const mask = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 24), new THREE.MeshStandardMaterial({ color:0xf6ece5, roughness:.9 }));
      mask.position.set(0,4.8,.15); mask.castShadow = true;
      const horn1 = new THREE.Mesh(new THREE.ConeGeometry(.36,1.35,12), new THREE.MeshStandardMaterial({ color:0x1d0f17 })); horn1.position.set(-.62,5.55,-.1); horn1.rotation.z = .4;
      const horn2 = horn1.clone(); horn2.position.x = .62; horn2.rotation.z = -.4;
      const aura = makeCircularAura(0xff5871, 2.8);
      bossActor.add(body, mask, horn1, horn2, aura);
      scene.add(bossActor);
    }
    const b = roomState.boss;
    bossActor.position.set(b.x, 0, b.z);
    bossActor.rotation.y = b.rot;
    bossActor.children[4].material.opacity = b.rage ? .9 : .45;
    ui.bossText.classList.remove('boss-hidden');
    ui.bossText.textContent = `Boss • Wave ${roomState.bossWave} • HP ${b.hp}/${b.maxHp}`;
  } else {
    if (bossActor) { scene.remove(bossActor); bossActor = null; }
    ui.bossText.classList.add('boss-hidden');
  }
}

function syncPickups(){
  if (!roomState) return;
  const ids = new Set();
  roomState.pickups.forEach(item => {
    ids.add(item.id);
    let mesh = healActors.get(item.id);
    if (!mesh) {
      const g = new THREE.Group();
      const orb = new THREE.Mesh(new THREE.SphereGeometry(.55, 18, 18), new THREE.MeshStandardMaterial({ color:0x5cffb8, emissive:0x1ecf78, emissiveIntensity:.8 }));
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(.55,.12,.12), new THREE.MeshBasicMaterial({ color:0xf5fff9 }));
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(.12,.55,.12), new THREE.MeshBasicMaterial({ color:0xf5fff9 }));
      const halo = new THREE.PointLight(0x4effad, 1.2, 8, 2);
      orb.castShadow = true; orb.position.y = 1.4; crossH.position.y = 1.4; crossV.position.y = 1.4; halo.position.y = 1.4;
      g.add(orb, crossH, crossV, halo); g.position.set(item.x,0,item.z); scene.add(g); healActors.set(item.id, g);
    }
    mesh = healActors.get(item.id);
    mesh.visible = item.active;
    mesh.position.set(item.x,0,item.z);
  });
  for (const [id,m] of healActors.entries()) if (!ids.has(id)) { scene.remove(m); healActors.delete(id); }
}

function updateHUD(){
  if (!roomState) return;
  const me = roomState.players.find(p => p.id === localId);
  if (!me) return;
  const c = CHARACTERS[me.characterId] || CHARACTERS.ember;
  ui.playerName.textContent = me.name;
  ui.playerClass.textContent = c.name;
  ui.hpText.textContent = `HP ${me.hp}/${me.maxHp}`;
  ui.levelText.textContent = `Lv.${me.level}`;
  ui.hpBar.style.width = `${(me.hp / me.maxHp) * 100}%`;
  ui.xpBar.style.width = `${(me.xp / (me.level * 100)) * 100}%`;
}

function initPreviewScene(){
  const holder = document.getElementById('previewCanvas');
  previewRenderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  previewRenderer.setSize(holder.clientWidth, holder.clientHeight);
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  holder.appendChild(previewRenderer.domElement);
  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(42, holder.clientWidth / holder.clientHeight, 0.1, 50);
  previewCamera.position.set(0, 2.6, 7.2);
  const hemi2 = new THREE.HemisphereLight(0xe7f1ff, 0x050912, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 1.55); key.position.set(4,8,5);
  previewScene.add(hemi2, key);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshStandardMaterial({ color:0x122238, roughness:1 })); floor.rotation.x = -Math.PI/2; previewScene.add(floor);
  buildPreviewCharacter();
}
function buildPreviewCharacter(){
  if (!previewScene) return;
  if (previewRoot) previewScene.remove(previewRoot);
  previewRoot = buildCharacterMesh(selectedCharacter);
  previewRoot.position.y = 0;
  previewScene.add(previewRoot);
}
initPreviewScene();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'j') socket.emit('action', { type:'attack' });
  if (e.key.toLowerCase() === 'k' || e.code === 'Space') socket.emit('action', { type:'skill' });
  if (e.key === 'Shift') socket.emit('action', { type:'dash' });
  if (e.key.toLowerCase() === 'l') socket.emit('action', { type:'guardStart' });
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) socket.emit('action', { type:'attack' });
  if (e.button === 2) socket.emit('action', { type:'skill' });
});
window.addEventListener('contextmenu', (e)=>e.preventDefault());
let mouseX = 0;
window.addEventListener('mousemove', (e) => { mouseX = (e.clientX / window.innerWidth - .5) * Math.PI * 1.1; });

let lastSent = 0;
function sendInput(now){
  if (!joined || now - lastSent < 50) return;
  lastSent = now;
  socket.emit('playerInput', {
    up: keys['w'] || keys['arrowup'],
    down: keys['s'] || keys['arrowdown'],
    left: keys['a'] || keys['arrowleft'],
    right: keys['d'] || keys['arrowright'],
    aim: mouseX
  });
}

const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
const tmpVec = new THREE.Vector3();
function animateCharacter(mesh, state, dt, fullState) {
  const u = mesh.userData;
  const t = performance.now() * 0.006;
  let walk = 0;
  if (state === 'run') walk = Math.sin(t * 7) * 0.9;
  u.leftLeg.rotation.x = walk * 0.6;
  u.rightLeg.rotation.x = -walk * 0.6;
  u.leftArm.rotation.x = -walk * 0.38;
  u.rightArm.rotation.x = walk * 0.38;
  u.cloak.rotation.x = 0.08 + Math.abs(walk) * 0.06;
  u.aura.material.opacity = 0.18 + fullState.level * 0.01 + (fullState.aura || 0) * 0.38;
  u.healAura.visible = (fullState.healFx || 0) > 0;
  if (u.healAura.visible) u.healAura.material.opacity = 0.15 + fullState.healFx * 0.6;

  const attackPower = state === 'attack1' ? 0.75 : state === 'attack2' ? 1.0 : state === 'attack3' ? 1.25 : state === 'skill' ? 1.45 : 0;
  if (attackPower > 0) {
    u.swordGroup.rotation.z = 0.35 - Math.sin(t*18) * (0.8 + attackPower*0.2);
    u.rightArm.rotation.x = -1.15;
    u.slash.material.opacity = 0.16 + attackPower * 0.24;
    u.slash.rotation.z += dt * 5.8;
  } else {
    u.swordGroup.rotation.z += (0.35 - u.swordGroup.rotation.z) * 0.16;
    u.slash.material.opacity *= 0.88;
  }
  if (fullState.isGuarding) {
    u.rightArm.rotation.z = -1.25;
    u.leftArm.rotation.z = 0.4;
    u.swordGroup.rotation.x = -0.8;
  } else {
    u.rightArm.rotation.z *= 0.86;
    u.leftArm.rotation.z *= 0.86;
    u.swordGroup.rotation.x *= 0.82;
  }
  if (state === 'dash') mesh.position.y = 0.18 + Math.abs(Math.sin(t*30))*0.12;
  else mesh.position.y *= 0.78;

  const hit = fullState.hitFlash || 0;
  mesh.traverse(obj => {
    if (obj.isMesh && obj.material && obj.material.emissive) {
      obj.material.emissiveIntensity = obj.material.emissiveIntensityBase || obj.material.emissiveIntensity || 0;
      if (hit > 0) obj.material.emissiveIntensity = Math.max(obj.material.emissiveIntensity, hit * 1.15);
    }
  });
}

let prevTime = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min(.033, (now - prevTime) / 1000);
  prevTime = now;

  sendInput(now);
  if (roomState) syncActors();
  updateHUD();

  for (const [id, actor] of actors.entries()) {
    const p = actor.target;
    if (!p) continue;
    actor.mesh.position.x += (p.x - actor.mesh.position.x) * 0.2;
    actor.mesh.position.z += (p.z - actor.mesh.position.z) * 0.2;
    let targetRot = p.rot || 0;
    let current = actor.mesh.rotation.y;
    let diff = ((targetRot - current + Math.PI) % (Math.PI*2)) - Math.PI;
    actor.mesh.rotation.y += diff * 0.15;
    animateCharacter(actor.mesh, p.state, dt, p);
  }

  for (const pts of ambientParticles) {
    const pos = pts.geometry.attributes.position;
    for (let i=0;i<pos.count;i++) {
      pos.array[i*3] += Math.sin(now*0.0003 + i)*0.005;
      pos.array[i*3+1] -= 0.02;
      pos.array[i*3+2] += Math.cos(now*0.0004 + i)*0.006;
      if (pos.array[i*3+1] < 0.6) {
        pos.array[i*3+1] = 16 + Math.random()*2;
        pos.array[i*3] = (Math.random() - .5) * 96;
        pos.array[i*3+2] = (Math.random() - .5) * 96;
      }
    }
    pos.needsUpdate = true;
  }
  healActors.forEach((mesh, id) => {
    mesh.children[0].rotation.y += dt * 1.2;
    mesh.position.y = Math.sin(now * 0.003 + id.length) * 0.15;
  });
  if (bossActor && roomState?.boss) {
    bossActor.position.x += (roomState.boss.x - bossActor.position.x) * 0.2;
    bossActor.position.z += (roomState.boss.z - bossActor.position.z) * 0.2;
    bossActor.rotation.y = roomState.boss.rot;
    bossActor.position.y = Math.sin(now * 0.004 * (roomState.boss.rage ? 2 : 1)) * 0.14;
  }

  const me = roomState?.players.find(p => p.id === localId);
  if (me) {
    camTarget.set(me.x, 1.9, me.z);
    const behind = new THREE.Vector3(Math.sin(me.rot + Math.PI) * 11, 8.8, Math.cos(me.rot + Math.PI) * 11);
    camPos.copy(camTarget).add(behind).add(new THREE.Vector3(Math.sin(mouseX)*2.2, 0, Math.cos(mouseX)*2.2));
    camera.position.lerp(camPos, 0.08);
    camera.lookAt(camTarget.x, 2.2, camTarget.z);
  }

  if (previewRenderer && previewScene && previewCamera) {
    if (previewRoot) previewRoot.rotation.y += dt * 0.65;
    previewRenderer.render(previewScene, previewCamera);
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
