import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {setup,smooth,lerp,clamp,TAU,text,rule,spaced,random} from './draw.mjs';
const art=await setup(1920,1080),{c,W,H}=art;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.domElement.id='gpu';document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.setClearColor(0,0);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xefd9c6,.018);
const camera=new THREE.PerspectiveCamera(37,W/H,.1,100);
const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.05).texture;room.dispose();
scene.add(new THREE.HemisphereLight(0xf0f4ff,0xdca982,1.1));
const sun=new THREE.DirectionalLight(0xfff1da,2.1);sun.position.set(-4,9,-5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;sun.shadow.radius=4;scene.add(sun);
const fill=new THREE.DirectionalLight(0xc1dce6,.7);fill.position.set(6,3,5);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xc3a887,roughness:1,transparent:true,opacity:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.2;floor.receiveShadow=true;scene.add(floor);
const plane=new THREE.Group();scene.add(plane);
const start=[new THREE.Vector3(0,0,-1.8),new THREE.Vector3(-1.65,0,-1.8),new THREE.Vector3(-1.65,0,1.5),new THREE.Vector3(0,0,1.5),new THREE.Vector3(1.65,0,1.5),new THREE.Vector3(1.65,0,-1.8)];
const end=[new THREE.Vector3(0,.04,-2.4),new THREE.Vector3(-1.8,.05,1.45),new THREE.Vector3(-.31,-.03,1.05),new THREE.Vector3(0,-.35,1.4),new THREE.Vector3(.31,-.03,1.05),new THREE.Vector3(1.8,.05,1.45)];
const triangles=[[0,2,1],[0,3,2],[0,4,3],[0,5,4]];
const position=new Float32Array(36),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));
const materials=[0xfffcf1,0xe9e9e3,0xf9f5eb,0xf4eee4].map(color=>new THREE.MeshStandardMaterial({color,roughness:.86,metalness:0,side:THREE.DoubleSide}));
triangles.forEach((v,i)=>geometry.addGroup(i*3,3,i));
const paperMesh=new THREE.Mesh(geometry,materials);paperMesh.castShadow=true;paperMesh.receiveShadow=true;plane.add(paperMesh);
const pairs=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,2],[0,3],[0,4]],edgeArray=new Float32Array(pairs.length*6),edgeGeometry=new THREE.BufferGeometry();edgeGeometry.setAttribute('position',new THREE.BufferAttribute(edgeArray,3));
plane.add(new THREE.LineSegments(edgeGeometry,new THREE.LineBasicMaterial({color:0x9e887a,transparent:true,opacity:.48})));
const verts=start.map(v=>v.clone());
function fold(p){
 for(let i=0;i<6;i++){
  verts[i].copy(start[i]).lerp(end[i],p);
  if(i===1||i===5)verts[i].y+=Math.sin(p*Math.PI)*.55;
 }
 let n=0;for(const tri of triangles)for(const idx of tri)for(const a of verts[idx].toArray())position[n++]=a;
 geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 n=0;for(const pair of pairs)for(const idx of pair)for(const a of verts[idx].toArray())edgeArray[n++]=a;
 edgeGeometry.attributes.position.needsUpdate=true;edgeGeometry.computeBoundingSphere();
}
function flight(t){const q=clamp((t-9.5)/14.5),s=smooth(0,1,q);return new THREE.Vector3(Math.sin(q*Math.PI)**2*2.3,-.65+smooth(0,.35,q)*.9+q*1.2,-s*8.5);}
const trailCount=96,trailArray=new Float32Array(trailCount*3),trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailArray,3));
const trail=new THREE.Line(trailGeo,new THREE.LineDashedMaterial({color:0xd59a6a,dashSize:.1,gapSize:.09,transparent:true,opacity:.65}));scene.add(trail);
const cloudRng=random(832),clouds=[];const cloudMat=new THREE.MeshStandardMaterial({color:0xfff7e8,roughness:1,transparent:true,opacity:.42,depthWrite:false});
for(let i=0;i<11;i++){
 const group=new THREE.Group(),side=i%2?1:-1;
 group.position.set(side*(5+cloudRng()*7),2.3+cloudRng()*4,-4-i*2.7);
 for(let j=0;j<5;j++){const m=new THREE.Mesh(new THREE.SphereGeometry(.6+cloudRng()*.7,16,12),cloudMat);m.position.set(j*.8,Math.sin(j*2)*.18,cloudRng()*.5);m.scale.set(1.3,.5+cloudRng()*.22,1);group.add(m);}
 scene.add(group);clouds.push(group);
}
const lines=new THREE.Group();scene.add(lines);
for(let k=0;k<3;k++){
 const pts=[];for(let i=0;i<120;i++){const x=-12+i*.21;pts.push(new THREE.Vector3(x,-1.19,Math.sin(x*.26+k)*.8+k*1.2-1));}
 lines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xbd9478,transparent:true,opacity:.13})));
}
function caption(main,sub,t,a,b){const o=smooth(a,a+.6,t)*(1-smooth(b-.35,b,t));c.save();c.globalAlpha=o;text(c,main,960,923,42,'#5a574c',600);spaced(c,sub,960,985,17,'#8b8173',3);c.restore();}
function render(t){
 art.begin();const sky=c.createLinearGradient(0,0,0,1080);sky.addColorStop(0,'#c9dce4');sky.addColorStop(.53,'#efdfcc');sky.addColorStop(1,'#e8c7ac');c.fillStyle=sky;c.fillRect(0,0,1920,1080);
 const foldP=smooth(3.3,9,t);fold(foldP);
 if(t<9.5){plane.position.set(0,lerp(-1.15,-.65,foldP),0);plane.rotation.set(0,lerp(-.28,.05,smooth(0,9.5,t)),0);}
 else{plane.position.copy(flight(t));const next=flight(t+.03),d=next.sub(plane.position);const yaw= Math.atan2(-d.x,-d.z||1e-6);plane.rotation.set(.07+Math.sin((t-9.5)*.4)*.06,yaw*smooth(9.5,11,t),Math.sin((t-9.5)*.44)*.13*smooth(9.5,11,t));}
 const lift=smooth(8,10,t);floor.material.opacity=1-lift;floor.visible=lift<1;lines.visible=t<11.5;
 clouds.forEach((o,i)=>{o.visible=t>9;o.position.y=2.3+(i%4)*.7+Math.sin(t*.12+i)*.1;});
 trail.visible=t>10;
 for(let i=0;i<trailCount;i++){const tt=Math.max(9.5,t-4.2+i/(trailCount-1)*3.9);const p=flight(tt);trailArray[i*3]=p.x;trailArray[i*3+1]=p.y+.05;trailArray[i*3+2]=p.z+.3;}
 trailGeo.attributes.position.needsUpdate=true;trailGeo.computeBoundingSphere();trail.computeLineDistances();
 const focus=plane.position.clone(),ending=smooth(17,19,t);focus.x+=ending*1.1;
 if(t<9.5){const q=smooth(0,9.5,t);camera.position.set(lerp(2.8,4.3,q),lerp(4.7,3.0,q),lerp(-5.5,-6.6,q));camera.lookAt(0,-.7,0);}
 else{camera.position.copy(plane.position).add(new THREE.Vector3(3.8+Math.sin(t*.14)*.7,2.6,-6.7-ending*.8));camera.lookAt(focus);}
 renderer.render(scene,camera);c.drawImage(renderer.domElement,0,0,1920,1080);
 text(c,'A SMALL BEGINNING',100,82,19,'#63747a',550,'left');rule(c,99,115,379,115,'#63747a55',1.5);
 if(t<4.3)caption('一个想法，最初只是一张纸。','EVERY JOURNEY STARTS SMALL',t,0,4.3);
 else if(t<9.5)caption('给它形状，也给它方向。','MAKE ROOM FOR POSSIBILITY',t,4.3,9.5);
 else if(t<17)caption('不必等风来，先试着出发。','TURN AN IDEA INTO A FIRST STEP',t,9.5,17);
 else{
  c.save();c.globalAlpha=smooth(17,18.3,t);text(c,'折向',146,433,99,'#3d5966',700,'left');text(c,'远方',146,559,99,'#3d5966',700,'left');
  rule(c,150,656,368,656,'#b87850',3);text(c,'让想法，离开纸面。',150,720,33,'#6f756d',500,'left');spaced(c,'LET IDEAS TAKE FLIGHT',356,798,16,'#788282',2);c.restore();
 }
 art.grain(.13);art.finish(t,'#e9d8c5');
}
window.inspectPaper=()=>({minWorldY:Math.min(...verts.map(v=>plane.localToWorld(v.clone()).y)),floorVisible:floor.visible,floorY:-1.2,screen:verts.map(v=>{const p=plane.localToWorld(v.clone()).project(camera);return [(p.x*.5+.5)*1920,(-p.y*.5+.5)*1080];})});
art.publish(render);
