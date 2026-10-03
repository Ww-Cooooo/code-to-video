import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const query = new URLSearchParams(location.search);
const W = Number(query.get('width') || 1080), H = Math.round(W * 4 / 3);
const canvas = document.querySelector('#film');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d', {alpha: false});
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => {const q = clamp((v - a) / (b - a)); return q * q * (3 - 2 * q);};
const mix = (a, b, t) => a + (b - a) * t;
function random(seed) {let s = seed; return () => {s |= 0; s = s + 0x6D2B79F5 | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296;};}
const rng = random(67123);
const ink = '#193132', paper = '#e8ddc4', gold = '#e8b571';

const FONT = '"Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", sans-serif';
await document.fonts.ready;

// 三维场景：同一颗记忆核贯穿苏醒与生长。
const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.setClearColor(0x070c14, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.id = 'gpu'; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070c14);
scene.fog = new THREE.FogExp2(0x070c14, .022);
const camera = new THREE.PerspectiveCamera(43, W / H, .1, 100);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .65, .55, .64);
composer.addPass(bloom); composer.addPass(new OutputPass());
const root = new THREE.Group(); scene.add(root);
scene.add(new THREE.HemisphereLight(0x96bde3, 0x12120f, 1.5));
const light = new THREE.PointLight(0xffb86b, 24, 22, 1.5); light.position.set(0, 2, 2); scene.add(light);
const rim = new THREE.DirectionalLight(0x73cbd0, 3.5); rim.position.set(-4, 5, -2); scene.add(rim);

const noiseGLSL = `
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec3(1.7,9.2,3.4);a*=.5;}return v;}
`;
const coreMat = new THREE.ShaderMaterial({
  uniforms: {uTime:{value:0},uPower:{value:1}},
  vertexShader: `varying vec3 vN;varying vec3 vP;varying vec3 vV; void main(){vN=normalize(normalMatrix*normal);vP=position;vec4 p=modelViewMatrix*vec4(position,1.);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
  fragmentShader: `precision highp float;uniform float uTime;uniform float uPower;varying vec3 vN;varying vec3 vP;varying vec3 vV;${noiseGLSL}
  void main(){vec3 n=normalize(vN);float fr=pow(1.-abs(dot(n,normalize(vV))),2.6);vec3 p=vP*3.;float f=fbm(p+vec3(0,uTime*.13,0));float wave=sin((f*3.+vP.y*1.7-uTime*.15)*22.);float vein=pow(1.-abs(wave),13.);float hot=smoothstep(.44,.73,f);vec3 c=mix(vec3(.014,.043,.061),vec3(.24,.073,.018),hot);c+=vec3(.95,.37,.09)*vein*(.4+uPower)*hot;c+=vec3(.18,.65,.76)*fr*(.6+uPower*.2);float spec=pow(max(0.,dot(reflect(-normalize(vec3(-2,3,4)),n),normalize(vV))),64.);c+=spec*.8;gl_FragColor=vec4(c,1.);}`
});
const core = new THREE.Mesh(new THREE.SphereGeometry(.72, 96, 64), coreMat); root.add(core);
const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 2), new THREE.MeshBasicMaterial({color:0xa4d9dc,wireframe:true,transparent:true,opacity:.12})); root.add(shell);
const ringGroup = new THREE.Group(); root.add(ringGroup);
for(let k=0;k<5;k++){
  const curve=[];
  for(let i=0;i<=240;i++){const a=i/240*TAU;curve.push(new THREE.Vector3(Math.cos(a)*(1.18+k*.18),0,Math.sin(a)*(1.18+k*.18)));}
  const g=new THREE.BufferGeometry().setFromPoints(curve);
  const o=new THREE.Line(g,new THREE.LineBasicMaterial({color:k%2?0x77b9c4:0xe7a664,transparent:true,opacity:.36-k*.036}));
  o.rotation.set(.3+k*.38,0,k*.27); ringGroup.add(o);
}
const satellites=[];
for(let i=0;i<26;i++){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.025+rng()*.035),new THREE.MeshStandardMaterial({color:0xc3935e,metalness:.82,roughness:.22,emissive:0x472817,emissiveIntensity:.5}));
  m.userData={a:rng()*TAU,r:1.3+rng()*1.2,z:(rng()-.5)*1.5,s:rng()*.5+.1};satellites.push(m);root.add(m);
}

// 同源树结构同时用于纸面版画、工程蓝图与立体场景。
const branches=[];
function branch(start, direction, length, depth, birth, width, seed){
  const r=random(seed), end=start.clone().addScaledVector(direction,length);
  branches.push({a:start.clone(),b:end.clone(),birth,width,depth});
  if(depth===0)return;
  const children=depth>4?2:3;
  for(let j=0;j<children;j++){
    const angle=(j/children)*TAU+r()*1.1;
    const spread=.4+r()*.65;
    const next=direction.clone().multiplyScalar(.65).add(new THREE.Vector3(Math.cos(angle)*spread,.27+r()*.42,Math.sin(angle)*spread)).normalize();
    branch(end,next,length*(.55+r()*.3),depth-1,birth+length*.7,width*.64,seed*7+j*19+31);
  }
}
branch(new THREE.Vector3(0,-2.6,0),new THREE.Vector3(0,1,0),1.35,6,0,.16,194);
const maxBirth=Math.max(...branches.map(b=>b.birth));
const treeGroup = new THREE.Group(); scene.add(treeGroup);
const treePositions=[],treeNormals=[],treeBirth=[],treeSide=[];
for(const b of branches){
  const direction=b.b.clone().sub(b.a),len=direction.length();
  const bend=new THREE.Vector3(-direction.z,.025,direction.x).multiplyScalar(.14);
  const curve=new THREE.CatmullRomCurve3([b.a,b.a.clone().lerp(b.b,.35).add(bend),b.a.clone().lerp(b.b,.72).add(bend.clone().multiplyScalar(.65)),b.b]);
  const g=new THREE.TubeGeometry(curve,5,b.width,6,false);
  const gp=g.attributes.position;
  for(let i=0;i<gp.count;i++){
    const u=Math.floor(i/7)/5,center=curve.getPointAt(u),p=new THREE.Vector3().fromBufferAttribute(gp,i);
    p.sub(center).multiplyScalar(1-u*.4).add(center);gp.setXYZ(i,p.x,p.y,p.z);
  }
  g.computeVertexNormals();
  const ng=g.toNonIndexed();
  for(let i=0;i<ng.attributes.position.count;i++){
    const p=new THREE.Vector3().fromBufferAttribute(ng.attributes.position,i);treePositions.push(...p.toArray());
    const n=new THREE.Vector3().fromBufferAttribute(ng.attributes.normal,i);treeNormals.push(...n.toArray());
    treeBirth.push(b.birth+p.distanceTo(b.a)*.7);treeSide.push(b.depth/6);
  }
  g.dispose();ng.dispose();
}
const treeGeo=new THREE.BufferGeometry();treeGeo.setAttribute('position',new THREE.Float32BufferAttribute(treePositions,3));treeGeo.setAttribute('normal',new THREE.Float32BufferAttribute(treeNormals,3));treeGeo.setAttribute('aBirth',new THREE.Float32BufferAttribute(treeBirth,1));treeGeo.setAttribute('aDepth',new THREE.Float32BufferAttribute(treeSide,1));
const treeMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{uGrow:{value:0},uTime:{value:0}},
vertexShader:`attribute float aBirth;attribute float aDepth;varying float vBirth;varying float vDepth;varying vec3 vN;varying vec3 vP;void main(){vBirth=aBirth;vDepth=aDepth;vP=position;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:`uniform float uGrow;uniform float uTime;varying float vBirth;varying float vDepth;varying vec3 vN;varying vec3 vP;void main(){if(vBirth>uGrow)discard;float edge=exp(-abs(vBirth-uGrow)*25.);float pulse=pow(.5+.5*sin(vBirth*8.-uTime*3.),20.);float li=.25+.75*max(0.,dot(normalize(vN),normalize(vec3(-.5,.7,1))));float grain=.8+.2*sin(vP.y*80.+sin(vP.x*45.)*2.);vec3 c=mix(vec3(.08,.29,.32),vec3(.38,.19,.045),vDepth)*li*grain;c+=vec3(.7,.31,.06)*(edge*1.7+pulse*.42);gl_FragColor=vec4(c,1.);}`});
const treeMesh=new THREE.Mesh(treeGeo,treeMat);treeGroup.add(treeMesh);
const leafP=[],leafBirth=[],leafSize=[];
for(const b of branches.filter(b=>b.depth<=1)){
  for(let j=0;j<3;j++){leafP.push(b.b.x+(rng()-.5)*.23,b.b.y+(rng()-.5)*.23,b.b.z+(rng()-.5)*.23);leafBirth.push(b.birth+b.a.distanceTo(b.b)*.7);leafSize.push(2+rng()*4);}
}
const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute(leafP,3));leafGeo.setAttribute('aBirth',new THREE.Float32BufferAttribute(leafBirth,1));leafGeo.setAttribute('aSize',new THREE.Float32BufferAttribute(leafSize,1));
const leafMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uGrow:{value:0},uTime:{value:0},uScale:{value:H/1000}},
vertexShader:`attribute float aBirth;attribute float aSize;uniform float uGrow;uniform float uTime;uniform float uScale;varying float vAlpha;void main(){vAlpha=smoothstep(aBirth,aBirth+.15,uGrow)*(.65+.35*sin(aBirth*30.+uTime));vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=aSize*28./(-p.z)*uScale;}`,
fragmentShader:`varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vec3(1.,.63,.25),pow(1.-d,2.)*vAlpha);}`});
treeGroup.add(new THREE.Points(leafGeo,leafMat));
const ground=new THREE.Mesh(new THREE.CircleGeometry(23,120),new THREE.MeshStandardMaterial({color:0x101b24,metalness:.85,roughness:.32,transparent:true,opacity:.65}));ground.rotation.x=-Math.PI/2;ground.position.y=-2.68;scene.add(ground);
const groundRings=new THREE.Group();scene.add(groundRings);
for(let i=0;i<13;i++){
  const points=[];for(let j=0;j<=200;j++){const a=j/200*TAU;points.push(new THREE.Vector3(Math.cos(a)*(.6+i*.43),-2.65,Math.sin(a)*(.6+i*.43)));}
  groundRings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:i%3?0x456474:0xc9a16c,transparent:true,opacity:.12})));}
const dustPositions=[];
for(let i=0;i<2200;i++)dustPositions.push((rng()-.5)*22,(rng()-.35)*18,(rng()-.5)*20);
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xa9c8d2,size:.018,transparent:true,opacity:.65,sizeAttenuation:true}));scene.add(dust);

// 纸张噪声只生成一次，避免随帧闪烁。
const texture=document.createElement('canvas');texture.width=540;texture.height=720;
const tx=texture.getContext('2d'),image=tx.createImageData(540,720),pr=random(921);
for(let i=0;i<image.data.length;i+=4){const q=pr();image.data[i]=image.data[i+1]=image.data[i+2]=q<.5?30:255;image.data[i+3]=Math.floor(pr()*20);}
tx.putImageData(image,0,0);
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color,stroke=null,width=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function text(s,x,y,size,color,weight=450,align='center',family=FONT){ctx.font=`${weight} ${size}px ${family}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(s,x,y);}
function tracking(s,x,y,size,color,gap=5){ctx.font=`500 ${size}px ${FONT}`;const widths=[...s].map(c=>ctx.measureText(c).width),total=widths.reduce((a,b)=>a+b,0)+gap*(s.length-1);let left=x-total/2;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=color;[...s].forEach((c,i)=>{ctx.fillText(c,left,y);left+=widths[i]+gap;});}
function frameLabel(n,title,dark=false){const col=dark?'#77877f':'#aab5be';text(`0${n} / MEMORY STUDIES`,76,67,18,col,400,'left');text(title,1004,67,18,col,400,'right');line(76,96,1004,96,dark?'#19313230':'#d4e4f125',1);}
function grain(alpha=.3){ctx.globalAlpha=alpha;ctx.drawImage(texture,0,0,1080,1440);ctx.globalAlpha=1;}
function vignette(amount=.6){const g=ctx.createRadialGradient(540,640,200,540,680,850);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${amount})`);ctx.fillStyle=g;ctx.fillRect(0,0,1080,1440);}
function caption(main,sub,t,start,end,dark=false){
 const opacity=smooth(start,start+.5,t)*(1-smooth(end-.35,end,t));ctx.save();ctx.globalAlpha=opacity;
 if(!dark){const g=ctx.createLinearGradient(0,1070,0,1440);g.addColorStop(0,'#070c1400');g.addColorStop(.6,'#070c14c9');g.addColorStop(1,'#070c14ee');ctx.fillStyle=g;ctx.fillRect(0,1070,1080,370);}
 text(main,540,1230+(1-opacity)*16,43,dark?ink:'#f1e9d9',550);if(sub)tracking(sub,540,1303,16,dark?'#6b7062':'#94a7af',3);ctx.restore();}

function draw3D(t,mode){
 const growing=mode==='growth',final=mode==='final';
 const seedEnd=20.4,seedAbsorb=growing?smooth(19.65,seedEnd,t):0;
 // 先收起记忆核再生长，避免球体与树干同时占据同一空间。
 treeGroup.visible=final||(growing&&t>=seedEnd);ground.visible=growing||final;groundRings.visible=growing||final;
 root.visible=!final&&(!growing||t<seedEnd);const q=growing?clamp((t-19.5)/7.5):final?clamp((t-31)/5):t/4.5;
 root.position.set(0,growing?mix(-1.8,-2.6,seedAbsorb):0,0);
 root.scale.setScalar(growing?Math.max(.0001,.39*(1-seedAbsorb)):1.1);
 root.rotation.set(.1*Math.sin(t*.25),t*.19,.1);
 core.rotation.set(t*.07,t*.1,0);coreMat.uniforms.uTime.value=t;coreMat.uniforms.uPower.value=growing?2.1:1;
 shell.rotation.set(t*.04,-t*.08,.15);ringGroup.rotation.y=t*.14;
 satellites.forEach((m,i)=>{const d=m.userData,a=d.a+t*d.s;m.position.set(Math.cos(a)*d.r,Math.sin(a*.8+i)*.75,Math.sin(a)*d.r);m.rotation.set(t*d.s,t*.3,i);});
 treeGroup.rotation.y=growing?-0.45+q*.7: .25+q*.4;
 const grow=growing?mix(-.02,maxBirth+.8,Math.pow(smooth(seedEnd,26.325,t),.62)):maxBirth+.8;
 treeMat.uniforms.uGrow.value=grow;treeMat.uniforms.uTime.value=t;leafMat.uniforms.uGrow.value=grow;leafMat.uniforms.uTime.value=t;
 dust.rotation.y=t*.006;dust.rotation.z=Math.sin(t*.05)*.04;
 if(growing){const dist=mix(4.0,10.4,smooth(0,.82,q));camera.position.set(Math.sin(q*.7)*dist*.32,mix(-1.4,1.3,q),dist);camera.lookAt(0,mix(-1.65,-.1,smooth(0,.7,q)),0);bloom.strength=.62+Math.sin(q*Math.PI)*.15;}
 else if(final){camera.position.set(1.2-q*.8,1.3+q*.25,10.6+q*1.1);camera.lookAt(0,0,0);bloom.strength=.75;}
 else{camera.position.set(Math.sin(q*.7)*.8,.23+q*.3,mix(5.1,4.3,q));camera.lookAt(0,0,0);bloom.strength=.65;}
 composer.render();ctx.drawImage(renderer.domElement,0,0,1080,1440);
 if(!growing&&!final){
  ctx.save();ctx.translate(540,670);ctx.rotate(-.3+q*.04);ctx.strokeStyle='#abbdb922';ctx.lineWidth=1;
  for(let i=0;i<144;i++){const a=i/144*TAU;line(Math.cos(a)*410,Math.sin(a)*410,Math.cos(a)*(i%12===0?427:416),Math.sin(a)*(i%12===0?427:416),'#b8d8d136',1);}ctx.restore();
  text('EXPERIENCE / 0001',540,1060,18,'#b49773',450);frameLabel(1,'初始状态');caption('如果每次醒来，都从零开始。','A MIND WITHOUT A PAST',t,0,4.5);
 }else if(growing){frameLabel(6,'经验改变行动');
  if(t<23.2)caption('反思。尝试。验证。','REFLECT  /  TEST  /  VERIFY',t,19.5,23.2);else caption('让经验，真正改变行动。','UPDATE WHAT WORKS',t,23.2,27);
 }else{
  frameLabel(8,'记忆与自我进化');const a=smooth(31.2,32,t);ctx.globalAlpha=a;
  const g=ctx.createLinearGradient(0,830,0,1440);g.addColorStop(0,'#070c1400');g.addColorStop(.48,'#070c14db');g.addColorStop(1,'#070c14');ctx.fillStyle=g;ctx.fillRect(0,830,1080,610);
  tracking('AGENT',540,1040,23,'#cba573',10);text('让下一次',540,1134,66,'#f1e9d9',600);text('不再从零开始。',540,1225,66,'#f1e9d9',600);
  tracking('记忆 · 反思 · 自我进化',540,1332,23,'#9badb7',5);ctx.globalAlpha=1;
 }
 grain(.19);vignette(.28);
}

// 迷宫是真正相同的布局：第二次行动避开第一次的错误分支。
const mazeRng=random(886),N=13,cells=Array.from({length:N*N},()=>({walls:[true,true,true,true],visited:false}));
function carve(x,y){cells[y*N+x].visited=true;const dirs=[[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]].sort(()=>mazeRng()-.5);for(const[dx,dy,w,o]of dirs){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N||cells[ny*N+nx].visited)continue;cells[y*N+x].walls[w]=false;cells[ny*N+nx].walls[o]=false;carve(nx,ny);}}
carve(0,0);
function mazePath(goal){const todo=[[0]],seen=new Set([0]);while(todo.length){const path=todo.shift(),v=path.at(-1);if(v===goal)return path;const x=v%N,y=Math.floor(v/N);[[0,-1],[1,0],[0,1],[-1,0]].forEach(([dx,dy],i)=>{if(cells[v].walls[i])return;const id=(y+dy)*N+x+dx;if(!seen.has(id)){seen.add(id);todo.push([...path,id]);}});}return[];}
const correct=mazePath(N*N-1);
const deadEnds=cells.map((c,i)=>({i,path:mazePath(i),count:c.walls.filter(Boolean).length})).filter(c=>c.count===3&&c.i!==N*N-1&&c.path.length>15&&!correct.includes(c.i));
const wrong=(deadEnds.sort((a,b)=>b.path.length-a.path.length)[0]||{path:correct.slice(0,20)}).path;
function maze(t,success){
 const start=success?27:4.5,p=clamp((t-start)/4),progress=smooth(.06,.82,p);rect(0,0,1080,1440,success?'#0b171e':paper);
 const col=success?'#587379':ink;const ox=124,oy=285,size=832,step=size/N;
 ctx.save();ctx.translate(540,701);ctx.rotate(success?-.025:.025);ctx.translate(-540,-701);
 rect(ox-25,oy-25,size+50,size+50,success?'#0b171e':'#dfd1b6');
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const c=cells[y*N+x],px=ox+x*step,py=oy+y*step;
  if(c.walls[0])line(px,py,px+step,py,col,2.4);if(c.walls[3])line(px,py,px,py+step,col,2.4);
  if(y===N-1&&c.walls[2])line(px,py+step,px+step,py+step,col,2.4);if(x===N-1&&c.walls[1])line(px+step,py,px+step,py+step,col,2.4);
 }
 const toXY=id=>[ox+(id%N+.5)*step,oy+(Math.floor(id/N)+.5)*step];
 function route(path,f,color,width){ctx.beginPath();const count=(path.length-1)*f;for(let i=0;i<=Math.floor(count);i++){const[x,y]=toXY(path[i]);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}if(count<path.length-1){const a=toXY(path[Math.floor(count)]),b=toXY(path[Math.floor(count)+1]);ctx.lineTo(mix(a[0],b[0],count%1),mix(a[1],b[1],count%1));}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
 if(success){route(wrong,1,'#a7514c55',3);const[x,y]=toXY(wrong.at(-1));line(x-9,y-9,x+9,y+9,'#d7665b',3);line(x+9,y-9,x-9,y+9,'#d7665b',3);}
 const path=success?correct:wrong;ctx.shadowColor=success?'#73dcc9':'transparent';ctx.shadowBlur=success?15:0;route(path,progress,success?'#8de3c7':'#b24835',success?5:4);ctx.shadowBlur=0;
 const pos=(path.length-1)*progress,from=toXY(path[Math.floor(pos)]),to=toXY(path[Math.min(path.length-1,Math.floor(pos)+1)]),x=mix(from[0],to[0],pos%1),y=mix(from[1],to[1],pos%1);
 circle(x,y,10,success?'#ebefd2':'#b24835');circle(x,y,19,null,success?'#91e6c7':'#b2483580',1.4);
 if(!success&&p>.84){const a=smooth(.84,.95,p);ctx.globalAlpha=a;line(x-15,y-15,x+15,y+15,'#8e2d25',4);line(x+15,y-15,x-15,y+15,'#8e2d25',4);ctx.globalAlpha=1;}
 ctx.restore();
 frameLabel(success?7:2,success?'同一问题 / 不同选择':'一次尝试',!success);
 tracking(success?'RECALL → CHANGE':'TRIAL / 001',540,186,22,success?'#b4c5bd':ink,5);
 caption(success?'下一次，不再重蹈覆辙。':'经历过，不等于记得。',success?'THE SAME WORLD. A DIFFERENT CHOICE.':'EXPERIENCE IS NOT YET MEMORY',t,start,start+4,!success);
 grain(success?.2:.75);vignette(success?.2:.12);
}

function inkTree(t){
 rect(0,0,1080,1440,paper);const p=clamp((t-8.5)/4),grow=mix(.9,maxBirth+.8,smooth(0,.85,p));
 frameLabel(3,'筛选 / 提炼',true);
 // 木刻式圆盘、经纬线与纸面山脊。
 const cx=540,cy=650;circle(cx,cy,385,'#dcc8a1');
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,385,0,TAU);ctx.clip();
 for(let y=270;y<1040;y+=9){const wave=Math.sin(y*.022)*12;line(140,y,940,y+wave,'#8d836d35',1);}
 const rr=random(155);for(let i=0;i<155;i++){const x=130+rr()*820,y=280+rr()*780,len=10+rr()*55;line(x,y,x+len,y-4,'#7f735928',.8);}
 for(let k=0;k<5;k++){ctx.beginPath();ctx.moveTo(120,1030);for(let x=120;x<=960;x+=5){const y=1000-k*24-Math.sin(x*.013+k)*29-Math.sin(x*.035-k)*13;ctx.lineTo(x,y);}ctx.lineTo(960,1080);ctx.fillStyle=['#c4b595','#b6a987','#9a9978','#767f66','#45574b'][k];ctx.fill();}
 const scale=175;
 for(const b of branches){if(b.birth>grow)continue;const a=b.a,c=b.a.clone().lerp(b.b,clamp((grow-b.birth)/.25));const x1=cx+a.x*scale+(a.z*18),y1=1010-(a.y+2.6)*scale,x2=cx+c.x*scale+c.z*18,y2=1010-(c.y+2.6)*scale;line(x1,y1,x2,y2,ink,Math.max(.75,b.width*35));if(b.depth<2){circle(x2,y2,3.5,'#52674d');}}
 // 根部把散落经历收束到主干。
 for(let i=0;i<19;i++){const a=i/18*Math.PI;ctx.beginPath();ctx.moveTo(540,1010);ctx.bezierCurveTo(540+Math.cos(a)*30,1045,540+Math.cos(a)*90,1045+Math.sin(a)*30,540+Math.cos(a)*160,1090);ctx.strokeStyle='#19313280';ctx.lineWidth=1.4;ctx.stroke();}
 ctx.restore();circle(cx,cy,386,null,ink,1.7);circle(cx,cy,396,null,'#19313266',.7);
 circle(540,968,35,paper,ink,1.5);circle(540,968,24,'#b99a5c',ink,1);circle(540,968,13,null,'#f3e7c9',1.5);
 // 版画角标与少量真正有语义的注释。
 text('留下',130,330,36,ink,600);text('有用的',932,970,31,ink,500);rect(851,216,63,72,'#a44130');text('记',882,239,23,paper,600);text('忆',882,271,23,paper,600);
 caption('从经历里，留下有用的。','DISTILL EXPERIENCE INTO MEMORY',t,8.5,12.5,true);grain(.8);vignette(.11);
}

function blueprint(t){
 rect(0,0,1080,1440,'#10364c');const p=clamp((t-12.5)/4);
 for(let x=0;x<=1080;x+=27)line(x,0,x,1440,x%135===0?'#b7ddd91c':'#b7ddd909',1);
 for(let y=0;y<=1440;y+=27)line(0,y,1080,y,y%135===0?'#b7ddd91c':'#b7ddd909',1);
 frameLabel(4,'按需回忆');const cx=540,cy=660;
 for(let r=80;r<=350;r+=90){circle(cx,cy,r,null,'#96c6c64a',1);line(cx-r-12,cy,cx-r+12,cy,'#bddfce',1);line(cx+r-12,cy,cx+r+12,cy,'#bddfce',1);}
 const dots=[];for(let i=0;i<75;i++){const a=i*2.399963,r=45+Math.sqrt(i/75)*300;dots.push([cx+Math.cos(a+p*.12)*r,cy+Math.sin(a+p*.12)*r]);}
 for(let i=0;i<dots.length;i++){const a=dots[i];for(let j=i+1;j<dots.length;j++){const b=dots[j],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(d<105){line(...a,...b,'#a1c9c328',1);}}circle(...a,i%7===0?4:2.5,'#a5c5c17a');}
 const sel=[0,4,9,17,30,48,68];const head=clamp(p*1.55)*(sel.length-1);
 for(let i=0;i<sel.length;i++){
  const a=dots[sel[i]];if(i<head){circle(...a,6,'#f4d899');circle(...a,15,null,'#f4d89999',1);if(i>0){ctx.shadowColor='#f4d899';ctx.shadowBlur=14;line(...dots[sel[i-1]],...a,'#f4d899',2.5);ctx.shadowBlur=0;}}
 }
 ctx.save();ctx.translate(cx,cy);ctx.rotate(-p*.8);ctx.strokeStyle='#d1dec55a';ctx.setLineDash([4,12]);ctx.beginPath();ctx.arc(0,0,390,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();
 line(125,1080,955,1080,'#b7ddd955',1);text('全部记忆',125,1040,22,'#adc4c5',450,'left');text('只取相关',955,1040,22,'#ead29a',550,'right');
 text('RETRIEVAL / CONTEXT',540,202,22,'#bbd7d3',400);
 caption('在需要时，想起关键的一次。','NOT EVERYTHING. THE RIGHT THING.',t,12.5,16.5);grain(.4);vignette(.23);
}

function poster(t){
 const p=clamp((t-16.5)/3);rect(0,0,1080,1440,'#e9e0c9');
 ctx.save();ctx.translate(540,670);ctx.rotate(-.12+smooth(0,.3,p)*.015);ctx.translate(-540,-670);
 rect(-80,230,1240,630,'#ad362b');circle(540,530,278,'#152828');
 const r=random(431);for(let y=-255;y<=255;y+=10)for(let x=-255;x<=255;x+=10){const d=Math.hypot(x,y);if(d>260)continue;const a=Math.atan2(y,x),wave=Math.sin(d*.046-a*3+t*.5);const rad=(wave*.5+.5)*(1-d/340)*4.5;if(rad>1)circle(540+x,530+y,rad,'#e4bf87');}
 ctx.restore();
 text('记住',95,905,162,ink,850,'left');text('≠',842,895,159,'#ad362b',800);text('学会',982,1080,172,ink,850,'right');
 line(93,1197,987,1197,ink,3);text('记忆是起点。验证，才让方法更新。',540,1260,30,ink,500);
 tracking('MEMORY IS ONLY THE BEGINNING',540,1330,15,ink,3);
 frameLabel(5,'不是更多存储',true);grain(.9);vignette(.12);
}

function renderAt(time){
 const t=clamp(time,0,35.9999);ctx.save();ctx.setTransform(W/1080,0,0,H/1440,0,0);
 if(t<4.5)draw3D(t,'seed');else if(t<8.5)maze(t,false);else if(t<12.5)inkTree(t);else if(t<16.5)blueprint(t);else if(t<19.5)poster(t);else if(t<27)draw3D(t,'growth');else if(t<31)maze(t,true);else draw3D(t,'final');
 // 镜头切换保持短促，不用长淡入掩盖构图。
 for(const cut of [4.5,8.5,12.5,16.5,19.5,27,31]){const d=t-cut;if(d>=0&&d<.13){ctx.globalAlpha=(1-d/.13)*.3;rect(0,0,1080,1440,cut===19.5?'#e1bc83':'#e7ddc6');ctx.globalAlpha=1;}}
 const fade=1-smooth(0,.65,t)+smooth(35.4,36,t);if(fade>0){ctx.globalAlpha=clamp(fade);rect(0,0,1080,1440,'#060b12');ctx.globalAlpha=1;}
 ctx.restore();return true;
}
window.renderAt=renderAt;
// 只检查本示例定义的先后交接约束，不是通用碰撞检测器。
window.sceneState=()=>({memoryVisible:root.visible,treeVisible:treeGroup.visible});
window.filmInfo={width:W,height:H,duration:36,fps:30,branches:branches.length,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER)};
window.captureFrame=(t)=>{renderAt(t);return canvas.toDataURL('image/jpeg',.96).split(',')[1];};
renderAt(Number(query.get('time')||2));window.filmReady=true;
if(query.has('play')){const begin=performance.now();function tick(now){renderAt(((now-begin)/1000)%36);requestAnimationFrame(tick);}requestAnimationFrame(tick);}
