export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export const ease=x=>{x=clamp(x);return 1-Math.pow(1-x,3);};
export const TAU=Math.PI*2;
export const FONT='"Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", sans-serif';
export function random(seed){let s=seed;return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function text(c,str,x,y,size,color,weight=500,align='center'){c.font=`${weight} ${size}px ${FONT}`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(str,x,y);}
export function rule(c,x1,y1,x2,y2,color,width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
export function circle(c,x,y,r,color,stroke=null,width=1){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
export function spaced(c,str,x,y,size,color,gap=3){c.font=`500 ${size}px ${FONT}`;const widths=[...str].map(v=>c.measureText(v).width);let left=x-(widths.reduce((a,b)=>a+b,0)+(str.length-1)*gap)/2;c.textAlign='left';c.textBaseline='middle';c.fillStyle=color;[...str].forEach((v,i)=>{c.fillText(v,left,y);left+=widths[i]+gap;});}
export async function setup(bw,bh){
 const p=await fetch('./project.json').then(r=>r.json()),q=new URLSearchParams(location.search);
 const W=Number(q.get('width')||p.width),H=Number(q.get('height')||p.height);
 const canvas=document.querySelector('#film');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d',{alpha:false});
 await document.fonts.ready;
 const grain=document.createElement('canvas');grain.width=256;grain.height=256;const gc=grain.getContext('2d'),im=gc.createImageData(256,256),rng=random(9513);
 for(let i=0;i<im.data.length;i+=4){const v=rng()<.5?0:255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=rng()*25;}gc.putImageData(im,0,0);
 return {c,W,H,p,bw,bh,begin(){c.save();c.setTransform(W/bw,0,0,H/bh,0,0);},grain(alpha=.25){c.save();c.globalAlpha=alpha;c.drawImage(grain,0,0,bw,bh);c.restore();},finish(t,bg='#0b1720'){const a=1-smooth(0,.4,t)+smooth(p.duration-.7,p.duration,t);if(a>0){c.globalAlpha=clamp(a);c.fillStyle=bg;c.fillRect(0,0,bw,bh);}c.restore();},publish(render){window.renderAt=render;window.filmInfo={width:W,height:H,duration:p.duration,fps:p.fps};render(0);window.filmReady=true;if(q.has('play')){const start=performance.now();function tick(now){render(((now-start)/1000)%p.duration);requestAnimationFrame(tick);}requestAnimationFrame(tick);}}};
}
