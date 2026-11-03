const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'three', 'build')));

const CHARACTERS = {
  ember: { name: 'Hỏa Vệ', color: '#ff7043', maxHp: 145, speed: 10.2, damage: 20, skillDamage: 30 },
  tide: { name: 'Thủy Ảnh', color: '#4fc3f7', maxHp: 175, speed: 9.0, damage: 17, skillDamage: 24 },
  storm: { name: 'Lôi Phong', color: '#ffd54f', maxHp: 135, speed: 11.2, damage: 18, skillDamage: 26 },
  blossom: { name: 'Hoa Kiếm', color: '#f48fb1', maxHp: 150, speed: 10.0, damage: 18, skillDamage: 28 },
  frost: { name: 'Băng Tinh', color: '#8de3ff', maxHp: 160, speed: 9.4, damage: 19, skillDamage: 29 },
  eclipse: { name: 'Dạ Kiếm', color: '#b39ddb', maxHp: 142, speed: 10.5, damage: 21, skillDamage: 31 }
};

const MAP_BOUNDS = 58;
const TICK_RATE = 20;
const rooms = new Map();

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function normalizeAngle(a){ while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

function makeArenaDecorSeed(){ return { seed: Math.floor(Math.random()*999999) }; }

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      code,
      mode: 'pvp',
      players: {},
      started: false,
      lastUpdate: Date.now(),
      pickups: spawnPickups(),
      boss: null,
      bossWave: 1,
      scene: makeArenaDecorSeed(),
      scoreboard: {}
    });
  }
  return rooms.get(code);
}

function spawnPickups() {
  const list = [];
  for (let i = 0; i < 8; i++) {
    list.push({
      id: `heal_${i}`,
      x: rand(-40, 40),
      z: rand(-40, 40),
      active: true,
      respawnAt: 0,
      heal: 42
    });
  }
  return list;
}

function createBoss(wave = 1) {
  return {
    id: 'boss_1',
    x: 0,
    z: 0,
    rot: 0,
    hp: 520 + wave * 110,
    maxHp: 520 + wave * 110,
    rage: false,
    attackCooldown: 0,
    wave,
    hitFlash: 0,
    anim: 0,
    targetId: null
  };
}

function makePlayer(id, name, characterId) {
  const base = CHARACTERS[characterId] || CHARACTERS.ember;
  return {
    id,
    name: name.slice(0, 18),
    characterId,
    x: rand(-10, 10),
    z: rand(-10, 10),
    rot: rand(-Math.PI, Math.PI),
    hp: base.maxHp,
    maxHp: base.maxHp,
    speed: base.speed,
    damage: base.damage,
    skillDamage: base.skillDamage,
    comboStep: 0,
    comboExpire: 0,
    isGuarding: false,
    guardCooldown: 0,
    dashCooldown: 0,
    skillCooldown: 0,
    attackCooldown: 0,
    state: 'idle',
    score: 0,
    deaths: 0,
    level: 1,
    xp: 0,
    input: { up:false,down:false,left:false,right:false,guard:false,dash:false,aim:0 },
    lastAction: '',
    respawnAt: 0,
    hitFlash: 0,
    aura: 0,
    healFx: 0
  };
}

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    characterId: p.characterId,
    x: p.x,
    z: p.z,
    rot: p.rot,
    hp: p.hp,
    maxHp: p.maxHp,
    score: p.score,
    deaths: p.deaths,
    level: p.level,
    xp: p.xp,
    state: p.state,
    comboStep: p.comboStep,
    isGuarding: p.isGuarding,
    hitFlash: p.hitFlash,
    aura: p.aura,
    healFx: p.healFx
  };
}

function gainXp(p, amount) {
  p.xp += amount;
  while (p.xp >= p.level * 100) {
    p.xp -= p.level * 100;
    p.level += 1;
    p.maxHp += 6;
    p.hp = Math.min(p.maxHp, p.hp + 18);
    p.aura = 1.2;
  }
}

function damagePlayer(target, rawDamage) {
  const mult = target.isGuarding ? 0.28 : 1;
  const dmg = Math.round(rawDamage * mult);
  target.hp = clamp(target.hp - dmg, 0, target.maxHp);
  target.hitFlash = 0.65;
  return dmg;
}

function performAttack(room, playerId, type) {
  const attacker = room.players[playerId];
  if (!attacker || attacker.hp <= 0) return;
  const now = Date.now();
  if (type === 'attack') {
    if (now < attacker.attackCooldown) return;
    attacker.comboStep = now < attacker.comboExpire ? ((attacker.comboStep % 3) + 1) : 1;
    attacker.comboExpire = now + 850;
    attacker.attackCooldown = now + 280;
    attacker.state = attacker.comboStep === 3 ? 'attack3' : attacker.comboStep === 2 ? 'attack2' : 'attack1';
    const base = attacker.damage * (attacker.comboStep === 3 ? 1.55 : attacker.comboStep === 2 ? 1.15 : 1);
    resolvePlayerAttack(room, attacker, base, 5.4, 1.08, type);
  } else if (type === 'skill') {
    if (now < attacker.skillCooldown) return;
    attacker.skillCooldown = now + 4700;
    attacker.state = 'skill';
    resolvePlayerAttack(room, attacker, attacker.skillDamage, 8.6, 1.85, type);
  }
}

function resolvePlayerAttack(room, attacker, damage, range, arc, type) {
  const dirX = Math.sin(attacker.rot);
  const dirZ = Math.cos(attacker.rot);
  if (room.mode === 'pvp') {
    for (const other of Object.values(room.players)) {
      if (other.id === attacker.id || other.hp <= 0) continue;
      const dx = other.x - attacker.x;
      const dz = other.z - attacker.z;
      const d = Math.hypot(dx, dz);
      if (d > range) continue;
      const ang = Math.atan2(dx, dz);
      const delta = Math.abs(normalizeAngle(ang - attacker.rot));
      if (delta > arc) continue;
      const dealt = damagePlayer(other, damage);
      if (other.hp <= 0) {
        attacker.score += 1;
        gainXp(attacker, 60);
        other.deaths += 1;
        other.respawnAt = Date.now() + 2800;
        other.state = 'down';
      } else if (type === 'skill') {
        gainXp(attacker, 8);
      }
    }
  } else if (room.boss && room.boss.hp > 0) {
    const boss = room.boss;
    const dx = boss.x - attacker.x;
    const dz = boss.z - attacker.z;
    const d = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const delta = Math.abs(normalizeAngle(ang - attacker.rot));
    if (d <= range + 1.2 && delta <= arc) {
      boss.hp = clamp(boss.hp - Math.round(damage), 0, boss.maxHp);
      boss.hitFlash = 0.75;
      if (boss.hp <= 0) {
        const xpGain = 90 + room.bossWave * 20;
        Object.values(room.players).forEach(p => gainXp(p, xpGain));
        room.bossWave += 1;
        room.boss = createBoss(room.bossWave);
      }
    }
  }
}

function serializeRoom(room) {
  return {
    code: room.code,
    mode: room.mode,
    started: room.started,
    players: Object.values(room.players).map(publicPlayer),
    pickups: room.pickups,
    boss: room.boss,
    bossWave: room.bossWave,
    scene: room.scene
  };
}

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomCode, name, characterId, mode }) => {
    try {
      const code = (roomCode || 'DUNG01').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'DUNG01';
      const room = getRoom(code);
      room.mode = mode === 'boss' ? 'boss' : 'pvp';
      socket.join(code);
      socket.data.roomCode = code;
      room.players[socket.id] = makePlayer(socket.id, name || 'Kiếm sĩ', characterId || 'ember');
      if (room.mode === 'boss' && !room.boss) room.boss = createBoss(room.bossWave);
      io.to(code).emit('roomState', serializeRoom(room));
    } catch (e) {
      socket.emit('messageLog', 'Không thể vào phòng.');
    }
  });

  socket.on('startMatch', () => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    if (!room) return;
    room.started = true;
    if (room.mode === 'boss' && !room.boss) room.boss = createBoss(room.bossWave);
    io.to(code).emit('roomState', serializeRoom(room));
  });

  socket.on('playerInput', (payload) => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    const p = room && room.players[socket.id];
    if (!p || p.hp <= 0) return;
    p.input = { ...p.input, ...payload };
    if (typeof payload.aim === 'number') p.rot = payload.aim;
  });

  socket.on('action', ({ type }) => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    const p = room && room.players[socket.id];
    if (!room || !p) return;
    if (type === 'dash') {
      if (Date.now() < p.dashCooldown || p.hp <= 0) return;
      p.dashCooldown = Date.now() + 2200;
      p.x = clamp(p.x + Math.sin(p.rot) * 6.5, -MAP_BOUNDS, MAP_BOUNDS);
      p.z = clamp(p.z + Math.cos(p.rot) * 6.5, -MAP_BOUNDS, MAP_BOUNDS);
      p.state = 'dash';
    } else if (type === 'guardStart') {
      if (Date.now() < p.guardCooldown || p.hp <= 0) return;
      p.isGuarding = true;
      p.guardCooldown = Date.now() + 2800;
      p.state = 'guard';
      setTimeout(() => { if (p) p.isGuarding = false; }, 650);
    } else if (type === 'attack' || type === 'skill') {
      performAttack(room, socket.id, type);
    }
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    if (!room) return;
    delete room.players[socket.id];
    if (Object.keys(room.players).length === 0) {
      rooms.delete(code);
    } else {
      io.to(code).emit('roomState', serializeRoom(room));
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const dt = 1 / TICK_RATE;
    for (const p of Object.values(room.players)) {
      if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt * 2);
      if (p.aura > 0) p.aura = Math.max(0, p.aura - dt * 0.6);
      if (p.healFx > 0) p.healFx = Math.max(0, p.healFx - dt * 1.4);
      if (p.hp <= 0 && p.respawnAt && now >= p.respawnAt) {
        p.hp = p.maxHp;
        p.x = rand(-14, 14);
        p.z = rand(-14, 14);
        p.state = 'idle';
        p.respawnAt = 0;
      }
      if (p.hp <= 0) continue;
      const move = { x: 0, z: 0 };
      if (p.input.up) move.z += 1;
      if (p.input.down) move.z -= 1;
      if (p.input.left) move.x -= 1;
      if (p.input.right) move.x += 1;
      const len = Math.hypot(move.x, move.z);
      if (len > 0) {
        move.x /= len; move.z /= len;
        const speed = p.speed * dt;
        p.x = clamp(p.x + move.x * speed * 3, -MAP_BOUNDS, MAP_BOUNDS);
        p.z = clamp(p.z + move.z * speed * 3, -MAP_BOUNDS, MAP_BOUNDS);
        if (p.state === 'idle' || p.state === 'run') p.state = 'run';
        p.rot = Math.atan2(move.x, move.z);
      } else if (!['attack1', 'attack2', 'attack3', 'skill', 'guard', 'dash'].includes(p.state)) {
        p.state = 'idle';
      }
    }

    for (const pickup of room.pickups) {
      if (!pickup.active && now >= pickup.respawnAt) pickup.active = true;
      if (!pickup.active) continue;
      for (const p of Object.values(room.players)) {
        if (p.hp <= 0) continue;
        if (dist(p, pickup) < 2.25 && p.hp < p.maxHp) {
          p.hp = clamp(p.hp + pickup.heal, 0, p.maxHp);
          p.healFx = 1.2;
          pickup.active = false;
          pickup.respawnAt = now + 12000;
          break;
        }
      }
    }

    if (room.mode === 'boss' && room.started) {
      if (!room.boss) room.boss = createBoss(room.bossWave);
      const boss = room.boss;
      if (boss.hitFlash > 0) boss.hitFlash = Math.max(0, boss.hitFlash - dt * 1.7);
      boss.anim += dt * (boss.rage ? 2.6 : 1.7);
      const living = Object.values(room.players).filter(p => p.hp > 0);
      if (living.length) {
        let nearest = living[0];
        let best = dist(boss, nearest);
        for (const p of living.slice(1)) {
          const d = dist(boss, p);
          if (d < best) { best = d; nearest = p; }
        }
        boss.targetId = nearest.id;
        const angle = Math.atan2(nearest.x - boss.x, nearest.z - boss.z);
        boss.rot = angle;
        if (boss.hp < boss.maxHp * 0.45) boss.rage = true;
        const speed = boss.rage ? 0.62 : 0.44;
        if (best > 4.5) {
          boss.x += Math.sin(angle) * speed;
          boss.z += Math.cos(angle) * speed;
        }
        if (boss.attackCooldown > 0) boss.attackCooldown -= dt;
        if (best < 5.6 && boss.attackCooldown <= 0) {
          boss.attackCooldown = boss.rage ? 1.2 : 1.8;
          for (const p of living) {
            if (dist(p, boss) < 6.2) damagePlayer(p, boss.rage ? 34 : 24);
          }
        }
      }
    }

    io.to(room.code).emit('roomState', serializeRoom(room));
  }
}, 1000 / TICK_RATE);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Blade Spirits Arena V9 running on ${PORT}`);
});
