import * as THREE from '/vendor/three.module.js';
const $=id=>document.getElementById(id);
const roster={
 ember:{name:'Hỏa Vệ',icon:'🔥',desc:'Lưỡi kiếm rực cháy · Sức công phá lớn',color:0xff724a,hp:120,cd:6500},
 tide:{name:'Thủy Ảnh',icon:'🌊',desc:'Kiếm thuật uyển chuyển · Sinh lực cao',color:0x4dcfff,hp:140,cd:5600},
 storm:{name:'Lôi Phong',icon:'⚡',desc:'Thần tốc · Ra đòn liên hoàn',color:0xffe36c,hp:100,cd:5700},
 bloom:{name:'Hoa Kiếm',icon:'🌸',desc:'Đường kiếm mềm mại · Phạm vi rộng',color:0xff83d6,hp:115,cd:5500},
 frost:{name:'Băng Tinh',icon:'❄️',desc:'Hơi lạnh sắc bén · Đánh chắc chắn',color:0x9fe9ee,hp:135,cd:6500},
 shadow:{name:'Dạ Kiếm',icon:'🌙',desc:'Ẩn ảnh linh hoạt · Tuyệt kỹ mạnh',color:0xb29bff,hp:105,cd:6900}
};
let mode='pvp',bossData=null,bossModel=null,bossAnim=0,hero='ember',me=null,players=new Map(),models=new Map(),keys=new Set(),lastSkill=-Infinity,scene,camera,renderer,clock,arena,effects=[],touchDir={x:0,z:0},heading=0;
let socket=io({autoConnect:false,reconnection:true});
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('selected',x===b))});
const heroBtns=$('heroes');
for(const [key,h] of Object.entries(roster)){let b=document.createElement('button');b.className='hero'+(key===hero?' selected':'');b.innerHTML=`<div class="symbol">${h.icon}</div><b>${h.name}</b><span>${h.desc}</span>`;b.onclick=()=>{hero=key;[...heroBtns.children].forEach(x=>x.classList.remove('selected'));b.classList.add('selected')};heroBtns.append(b)}
const params=new URLSearchParams(location.search);if(params.has('room'))$('room').value=params.get('room').slice(0,12);
if(params.get('mode')==='boss'){mode='boss';document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode))}
let connecting=false;
$('join').onclick=()=>{
 if(connecting)return;connecting=true;$('join').disabled=true;$('menuError').textContent='Đang kết nối máy chủ...';
 if(!socket.connected)socket.connect();else join();
 setTimeout(()=>{if(connecting){connecting=false;$('join').disabled=false;$('menuError').textContent='Không kết nối được máy chủ. Kiểm tra Render hoặc thử tải lại trang.'}},9000);
};
socket.on('connect',()=>{if(connecting)join()});
function join(){socket.emit('join',{hero,mode,name:$('name').value,room:$('room').value},res=>{
 connecting=false;$('join').disabled=false;
 if(!res?.ok){$('menuError').textContent=res?.error||'Không vào được phòng';return}
 me=res.id;mode=res.mode;$('bossHud').hidden=mode!=='boss';$('menu').style.display='none';$('hud').hidden=false;heading=0;lastSkill=-Infinity;
 $('heroName').textContent=roster[hero].name;$('roomLabel').textContent='Phòng: '+res.room;
 history.replaceState({},'',location.pathname+'?room='+encodeURIComponent(res.room)+'&mode='+mode);
 try{if(!renderer)init3d()}catch(e){$('menu').style.display='flex';$('hud').hidden=true;$('menuError').textContent='Lỗi đồ họa: '+e.message;console.error(e)}
})}
socket.on('disconnect',()=>{if(me)toast('Mất kết nối máy chủ. Đang thử nối lại...')});
socket.on('state',list=>{
 const ids=new Set(list.map(p=>p.id));
 for(const p of list){players.set(p.id,p);if(renderer&&!models.has(p.id))models.set(p.id,makeFighter(p.hero));if(models.has(p.id)){const m=models.get(p.id);m.targetX=p.x;m.targetZ=p.z;m.targetAngle=p.angle;m.visible=p.alive}}
 for(const id of [...models.keys()])if(!ids.has(id)){scene.remove(models.get(id));models.delete(id);players.delete(id)}
 if(me){const mine=players.get(me);if(mine){$('hpfill').style.width=(mine.hp/roster[mine.hero].hp*100)+'%';$('hptext').textContent=mine.hp+' / '+roster[mine.hero].hp}}
 $('playerCount').textContent=list.length+' người';$('board').innerHTML='<b>🏆 ĐẤU TRƯỜNG</b><br>'+[...list].sort((a,b)=>b.kills-a.kills).slice(0,8).map((p,i)=>`${i+1}. ${escapeHTML(p.name)} · ${p.kills} KO`).join('<br>');
});
socket.on('bossState',b=>{bossData=b; if(renderer&&b&&!bossModel)createBossModel();if(bossModel)bossModel.visible=Boolean(b?.alive);$('bossHud').hidden=mode!=='boss';if(b){$('bossLabel').textContent='👹 THỦ LĨNH · ĐỢT '+b.wave+(b.phase===2?' · CUỒNG NỘ':'');$('bossHp').textContent=b.hp+' / '+b.maxHp;$('bossFill').style.width=(100*b.hp/b.maxHp)+'%'}});
socket.on('bossDefeated',e=>toast('🏆 Hạ Boss đợt '+e.wave+'! Đợt mới sau 6 giây.'));
socket.on('bossAttack',e=>{if(renderer)bossPulse(e)});
socket.on('bossHit',e=>{if(renderer)hitSpark(e)});
socket.on('playerLeft',id=>{if(models.has(id)){scene.remove(models.get(id));models.delete(id)}players.delete(id)});
socket.on('effect',e=>{if(renderer)makeEffect(e)});
socket.on('ko',e=>toast(`${e.killer} hạ gục ${e.victim}!`));
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg){$('feed').textContent=msg;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('feed').textContent='',3300)}
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Đã sao chép link phòng!')}catch{toast('Hãy sao chép đường link trên thanh địa chỉ')}};
$('leave').onclick=()=>location.assign(location.pathname);
function blade(){socket.emit('attack','attack')}
function skill(){if(Date.now()-lastSkill<roster[hero].cd)return;lastSkill=Date.now();socket.emit('attack','skill')}
$('swing').onclick=blade;$('skill').onclick=skill;
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='KeyJ')blade();if(e.code==='KeyK'||e.code==='Space')skill()});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
let joyPointer=null;
$('joy').addEventListener('pointerdown',e=>{joyPointer=e.pointerId;$('joy').setPointerCapture(e.pointerId);updateJoy(e)});
$('joy').addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)updateJoy(e)});
for(const ev of ['pointerup','pointercancel'])$('joy').addEventListener(ev,e=>{if(e.pointerId===joyPointer){joyPointer=null;touchDir={x:0,z:0};$('knob').style.transform='translate(0px,0px)'}});
function updateJoy(e){const r=$('joy').getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.34),y=(e.clientY-r.top-r.height/2)/(r.height*.34),l=Math.max(1,Math.hypot(x,y));touchDir={x:x/l,z:y/l};$('knob').style.transform=`translate(${touchDir.x*36}px,${touchDir.z*36}px)`}
function init3d(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x0b1429);scene.fog=new THREE.Fog(0x0b1429,32,95);
 camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,180);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.prepend(renderer.domElement);
 clock=new THREE.Clock();scene.add(new THREE.HemisphereLight(0xadc4fa,0x37283f,2));const sun=new THREE.DirectionalLight(0xffd9a0,3);sun.position.set(20,40,17);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-40;sun.shadow.camera.right=40;sun.shadow.camera.top=40;sun.shadow.camera.bottom=-40;scene.add(sun);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(34,96),new THREE.MeshStandardMaterial({color:0x273443,roughness:.85,metalness:.2}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const outer=new THREE.Mesh(new THREE.RingGeometry(25.3,26.4,96),new THREE.MeshStandardMaterial({color:0xd5a26b,emissive:0x8d5130,emissiveIntensity:.5,side:THREE.DoubleSide}));outer.rotation.x=-Math.PI/2;outer.position.y=.035;scene.add(outer);
 const inner=new THREE.Mesh(new THREE.RingGeometry(8.2,8.45,96),new THREE.MeshBasicMaterial({color:0x7597c9,side:THREE.DoubleSide}));inner.rotation.x=-Math.PI/2;inner.position.y=.045;scene.add(inner);
 let grid=new THREE.GridHelper(51,20,0x4e678e,0x344056);grid.position.y=.048;scene.add(grid);
 for(let i=0;i<16;i++){let a=i*Math.PI/8;let pillar=new THREE.Group();let base=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,3.3,8),new THREE.MeshStandardMaterial({color:0x3c445f,roughness:.4}));base.position.y=1.65;base.castShadow=true;pillar.add(base);let top=new THREE.Mesh(new THREE.OctahedronGeometry(.7),new THREE.MeshStandardMaterial({color:0x8ce4f1,emissive:0x2a8a9b,emissiveIntensity:1.4}));top.position.y=3.6;pillar.add(top);pillar.position.set(Math.cos(a)*30,0,Math.sin(a)*30);scene.add(pillar)}
 const stars=new THREE.BufferGeometry(),arr=[];for(let i=0;i<220;i++)arr.push((Math.random()-.5)*175,15+Math.random()*65,(Math.random()-.5)*175);stars.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xd1dcff,size:.22})));
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
 renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&me){const mine=players.get(me);if(!mine)return;const rect=renderer.domElement.getBoundingClientRect(),nx=e.clientX/rect.width*2-1,ny=-(e.clientY/rect.height*2-1);const v=new THREE.Vector3(nx,ny,.5).unproject(camera),dir=v.sub(camera.position).normalize(),t=-camera.position.y/dir.y;const pt=camera.position.clone().addScaledVector(dir,t);heading=Math.atan2(pt.z-mine.z,pt.x-mine.x)}});
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0)blade()});
 if(bossData)createBossModel();renderer.setAnimationLoop(render);
}
function createBossModel(){
 if(bossModel||!scene)return;
 const g=new THREE.Group(),armor=new THREE.MeshStandardMaterial({color:0x512546,metalness:.53,roughness:.32}),trim=new THREE.MeshStandardMaterial({color:0xff657e,emissive:0x8e163f,emissiveIntensity:1.1,metalness:.5}),dark=new THREE.MeshStandardMaterial({color:0x17152d,roughness:.65});
 const part=(geo,mat,x,y,z)=>{let m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
 part(new THREE.CylinderGeometry(1.2,1.7,3.5,10),armor,0,3.2,0);
 part(new THREE.DodecahedronGeometry(1.3),armor,0,5.3,0);
 for(let sign of [-1,1]){part(new THREE.ConeGeometry(.46,1.8,6),trim,sign*.72,6.5,0).rotation.z=sign*-.25;part(new THREE.BoxGeometry(.8,2.5,.85),armor,sign*1.6,3.4,0).rotation.z=sign*.32;part(new THREE.BoxGeometry(.77,2.4,.88),dark,sign*.68,1.1,0)}
 const eye=part(new THREE.BoxGeometry(1.15,.17,.17),trim,0,5.38,1.13);eye.material.emissiveIntensity=2;
 const aura=new THREE.Mesh(new THREE.TorusGeometry(2.35,.12,8,64),new THREE.MeshBasicMaterial({color:0xff6389,transparent:true,opacity:.68}));aura.rotation.x=Math.PI/2;aura.position.y=.17;g.add(aura);g.aura=aura;g.scale.setScalar(1.12);scene.add(g);bossModel=g;
}
function bossPulse(e){const mesh=new THREE.Mesh(new THREE.RingGeometry(.5,e.radius,64),new THREE.MeshBasicMaterial({color:e.phase===2?0xff274f:0xffab65,side:THREE.DoubleSide,transparent:true,opacity:.75,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(e.x,.13,e.z);scene.add(mesh);effects.push({mesh,t:0,max:.5});}
function hitSpark(e){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.6,1),new THREE.MeshBasicMaterial({color:roster[e.hero]?.color||0xffffff,transparent:true,opacity:.9}));mesh.position.set(e.x,4.9,e.z);scene.add(mesh);effects.push({mesh,t:0,max:.3})}
function makeFighter(key){const h=roster[key],g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:h.color,roughness:.36,metalness:.24}),dark=new THREE.MeshStandardMaterial({color:0x172033,roughness:.75}),skin=new THREE.MeshStandardMaterial({color:0xffd1ac}),steel=new THREE.MeshStandardMaterial({color:0xb6eaff,metalness:.75,roughness:.2});
 function box(w,hh,d,x,y,z,m){const a=new THREE.Mesh(new THREE.BoxGeometry(w,hh,d),m);a.position.set(x,y,z);a.castShadow=true;g.add(a);return a}
 box(.9,1.2,.48,0,1.8,0,mat);box(.85,.24,.65,0,2.4,0,dark);box(.25,.98,.27,-.27,.6,0,dark);box(.25,.98,.27,.27,.6,0,dark);box(.25,.9,.24,-.62,1.85,0,mat);box(.25,.9,.24,.62,1.85,0,mat);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),skin);head.position.y=2.72;head.castShadow=true;g.add(head);box(.7,.2,.68,0,2.96,-.03,dark);
 const sword=new THREE.Group();const bladeMesh=new THREE.Mesh(new THREE.BoxGeometry(.13,1.68,.065),steel);bladeMesh.position.y=.84;sword.add(bladeMesh);const handle=new THREE.Mesh(new THREE.BoxGeometry(.18,.43,.17),dark);handle.position.y=-.23;sword.add(handle);const guard=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.25),mat);sword.add(guard);sword.position.set(.8,1.62,.12);sword.rotation.z=-.65;g.add(sword);g.sword=sword;
 const halo=new THREE.Mesh(new THREE.RingGeometry(.6,.69,32),new THREE.MeshBasicMaterial({color:h.color,side:THREE.DoubleSide,transparent:true,opacity:.85}));halo.rotation.x=-Math.PI/2;halo.position.y=.06;g.add(halo);
 g.targetX=0;g.targetZ=0;g.targetAngle=0;scene.add(g);return g;
}
function makeEffect(e){const color=roster[e.hero]?.color||0xffffff;let mesh=new THREE.Mesh(new THREE.TorusGeometry(e.type==='skill'?4:2.1,.1,8,54,Math.PI*(e.type==='skill'?2:1.15)),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.rotation.z=e.angle;mesh.position.set(e.x,.35,e.z);scene.add(mesh);effects.push({mesh,t:0,max:e.type==='skill'?.65:.3});let m=models.get(e.id);if(m){m.sword.rotation.z=-2.1;setTimeout(()=>{if(m.sword)m.sword.rotation.z=-.65},180)}}
let acc=0;
function render(){const dt=Math.min(clock.getDelta(),.05);acc+=dt;
 const mine=players.get(me);
 if(acc>=.05&&socket.connected&&mine){acc=0;let dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchDir.x;let dz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touchDir.z;let mag=Math.hypot(dx,dz);if(mag>1){dx/=mag;dz/=mag}
 if(mag>.04){if(matchMedia('(pointer:coarse)').matches)heading=Math.atan2(dz,dx);socket.emit('move',{dx,dz,angle:heading})}else socket.emit('move',{dx:0,dz:0,angle:heading});}
 for(const [id,m] of models){const p=players.get(id);if(!p)continue;m.position.x=THREE.MathUtils.damp(m.position.x,p.x,12,dt);m.position.z=THREE.MathUtils.damp(m.position.z,p.z,12,dt);m.rotation.y=-p.angle;}
 if(bossData&&bossModel){bossModel.position.x=THREE.MathUtils.damp(bossModel.position.x,bossData.x,7,dt);bossModel.position.z=THREE.MathUtils.damp(bossModel.position.z,bossData.z,7,dt);bossAnim+=dt;bossModel.rotation.y+=dt*.45;bossModel.position.y=Math.sin(bossAnim*2)*.09;bossModel.aura.rotation.z+=dt*.55;}
 if(mine){const focus=new THREE.Vector3(mine.x,1.9,mine.z),target=new THREE.Vector3(mine.x+11,13,mine.z+15);camera.position.lerp(target,Math.min(1,dt*4));camera.lookAt(focus)}
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.t+=dt;e.mesh.scale.setScalar(1+e.t*1.5);e.mesh.material.opacity=Math.max(0,1-e.t/e.max);if(e.t>=e.max){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();effects.splice(i,1)}}
 let remaining=Math.max(0,Math.ceil((roster[hero].cd-(Date.now()-lastSkill))/1000));$('skillcd').textContent=remaining?remaining+'s':'Sẵn sàng';
 renderer.render(scene,camera);
}
