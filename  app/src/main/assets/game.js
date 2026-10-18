(()=> {
const $=id=>document.getElementById(id);
const canvas=$('view');
const STOREY=4.4, HOUSE_W=14, HOUSE_D=12;
let scene,camera,renderer,clock,player,world=[],bots=[],pickups=[],keys={},started=false,paused=false,health=100,stamina=100,kills=0,matchTime=180,currentItem=0,attackCd=0,invuln=0,playerDown=false,slideTime=0,crouch=false,moveSpeed=7.4,lookX=0,lookY=0,yaw=0,pitch=-0.16,velocityY=0,groundY=0,lastToast=0,cameraPos=new THREE.Vector3(),cameraLook=new THREE.Vector3(),cameraReady=false,colliders=[];
const items=[
 {name:'Tawa',icon:'🍳',type:'MELEE • BONK',color:0xffb13b,power:22,range:2.6},
 {name:'Chappal',icon:'🩴',type:'MELEE • YEET',color:0x48d7ff,power:16,range:3.2},
 {name:'Belan',icon:'🥖',type:'MELEE • SWEEP',color:0xff68a8,power:18,range:3.0},
 {name:'Banana',icon:'🍌',type:'THROWABLE • SLIP',color:0xe7ff47,power:14,range:14},
 {name:'Jhaadu',icon:'🧹',type:'MELEE • SWEEP',color:0x9d82ff,power:13,range:3.8},
 {name:'Water Balloon',icon:'💧',type:'THROWABLE • SPLASH',color:0x49a7ff,power:12,range:16},
 {name:'Cushion',icon:'🛋️',type:'THROWABLE • BONK',color:0xff795c,power:10,range:12}
];
function rand(a,b){return a+Math.random()*(b-a)}
function makePatternTexture(base,type='wall'){
 const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');
 x.fillStyle='#'+base.toString(16).padStart(6,'0');x.fillRect(0,0,256,256);
 if(type==='wall'){x.globalAlpha=.16;x.strokeStyle='#ffffff';x.lineWidth=2;for(let y=0;y<256;y+=32){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke()}for(let r=0;r<8;r++)for(let col=0;col<8;col++){x.globalAlpha=.08+((r+col)%3)*.025;x.fillStyle=(r+col)%2?'#fff':'#11182b';x.fillRect(col*32+(r%2)*16+2,r*32+2,28,28)}}
 else if(type==='floor'){x.globalAlpha=.25;x.strokeStyle='#fff2c7';x.lineWidth=2;for(let y=0;y<256;y+=64){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke()}for(let xx=0;xx<256;xx+=64){x.beginPath();x.moveTo(xx,0);x.lineTo(xx,256);x.stroke()}}
 else {x.globalAlpha=.2;for(let i=0;i<256;i+=12){x.fillStyle=i%24?'#fff':'#141a32';x.fillRect(i,0,4,256);x.fillRect(0,i,256,3)}}
 x.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}
const textureCache=new Map();
function mat(c,rough=.82,type='plain'){let key=c+'-'+type;if(textureCache.has(key))return textureCache.get(key);let m=new THREE.MeshStandardMaterial({color:c,roughness:rough});if(type!=='plain'){m.map=makePatternTexture(c,type);m.needsUpdate=true}textureCache.set(key,m);return m;}
function box(w,h,d,c,x,y,z,opts={}){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,.82,opts.texture||'plain'));m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=false;scene.add(m);world.push(m);if(opts.solid)colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y-h/2,maxY:y+h/2});return m}
function makeCharacter(x,z,color,isPlayer=false){
 const g=new THREE.Group();scene.add(g);g.position.set(x,0,z);
 const shirt=mat(color),pants=mat(0x202a49),skin=mat(0xc8875a),dark=mat(0x161a2a),shoe=mat(0xeff4ff);
 const torso=new THREE.Mesh(new THREE.BoxGeometry(.68,.8,.38),shirt);torso.position.y=1.25;torso.castShadow=true;g.add(torso);
 const head=new THREE.Mesh(new THREE.BoxGeometry(.43,.43,.42),skin);head.position.y=1.91;head.castShadow=true;g.add(head);
 const hair=new THREE.Mesh(new THREE.BoxGeometry(.46,.16,.44),dark);hair.position.set(0,2.17,0);g.add(hair);
 const accent=mat(isPlayer?0xffd43b:0x42e8ff),face=mat(0x282033),white=mat(0xffffff),pupil=mat(0x15192a);
 const band=new THREE.Mesh(new THREE.BoxGeometry(.48,.09,.46),accent);band.position.set(0,2.12,0);g.add(band);
 const brow=new THREE.Mesh(new THREE.BoxGeometry(.29,.055,.05),face);brow.position.set(0,2.03,-.22);g.add(brow);
 for(const ex of [-.105,.105]){const eye=new THREE.Mesh(new THREE.BoxGeometry(.075,.075,.035),white);eye.position.set(ex,1.96,-.225);g.add(eye);const dot=new THREE.Mesh(new THREE.BoxGeometry(.035,.045,.02),pupil);dot.position.set(ex,1.96,-.247);g.add(dot)}
 const belt=new THREE.Mesh(new THREE.BoxGeometry(.7,.1,.4),mat(0xffd43b));belt.position.set(0,.91,0);g.add(belt);
 const wrist=new THREE.Mesh(new THREE.BoxGeometry(.23,.14,.26),accent);wrist.position.set(.48,1.04,0);g.add(wrist);
 const leg1=new THREE.Mesh(new THREE.BoxGeometry(.24,.65,.28),pants),leg2=leg1.clone();leg1.position.set(-.19,.48,0);leg2.position.set(.19,.48,0);g.add(leg1,leg2);
 const arm1=new THREE.Mesh(new THREE.BoxGeometry(.2,.65,.24),skin),arm2=arm1.clone();arm1.position.set(-.48,1.28,0);arm2.position.set(.48,1.28,0);g.add(arm1,arm2);
 const pack=new THREE.Mesh(new THREE.BoxGeometry(.42,.48,.18),mat(isPlayer?0xff4e8a:0x252e4a));pack.position.set(0,1.35,.26);g.add(pack);
 g.userData={torso,head,leg1,leg2,arm1,arm2,hp:100,isPlayer,color,walk:rand(0,5),alive:true,attack:0,stun:0};
 return g;
}
function makeHouse(cx,cz,palette,offset){
 // floor slabs + four storeys; open-front, brightly coloured rooms, windows, balconies
 const floorColors=[palette[0],palette[1],palette[2],palette[3]];
 for(let f=0;f<4;f++){
  let y=f*STOREY;
  box(HOUSE_W,.28,HOUSE_D,0xe9b77c,cx,y,cz,{texture:'floor'});
  // back wall, side walls, front piers
  box(HOUSE_W,4.12,.28,floorColors[f],cx,y+2.1,cz-5.85,{texture:'wall',solid:true});
  box(.28,4.12,HOUSE_D,floorColors[(f+1)%4],cx-6.85,y+2.1,cz,{texture:'wall',solid:true});
  box(.28,4.12,HOUSE_D,floorColors[(f+2)%4],cx+6.85,y+2.1,cz,{texture:'wall',solid:true});
  box(.35,4.12,.35,0xffd66b,cx-6.4,y+2.1,cz+5.7);
  box(.35,4.12,.35,0xffd66b,cx+6.4,y+2.1,cz+5.7);
  // colorful interior partitions on alternate floors
  if(f%2===0){box(3,2.5,.2,0xfff0cc,cx-2.8,y+1.3,cz+.2);box(.2,2.5,3,0x8ee6dc,cx+1.5,y+1.3,cz+1.9)}
  // windows and bright shutters
  for(let k=0;k<3;k++){
   let wx=cx-3.8+k*3.8;
   box(1.3,1.05,.12,0x58d9ff,wx,y+2.8,cz-5.66);
   box(1.45,.12,.18,0xffd43b,wx,y+2.25,cz-5.6);
  }
  // balcony
  box(11,.12,1.1,0x3e5b88,cx,y+.35,cz+5.25);
  for(let k=0;k<9;k++)box(.08,.7,.08,0xffd43b,cx-5+k*1.25,y+.72,cz+5.65);
  // room props
  if(f===0){box(2,.7,1.2,0x9c4fbd,cx-2,y+.5,cz+2,{solid:f===0});box(1.1,.9,.8,0xff8657,cx+3,y+.6,cz+1,{solid:f===0})}
  if(f===1){box(2.5,.45,1.2,0x44b9a6,cx+2,y+.5,cz+2,{solid:f===0});box(.45,1.5,.45,0xffce58,cx-3,y+.8,cz+2,{solid:f===0})}
  if(f===2){box(1.4,1.2,1.4,0x6d8cff,cx-2,y+.65,cz+2,{solid:f===0});box(1.1,.5,1.1,0xff709c,cx+3,y+.4,cz+2,{solid:f===0})}
  if(f===3){box(1.8,.3,1.2,0x7a5036,cx-2,y+.25,cz+2,{solid:f===0});box(.8,.8,.8,0x50d6a8,cx+3,y+.4,cz+2,{solid:f===0})}
 }
 // Interior details: doors, rugs, furniture, shelves, lamps and room dividers.
 for(let fl=0;fl<4;fl++){
  let fy=fl*STOREY;
  // rugs and patterned floor mats
  box(3.6,.045,2.2,[0x9b4dba,0x2d9f9b,0xd45c74,0x3c68bb][fl],cx-2,fy+.18,cz+1.65,{texture:'fabric'});
  // sofa and cushions
  box(2.25,.62,.8,[0x356a9f,0x3c8d78,0x9d4d83,0x4666ad][fl],cx+2.7,fy+.52,cz+2.8,{texture:'fabric',solid:fl===0});
  for(let k=0;k<3;k++)box(.55,.42,.12,[0xffd43b,0x42e8ff,0xff4e8a][k],cx+1.95+k*.72,fy+.95,cz+2.35,{texture:'fabric'});
  // cabinets / storage and wall shelves
  box(.9,1.55,.55,0x88532f,cx-4.25,fy+.95,cz+.65,{texture:'wall',solid:fl===0});
  box(1.05,.12,.68,0xffd43b,cx-4.25,fy+1.75,cz+.65);
  box(1.7,.12,.32,0x5c3c2f,cx+1.7,fy+2.05,cz-3.9);
  for(let k=0;k<3;k++)box(.24,.35,.24,[0xff4e8a,0x42e8ff,0xb9ff4b][k],cx+1.15+k*.55,fy+2.28,cz-3.9);
  // ceiling lamps
  let lamp=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),new THREE.MeshStandardMaterial({color:0xfff0a0,emissive:0xffc85a,emissiveIntensity:.55}));
  lamp.position.set(cx,fy+3.8,cz);scene.add(lamp);
 }
 // parapet
 box(14,.8,.3,0xffb34e,cx,17.9,cz+5.85);box(.3,.8,12,0xffb34e,cx-6.85,17.9,cz);
 // bright rooftop tank
 let tank=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,1.5,12),mat(0x4aa9ff));tank.position.set(cx+3,18.6,cz-2);scene.add(tank);world.push(tank);
 // external staircase approximated with visible step blocks
 // Broad, continuous stair flights on the open-front side. Each flight climbs one storey.
 for(let f=0;f<3;f++)for(let s=0;s<20;s++){
  const z=cz+4.45-(s+.5)*(8.9/20), y=f*STOREY+(s+1)*(STOREY/20);
  box(1.65,.16,.52,0xf4d09a,cx+5.0,y-.08,z,{texture:'floor'});
  box(.07,.22,.05,0xffd43b,cx+4.18,y-.04,z);
 }
 // Stair landing markers make the route obvious from the street.
 for(let f=1;f<4;f++)box(2.2,.16,1.4,0x42e8ff,cx+5.0,f*STOREY,cz+4.65);
}
function buildWorld(){
 scene.background=new THREE.Color(0x83d9ff);scene.fog=new THREE.Fog(0x83d9ff,45,105);
 scene.add(new THREE.HemisphereLight(0xc5f6ff,0x6c4b62,2.1));
 let sun=new THREE.DirectionalLight(0xfff0cb,3.0);sun.position.set(-15,30,20);sun.castShadow=false;scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,100),mat(0x53bd8d));ground.rotation.x=-Math.PI/2;ground.position.y=-.18;ground.receiveShadow=true;scene.add(ground);
 // painted courtyard and street stripes
 box(20,.05,18,0xffc86a,0,0,-1);
 for(let i=-2;i<=2;i++)box(.12,.04,14,0xfff2a3,i*3,.02,-1);
 makeHouse(-9,0,[0xff775e,0xffbd59,0x4dc4c4,0x6b80ed],0);
 makeHouse(9,0,[0x5c9cff,0x9c75e8,0xff7eaa,0x58cba8],1);
 // connecting bridges between houses at floors 2 and 4
 for(let f of [1,3]){
  let y=f*STOREY+.45;box(6,.24,2.2,0x384e7a,0,y,0);
  box(6,.14,.12,0xffd43b,0,y+.55,-1.02);box(6,.14,.12,0xffd43b,0,y+.55,1.02);
  for(let i=0;i<9;i++){box(.12,.55,.12,0x42e8ff,-2.8+i*.7,y+.25,-1.02);box(.12,.55,.12,0x42e8ff,-2.8+i*.7,y+.25,1.02)}
 }
 // street clutter, awnings, clotheslines, plants
 for(let i=0;i<6;i++){let x=rand(-20,20),z=rand(-18,18);if(Math.abs(x)<13&&Math.abs(z)<7)continue;box(rand(.6,1.4),rand(.8,2),rand(.6,1.4),[0xff6b6b,0xffd43b,0x55baff,0xb4f75e][i%4],x,.4,z)}
 for(let x=-18;x<=18;x+=6){let pole= new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,5,8),mat(0x53607b));pole.position.set(x,2.5,-12);scene.add(pole);box(2,.05,.05,0xfff2a3,x,4.7,-12)}
 // Visible perimeter fences align with movement bounds, so the player can see the map edge.
 const fenceMat=0x596a78;
 for(let x=-22;x<=22;x+=2){box(.09,1.25,.09,fenceMat,x,.62,-20.0);box(.09,1.25,.09,fenceMat,x,.62,20.0);box(.09,.08,.09,0xffd43b,x,1.25,-20.0);box(.09,.08,.09,0xffd43b,x,1.25,20.0)}
 for(let z=-20;z<=20;z+=2){box(.09,1.25,.09,fenceMat,-22.0,.62,z);box(.09,1.25,.09,fenceMat,22.0,.62,z)}
 for(let y of [.3,.8,1.2]){box(44,.07,.07,0xffd43b,0,y,-20);box(44,.07,.07,0xffd43b,0,y,20);box(.07,.07,40,0xffd43b,-22,y,0);box(.07,.07,40,0xffd43b,22,y,0)}
 // --- Gully detail pass: lane edges, drains, doors, signs, stalls and greenery ---
 // Sidewalk curbs and a narrow open drain along the outer lane.
 box(42,.22,.38,0xd7c8a7,-1,.02,12.7);
 box(42,.22,.38,0xd7c8a7,-1,.02,-16.7);
 box(42,.06,.34,0x394d5b,-1,.04,13.05);
 box(42,.06,.34,0x394d5b,-1,.04,-17.05);
 for(let x=-20;x<=20;x+=2.5){box(.9,.035,.09,0xeff3db,x,.04,-1.1);}
 // Drain grates and manhole covers.
 for(let x=-18;x<=18;x+=6){
  const cover=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.045,16),mat(0x667582,.8,'metal'));cover.position.set(x,.075,12.95);scene.add(cover);world.push(cover);
  for(let k=-2;k<=2;k++)box(.045,.025,.42,0x293947,x+k*.14,.11,12.95);
 }
 // Painted shopfronts / signboards on the lane edges.
 const shopSigns=[['CHAI POINT',0xffd43b],['GUPSHUP',0x42e8ff],['NIMBU PANI',0xff709c],['GULLY MART',0xb9ff4b]];
 for(let i=0;i<4;i++){
  const x=-17+i*11.3, z= i%2===0 ? 15.2 : -19.2, col=shopSigns[i][1];
  box(5.1,2.9,.38,[0xe8b99b,0xf2d27b,0xa9d8ca,0xe6a8c7][i],x,1.45,z,{texture:'wall'});
  box(4.65,.75,.18,col,x,2.35,z+(z>0?-.25:.25));
  box(3.6,.1,.15,0xffffff,x,1.4,z+(z>0?-.27:.27));
  // striped canopy with alternating coloured panels
  for(let k=0;k<7;k++)box(.68,.08,1.05,k%2?0xffffff:col,x-2.05+k*.68,3.0,z+(z>0?-.55:.55));
  // counter and stacked produce crates
  box(3.7,.8,.65,0x89553b,x,.55,z+(z>0?-.8:.8),{solid:true});
  for(let k=0;k<3;k++)box(.62,.62,.55,[0xff6b6b,0xffd43b,0x55baff][k],x-1.1+k*1.1,.65,z+(z>0?-1.22:1.22),{solid:true});
 }
 // Door frames, grills and balconies get extra contrast on both houses.
 for(const cx of [-9,9]){
  for(let side of [-1,1]){
   box(1.25,2.25,.16,0x593c46,cx+side*3.1,1.15,5.0);
   box(.95,1.95,.08,side<0?0x9c7048:0x3d6f7b,cx+side*3.1,1.08,5.1);
   for(let k=0;k<4;k++)box(.045,1.0,.045,0xffd66b,cx+side*3.1-.34+k*.22,3.7,4.8);
  }
  // rooftop parapet corner posts, water drums and solar panels
  for(let sx of [-5.2,5.2])for(let sz of [-4.2,4.2])box(.28,1.05,.28,0xffd66b,cx+sx,24.0,sz);
  for(let k=0;k<3;k++){
   box(1.25,.08,.85,0x244e75,cx-3.5+k*1.35,24.18,-2.4);
   for(let sl=-1;sl<=1;sl++)box(.025,.025,.8,0x67d8ff,cx-3.5+k*1.35+sl*.3,24.23,-2.4);
  }
 }
 // Street trees: trunk, layered leafy crowns and low planter boxes.
 for(const [x,z] of [[-21,8],[21,8],[-21,-9],[21,-9],[-17,3],[17,3]]){
  box(1.15,.35,1.15,0x98704b,x,.18,z,{solid:true});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.23,2.2,7),mat(0x765039));trunk.position.set(x,1.35,z);scene.add(trunk);world.push(trunk);
  for(const [yy,rr,cc] of [[2.5,1.05,0x29965b],[3.1,.82,0x45b86a],[3.55,.58,0x78cf72]]){
   const leaves=new THREE.Mesh(new THREE.IcosahedronGeometry(rr,1),mat(cc));leaves.position.set(x,yy,z);scene.add(leaves);world.push(leaves);
  }
 }
 // Parked scooter silhouettes and bicycles add scale to the lane (decorative, no gameplay collision).
 for(const [x,z,paint] of [[-13,9,0xe84e63],[13,-9,0x36a8d8]]){
  for(const dx of [-.62,.62]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.28,.075,8,14),mat(0x202a35));wheel.position.set(x+dx,.31,z);wheel.rotation.y=Math.PI/2;scene.add(wheel);world.push(wheel)}
  box(1.15,.48,.48,paint,x,.72,z,{texture:'metal'});box(.45,.35,.38,0x313e50,x-.15,1.08,z);
  box(.5,.08,.3,0x252b35,x+.35,1.15,z);box(.25,.08,.18,0xffd43b,x-.6,1.05,z);
 }
 // Utility poles, overhead wires and colourful bunting across the lane.
 for(const x of [-20,0,20]){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,7,8),mat(0x6b6871));pole.position.set(x,3.5,8);scene.add(pole);world.push(pole);
  box(.8,.08,.08,0x3e4653,x,6.65,8);
 }
 for(let i=0;i<15;i++){
  const x=-18+i*2.55;const pennant=new THREE.Mesh(new THREE.ConeGeometry(.22,.42,3),mat([0xff4e8a,0xffd43b,0x42e8ff,0xb9ff4b][i%4]));pennant.rotation.x=Math.PI; pennant.position.set(x,4.9,6.8);scene.add(pennant);world.push(pennant);
 }
}
function spawnPickup(x,z,itemIndex){
 let g=new THREE.Group();scene.add(g);g.position.set(x,.12,z);
 let orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.38,1),new THREE.MeshStandardMaterial({color:items[itemIndex].color,emissive:items[itemIndex].color,emissiveIntensity:.5,metalness:.2,roughness:.3}));g.add(orb);
 let ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.045,8,24),mat(0xffffff));ring.rotation.x=Math.PI/2;g.add(ring);
 g.userData={itemIndex,baseY:g.position.y,phase:rand(0,6)};pickups.push(g);
}
function setup(){
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,180);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=false;
 clock=new THREE.Clock();buildWorld();
 player=makeCharacter(0,9,0x2e80ff,true);
 // Hide the local avatar mesh in first-person view; bot and world meshes remain visible.
 player.visible=false;makeHeldItem();
 for(let i=0;i<5;i++){const sp=[[-19,8],[-18,15],[-1,16],[1,17],[19,8]][i];let b=makeCharacter(sp[0],sp[1],[0xff4e8a,0x9b6cff,0xff7b3d,0x25b9a5,0xd9e74e][i]);initBot(b);bots.push(b)}
 for(let i=0;i<9;i++)spawnPickup(rand(-17,17),rand(-13,13),i%items.length);
 addEventListener('resize',resize);resize();bindControls();animate();
 $('loading').style.display='none';
}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;clearTimeout(lastToast);lastToast=setTimeout(()=>$('toast').style.opacity=0,1300)}
function hitFeedback(){const el=$('hitMarker');if(!el)return;el.classList.remove('show');void el.offsetWidth;el.classList.add('show')}
function updateHealthHud(){const bar=$('healthBar');bar.style.width=Math.max(0,health)+'%';bar.style.background=health<=30?'linear-gradient(90deg,#ff315d,#ff765e)':health<=60?'linear-gradient(90deg,#ffd43b,#ff9b42)':'linear-gradient(90deg,#b9ff4b,#42e8a1)';$('healthText').textContent=Math.max(0,Math.ceil(health));$('healthText').style.color=health<=30?'#ff5c7a':'#fff'}
function bindControls(){
 addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space')e.preventDefault();if(e.code==='KeyC')crouch=true;if(e.code==='KeyE')pickup();if(e.code==='Escape')togglePause();if(e.code==='KeyQ')swapItem(-1);if(e.code==='KeyR')swapItem(1)});
 addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyC')crouch=false});
 canvas.addEventListener('click',()=>{if(started&&!paused&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.()});
 addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&started&&!paused){yaw-=e.movementX*.00125;pitch-=e.movementY*.00105;pitch=Math.max(-1.553,Math.min(1.553,pitch))}});
 addEventListener('mousedown',e=>{if(e.button===0&&started&&!paused)attack()});
 addEventListener('wheel',e=>{if(started&&!paused)swapItem(e.deltaY>0?1:-1)});
 $('playBtn').onclick=()=>{started=true;$('overlay').classList.add('hidden');toast('GO GO GO! PICK UP ITEMS!')};
 $('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('restartBtn').onclick=()=>location.reload();
 $('mobileAttack').addEventListener('touchstart',e=>{e.preventDefault();attack()},{passive:false});
 $('mobileJump').addEventListener('touchstart',e=>{e.preventDefault();if(player.position.y<.05)velocityY=8},{passive:false});
 $('mobileSlide').addEventListener('touchstart',e=>{e.preventDefault();slideTime=.65},{passive:false});
 $('mobilePickup').addEventListener('touchstart',e=>{e.preventDefault();pickup()},{passive:false});
 const stick=$('stick'),knob=$('stickKnob');let active=false,origin={x:0,y:0};
 stick.addEventListener('touchstart',e=>{active=true;origin={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});
 stick.addEventListener('touchmove',e=>{if(!active)return;let t=e.touches[0],dx=t.clientX-origin.x,dy=t.clientY-origin.y;mobileMove.x=Math.max(-1,Math.min(1,dx/38));mobileMove.y=Math.max(-1,Math.min(1,dy/38));knob.style.transform=`translate(${mobileMove.x*27}px,${mobileMove.y*27}px)`},{passive:true});
 stick.addEventListener('touchend',()=>{active=false;mobileMove.x=mobileMove.y=0;knob.style.transform='translate(0,0)'});
}
let mobileMove={x:0,y:0};
function togglePause(){if(!started)return;paused=!paused;$('pauseOverlay').classList.toggle('hidden',!paused);if(paused)document.exitPointerLock?.();else canvas.requestPointerLock?.()}
function swapItem(d){currentItem=(currentItem+d+items.length)%items.length;updateItem();makeHeldItem();toast(items[currentItem].name.toUpperCase()+' EQUIPPED')}
function updateItem(){let it=items[currentItem];$('itemIcon').textContent=it.icon;$('itemName').textContent=it.name;$('itemType').textContent=it.type;$('itemPower').textContent=it.power}
let heldItemRoot=null,heldItemParts=[];
function clearHeldItem(){
 if(heldItemRoot&&camera)camera.remove(heldItemRoot);
 heldItemParts=[];heldItemRoot=null;
}
function makeHeldItem(){
 clearHeldItem();
 heldItemRoot=new THREE.Group();
 heldItemRoot.position.set(.42,-.34,-.72);
 heldItemRoot.rotation.set(-.15,-.22,-.18);
 camera.add(heldItemRoot);
 const metal=c=>new THREE.MeshStandardMaterial({color:c,metalness:.62,roughness:.32});
 const plastic=c=>new THREE.MeshStandardMaterial({color:c,roughness:.55});
 const part=(geo,material,pos,rot)=>{const m=new THREE.Mesh(geo,material);m.position.set(...pos);if(rot)m.rotation.set(...rot);heldItemRoot.add(m);heldItemParts.push(m);return m};
 const wood=plastic(0x9b633b),yellow=plastic(0xffd43b),pink