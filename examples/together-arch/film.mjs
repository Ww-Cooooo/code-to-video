import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {setup,smooth,lerp,clamp,TAU,text,rule,spaced,random} from './draw.mjs';
const art=await setup(1080,1440),{c,W,H}=art;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.domElement.id='gpu';document.body.appendChild(renderer.domElement);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d1820);scene.fog=new THREE.FogExp2(0x0d1820,.025);
const env=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.05).texture;env.dispose();
const camera=new THREE.PerspectiveCamera(37,W/H,.1,100);
scene.add(new THREE.HemisphereLight(0xc2d4e1,0x101210,.8));
const key=new THREE.DirectionalLight(0xffd5a8,2);key.position.set(-4,8,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.normalBias=.03;scene.add(key);
const cyan=new THREE.DirectionalLight(0x9de2df,1.15);cyan.position.set(5,3,-4);scene.add(cyan);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:0x10242c,metalness:.32,roughness:.62}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.565;floor.receiveShadow=true;scene.add(floor);
const stage=new THREE.Group();scene.add(stage);
const metal=new THREE.MeshStandardMaterial({color:0xb7784a,metalness:.78,roughness:.28});
const ceramic=new THREE.MeshStandardMaterial({color:0xa8aca1,metalness:.05,roughness:.58,envMapIntensity:.55});
const teal=new THREE.MeshStandardMaterial({color:0x437f7e,metalness:.55,roughness:.35});
const red=new THREE.MeshStandardMaterial({color:0xe77b43,metalness:.38,roughness:.32,emissive:0x51220c,emissiveIntensity:.25});
const N=15,inner=2.02,outer=2.55,centerY=-1.35,depth=1.2,blocks=[];
for(let i=0;i<N;i++){
 const start=i/N*Math.PI+.0135,end=(i+1)/N*Math.PI-.0135,a=(start+end)/2,r=(inner+outer)/2;
 const shape=new THREE.Shape();shape.moveTo(Math.cos(start)*inner,Math.sin(start)*inner);shape.absarc(0,0,inner,start,end,false);shape.lineTo(Math.cos(end)*outer,Math.sin(end)*outer);shape.absarc(0,0,outer,end,start,true);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:2,steps:1,curveSegments:12});geometry.translate(-Math.cos(a)*r,-Math.sin(a)*r,-depth/2);
 const material=i===7?red:i%4===0?teal:i%3===0?metal:ceramic;
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;
 const goal=new THREE.Vector3(Math.cos(a)*r,centerY+Math.sin(a)*r,0);
 blocks.push({mesh,goal,a,rank:Math.min(i,N-1-i),i});stage.add(mesh);
}
const piers=[];
for(const side of [-1,1]){
 const pier=new THREE.Mesh(new THREE.BoxGeometry(.79,1.2,1.58),metal);pier.position.set(side*2.285,-1.95,0);pier.castShadow=true;pier.receiveShadow=true;stage.add(pier);piers.push(pier);
 const plinth=new THREE.Mesh(new THREE.BoxGeometry(1.06,.14,1.85),teal);plinth.position.set(side*2.285,-2.49,0);plinth.castShadow=true;stage.add(plinth);
}
// 两条弧线是装配路径提示，不是统计图。
const rails=[];
for(const z of [-.635,.635]){
 const pts=[];for(let i=0;i<=180;i++){const a=i/180*Math.PI;pts.push(new THREE.Vector3(Math.cos(a)*(outer+.022),centerY+Math.sin(a)*(outer+.022),z));}
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x83c6be,transparent:true,opacity:.18}));stage.add(line);rails.push(line);
}
const signal=new THREE.Mesh(new THREE.OctahedronGeometry(.145,0),new THREE.MeshStandardMaterial({color:0xffdc9f,emissive:0xffaa50,emissiveIntensity:2.2,metalness:.3,roughness:.2}));stage.add(signal);
const signalLight=new THREE.PointLight(0xffb968,2.7,3.4,2);signal.add(signalLight);
const guide=new THREE.GridHelper(20,40,0x365b64,0x203c45);guide.position.y=-2.556;guide.material.transparent=true;guide.material.opacity=.34;scene.add(guide);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(W,H),.14,.3,1.6);composer.addPass(bloom);composer.addPass(new OutputPass());
function caption(main,sub,t,a,b){const q=smooth(a,a+.5,t)*(1-smooth(b-.4,b,t));c.save();c.globalAlpha=q;const g=c.createLinearGradient(0,1060,0,1440);g.addColorStop(0,'#0d182000');g.addColorStop(.6,'#0d1820c9');g.addColorStop(1,'#0d1820');c.fillStyle=g;c.fillRect(0,1060,1080,380);text(c,main,540,1218,41,'#e9e6d6',550);spaced(c,sub,540,1295,16,'#95aaa9',3);c.restore();}
function render(t){
 art.begin();const assembling=smooth(4.5,12,t);
 blocks.forEach(({mesh,goal,a,rank,i})=>{
  const p=smooth(4.5+rank*.66,6.6+rank*.66,t),radius=lerp(3.65,(inner+outer)/2,p);
  // 沿各自径向接近装配位置，保留块间缝隙，避免穿过已装配件。
  mesh.position.set(Math.cos(a)*radius,centerY+Math.sin(a)*radius+(1-p)*.18*Math.sin(t*.65+i),lerp((i%2?1:-1)*.32,0,p));
  mesh.rotation.set((1-p)*.08*Math.sin(t*.4+i),(1-p)*.23*Math.sin(i*2+t*.3),(1-p)*.03*Math.cos(i+t*.4));
 });
 stage.rotation.y=lerp(-.2,.34,smooth(7,19,t));
 rails.forEach(l=>{l.material.opacity=.12+smooth(10,14,t)*.55;l.geometry.setDrawRange(0,Math.max(2,Math.floor(181*smooth(10.5,14.5,t))));});
 const travel=smooth(14,19.6,t),a=Math.PI*(1-travel),r=outer+.185;signal.visible=t>=14&&t<20.5;signal.position.set(Math.cos(a)*r,centerY+Math.sin(a)*r,.02);signal.rotation.set(t*.6,t*.8,0);signal.scale.setScalar(smooth(14,14.4,t)*(1-smooth(20,20.5,t)));
 const distance=lerp(17.2,13,smooth(3,13,t));camera.position.set(lerp(.0,1.8,smooth(10,24,t)),lerp(1.7,1.0,smooth(5,18,t)),distance);camera.lookAt(0,-.15,0);
 composer.render();c.drawImage(renderer.domElement,0,0,1080,1440);
 text(c,'FORM / TOGETHER',75,74,19,'#a4bab9',550,'left');rule(c,75,113,1005,113,'#b3ceca35',1);text(c,'一份关于协作的形状研究',1005,74,17,'#8ea6a8',400,'right');
 if(t<5)caption('各有所长，不等于能够协作。','CAPABILITY IS ONLY THE START',t,0,5);
 else if(t<11)caption('找到位置，也对齐彼此。','ALIGN BEFORE YOU ASSEMBLE',t,5,11);
 else if(t<16)caption('让每一次交接，都接得起来。','CONNECT THE WORK, NOT JUST THE TOOLS',t,11,16);
 else if(t<20)caption('一条完整的路，才开始出现。','FROM FRAGMENTS TO A SHARED PATH',t,16,20);
 else{
  const o=smooth(20,21,t);c.save();c.globalAlpha=o;const g=c.createLinearGradient(0,1000,0,1440);g.addColorStop(0,'#0d182000');g.addColorStop(1,'#0d1820');c.fillStyle=g;c.fillRect(0,1000,1080,440);
  text(c,'协作的形状',540,1150,91,'#ede7d8',700);text(c,'让不同的能力，形成同一股力量。',540,1262,31,'#a9c1bd',450);spaced(c,'BETTER, TOGETHER.',540,1340,17,'#cd936b',5);c.restore();
 }
 art.grain(.18);art.finish(t,'#0d1820');
}
window.inspectAssembly=()=>blocks.map(b=>({i:b.i,position:b.mesh.position.toArray(),goal:b.goal.toArray()}));
art.publish(render);
