'use strict';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ['websocket', 'polling'] });
const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = 12;
const ARENA_LIMIT = 24;
const HEROES = {
  ember: { label: 'Hỏa Vệ', color: 0xff724a, hp: 120, speed: 6.0, damage: 27, cooldown: 620, skillDamage: 43, skillRadius: 6.3, skillCooldown: 6500 },
  tide: { label: 'Thủy Ảnh', color: 0x4dcfff, hp: 140, speed: 5.7, damage: 22, cooldown: 540, skillDamage: 33, skillRadius: 7.0, skillCooldown: 5600 },
  storm: { label: 'Lôi Phong', color: 0xffe36c, hp: 100, speed: 7.5, damage: 24, cooldown: 430, skillDamage: 35, skillRadius: 5.8, skillCooldown: 5700 },
  bloom: { label: 'Hoa Kiếm', color: 0xff83d6, hp: 115, speed: 6.5, damage: 23, cooldown: 490, skillDamage: 29, skillRadius: 7.5, skillCooldown: 5500 },
  frost: { label: 'Băng Tinh', color: 0x9fe9ee, hp: 135, speed: 5.8, damage: 25, cooldown: 580, skillDamage: 39, skillRadius: 6.5, skillCooldown: 6500 },
  shadow: { label: 'Dạ Kiếm', color: 0xb29bff, hp: 105, speed: 7.0, damage: 27, cooldown: 520, skillDamage: 40, skillRadius: 5.6, skillCooldown: 6900 }
};
const rooms = new Map();
const sockets = new Map();
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const clean = (v, fallback, max) => (typeof v === 'string' ? v.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, max) : '') || fallback;
const now = () => Date.now();
function roomFor(code) { if (!rooms.has(code)) rooms.set(code, {players: new Map(), created: now()}); return rooms.get(code); }
function publicPlayer(p) { return {id:p.id,name:p.name,hero:p.hero,x:p.x,z:p.z,angle:p.angle,hp:p.hp,kills:p.kills,deaths:p.deaths,alive:p.alive}; }
function emitState(code) { const room = rooms.get(code); if(room) io.to(code).emit('state', [...room.players.values()].map(publicPlayer)); }
function leave(socket) {
  const code = sockets.get(socket.id);
  if (!code) return;
  sockets.delete(socket.id);
  socket.leave(code);
  const room = rooms.get(code);
  if (!room) return;
  room.players.delete(socket.id);
  io.to(code).emit('playerLeft', socket.id);
  if (!room.players.size) rooms.delete(code); else emitState(code);
}
function hit(room, attacker, victim, damage) {
  if (!victim.alive || victim.id === attacker.id) return;
  victim.hp = Math.max(0, victim.hp - damage);
  if (victim.hp === 0) {
    victim.alive = false; victim.deaths++; attacker.kills++;
    io.to(attacker.code).emit('ko', {killer:attacker.name,victim:victim.name});
    setTimeout(() => {
      if (!room.players.has(victim.id) || victim.alive) return;
      const h = HEROES[victim.hero];
      victim.hp = h.hp; victim.alive = true;
      victim.x = (Math.random()-.5)*30; victim.z = (Math.random()-.5)*30;
      emitState(victim.code);
    }, 4000);
  }
}
io.on('connection', socket => {
  socket.on('join', (payload = {}, reply = () => {}) => {
    if (typeof reply !== 'function') return;
    leave(socket);
    const code = clean(payload.room, 'ARENA', 12).toUpperCase();
    const name = clean(payload.name, 'Kiếm sĩ', 16);
    const hero = Object.hasOwn(HEROES, payload.hero) ? payload.hero : 'ember';
    const room = roomFor(code);
    if (room.players.size >= MAX_PLAYERS) { reply({ok:false,error:'Phòng đã đủ 12 người.'}); return; }
    const h = HEROES[hero];
    const p = {id:socket.id,code,hero,name,x:(Math.random()-.5)*24,z:(Math.random()-.5)*24,angle:0,hp:h.hp,alive:true,kills:0,deaths:0,lastMove:now(),lastAttack:0,lastSkill:0};
    room.players.set(socket.id, p); sockets.set(socket.id, code); socket.join(code);
    reply({ok:true,id:socket.id,room:code,heroes:HEROES});
    emitState(code);
  });
  socket.on('move', data => {
    const code = sockets.get(socket.id), p = rooms.get(code)?.players.get(socket.id);
    if (!p || !p.alive || !data || typeof data !== 'object') return;
    const t = now(), dt = clamp((t-p.lastMove)/1000, 0, .16); p.lastMove=t;
    const dx = Number(data.dx), dz=Number(data.dz), a=Number(data.angle);
    if (![dx,dz,a].every(Number.isFinite)) return;
    const mag=Math.hypot(dx,dz), mul=mag>1?1/mag:1;
    p.x=clamp(p.x+clamp(dx,-1,1)*mul*HEROES[p.hero].speed*dt,-ARENA_LIMIT,ARENA_LIMIT);
    p.z=clamp(p.z+clamp(dz,-1,1)*mul*HEROES[p.hero].speed*dt,-ARENA_LIMIT,ARENA_LIMIT);
    p.angle=a % (Math.PI*2);
  });
  socket.on('attack', type => {
    const code=sockets.get(socket.id), room=rooms.get(code), p=room?.players.get(socket.id);
    if (!p || !p.alive) return;
    const h=HEROES[p.hero], t=now(), isSkill=type==='skill';
    const last=isSkill?'lastSkill':'lastAttack', cooldown=isSkill?h.skillCooldown:h.cooldown;
    if (t-p[last]<cooldown) return;
    p[last]=t;
    const range=isSkill?h.skillRadius:3.45, damage=isSkill?h.skillDamage:h.damage;
    for(const victim of room.players.values()) {
      if (victim.id===p.id || !victim.alive) continue;
      const dx=victim.x-p.x,dz=victim.z-p.z,d=Math.hypot(dx,dz);
      if (d>range) continue;
      const facing=Math.cos(p.angle)*dx + Math.sin(p.angle)*dz;
      if (isSkill || facing/d > 0.33) hit(room,p,victim,damage);
    }
    io.to(code).emit('effect',{id:p.id,type:isSkill?'skill':'attack',hero:p.hero,x:p.x,z:p.z,angle:p.angle});
    emitState(code);
  });
  socket.on('disconnect',()=>leave(socket));
});
setInterval(()=>{ for (const code of rooms.keys()) emitState(code); }, 100);
app.use('/vendor',express.static(path.join(__dirname,'node_modules/three/build')));
app.use(express.static(path.join(__dirname,'public')));
app.get('/health',(req,res)=>res.json({ok:true,rooms:rooms.size}));
server.listen(PORT,'0.0.0.0',()=>console.log(`Blade Spirits Arena listening on ${PORT}`));
