import {setup,random,smooth,clamp,lerp,TAU,text,rule,circle,spaced} from './draw.mjs';
const art=await setup(1080,1440),{c}=art;
const paper='#eee8dc',ink='#19292e',red='#dc4d32',blue='#4d6f9f';
const rng=random(1901),marks=Array.from({length:330},()=>({x:60+rng()*960,y:210+rng()*830,w:2+rng()*28,a:rng()*TAU,v:.3+rng(),type:Math.floor(rng()*4)}));
function header(label){text(c,'FIELD NOTES',76,75,18,ink,550,'left');text(c,label,1004,75,18,ink,500,'right');rule(c,76,109,1004,109,'#19292e40');}
function footer(main,sub,t,a,b){const q=smooth(a,a+.5,t)*(1-smooth(b-.35,b,t));c.save();c.globalAlpha=q;text(c,main,540,1212,43,ink,600);spaced(c,sub,540,1282,17,'#626c6a',3);c.restore();}
function base(){c.fillStyle=paper;c.fillRect(0,0,1080,1440);}
function clutter(t){
 header('01 / 太多声音');
 const settle=smooth(.5,3.7,t);
 for(let i=0;i<marks.length;i++){
  const m=marks[i],x=m.x+Math.sin(t*m.v+m.a)*24,y=m.y+Math.cos(t*m.v*.7+m.a)*18;
  c.save();c.translate(x,y);c.rotate(Math.sin(t*.3+i)*.4);c.globalAlpha=.25+.4*Math.abs(Math.sin(i+t));
  if(m.type===0){rule(c,0,0,m.w*2,0,i%9===0?red:ink,1.4);rule(c,0,6,m.w,6,ink,.6);}
  if(m.type===1)text(c,['?','01','+','…'][i%4],0,0,12+m.w*.8,i%11===0?red:ink,400);
  if(m.type===2){c.strokeStyle=ink;c.lineWidth=1;c.strokeRect(0,0,m.w*.8,m.w*.6);}
  if(m.type===3)circle(c,0,0,m.w*.14,ink);
  c.restore();
 }
 const bannerY=535+Math.sin(t*.7)*8;
 c.save();c.translate(540,bannerY);c.rotate(-.075);c.fillStyle=red;c.fillRect(-420,-118,840,253);
 text(c,'太多，不等于更好',0,4,66,paper,800);c.restore();
 // 一条明确的线从碎片中出现，为下一镜接力。
 const x=80+settle*920;rule(c,80,955,x,955,red,5);circle(c,x,955,9,red);
 footer('当每个声音，都在争夺注意。','MORE INPUT. LESS CLARITY.',t,0,4);
}
function filter(t){
 const q=(t-4)/5;header('02 / 留下相关');
 text(c,'不是更多。',88,226,84,ink,750,'left');
 const cx=546,cy=683,R=255;
 circle(c,cx+15,cy+18,R+4,'#b9ae9737');circle(c,cx,cy,R,paper,ink,2.5);circle(c,cx,cy,R-14,null,'#19292e36',1);
 for(let i=0;i<67;i++){
  const angle=i/67*TAU,rr=R+26;rule(c,cx+Math.cos(angle)*rr,cy+Math.sin(angle)*rr,cx+Math.cos(angle)*(rr+(i%5===0?15:6)),cy+Math.sin(angle)*(rr+(i%5===0?15:6)),'#19292e80',1);
 }
 // 左侧杂乱输入，右侧只有三束连续线索。
 for(let row=0;row<37;row++){
  const y=430+row*13.5;
  c.beginPath();for(let x=60;x<530;x+=7){const amp=(1-smooth(310,530,x))*17;const yy=y+Math.sin(x*.045+t*3+row*3)*amp;if(x===60)c.moveTo(x,yy);else c.lineTo(x,yy);}c.strokeStyle=row%11===0?red:'#19292e28';c.lineWidth=row%11===0?2.2:.85;c.stroke();
 }
 c.save();c.beginPath();c.arc(cx,cy,R-16,0,TAU);c.clip();
 for(let i=0;i<52;i++){const xx=335+((i*29+t*49)%423),yy=cy+Math.sin(i*8)*178;rule(c,xx,yy,xx+12,yy,i%8===0?red:'#19292e33',i%8===0?2:1);}
 c.fillStyle=ink;c.fillRect(534,440,24,486);c.fillStyle=paper;c.fillRect(531,cy-71,30,142);
 for(let row=0;row<3;row++){c.beginPath();for(let x=450;x<=1010;x+=5){const spread=smooth(540,870,x);const yy=cy+(row-1)*lerp(18,69,spread)+Math.sin(x*.014-t*1.2+row*.5)*lerp(5,19,spread);if(x===450)c.moveTo(x,yy);else c.lineTo(x,yy);}c.strokeStyle=row===1?red:blue;c.lineWidth=row===1?5:2;c.stroke();}
 c.restore();
 for(let row=0;row<3;row++){c.beginPath();for(let x=cx+R-10;x<1015;x+=5){const yy=cy+(row-1)*69+Math.sin(x*.014-t*1.2+row*.5)*19;if(x===cx+R-10)c.moveTo(x,yy);else c.lineTo(x,yy);}c.strokeStyle=row===1?red:blue;c.lineWidth=row===1?5:2;c.stroke();}
 const pulse=(t*.33)%1,px=lerp(570,995,pulse),py=cy+Math.sin(px*.014-t*1.2)*19;circle(c,px,py,7,red);
 text(c,'而是更清楚。',1000,1033,70,ink,750,'right');
 footer('筛掉无关，才看得见方向。','CHOOSE WHAT MATTERS',t,4,9);
}
function waves(t){
 const q=clamp((t-9)/5);header('03 / 线索开始连接');
 text(c,'把碎片',92,222,76,ink,700,'left');text(c,'连成一句话。',990,322,76,red,700,'right');
 c.save();c.beginPath();c.rect(72,410,936,622);c.clip();
 for(let k=0;k<31;k++){
  c.beginPath();for(let x=45;x<=1050;x+=4){
   const n=(1-smooth(.03,.83,q))*(Math.sin(x*.08+k*2+t*1.1)*18+Math.cos(x*.039-k*1.5)*23);
   const envelope=Math.pow(Math.sin(clamp((x-70)/940)*Math.PI),1.5);
   const y=720+(k-15)*11+Math.sin(x*.009-t*.38+k*.11)*envelope*lerp(100,187,q)+n;
   if(x===45)c.moveTo(x,y);else c.lineTo(x,y);
  }c.strokeStyle=k===15?red:k%3===0?ink:'#4d6f9f88';c.lineWidth=k===15?6:k%3===0?2:1;c.stroke();
 }
 c.restore();rule(c,73,1049,1008,1049,'#19292e50');
 const scan=100+q*880;rule(c,scan,390,scan,1065,'#dc4d3280',1.3);circle(c,scan,1065,5,red);
 footer('让相关的线索，彼此连接。','LESS NOISE. MORE MEANING.',t,9,14);
}
function cover(t){
 const q=smooth(14,15,t);header('SIGNAL / NOT NOISE');
 circle(c,649,617,324,red);
 c.save();c.beginPath();c.rect(73,244,935,738);c.clip();
 for(let k=0;k<59;k++){
  c.beginPath();for(let x=65;x<=1045;x+=4){
   const u=(x-540)/490,bulge=Math.exp(-u*u*2.2),w=Math.sin(x*.010+k*.059-t*.31);
   const y=604+(k-29)*10.9+w*bulge*(83+Math.sin(k*.14+t*.13)*75);
   if(x===65)c.moveTo(x,y);else c.lineTo(x,y);
  }c.strokeStyle=k%7===0?paper:ink;c.lineWidth=k%7===0?2.7:1.75;c.stroke();
 }
 c.restore();
 c.save();c.globalAlpha=q;text(c,'噪声之外',76,1117,126,ink,850,'left');
 text(c,'找到值得听见的声音。',82,1238,38,ink,500,'left');
 spaced(c,'CLARITY IS A CHOICE',788,1330,16,ink,2.4);rule(c,80,1326,467,1326,red,3);c.restore();
}
function render(t){art.begin();base();if(t<4)clutter(t);else if(t<9)filter(t);else if(t<14)waves(t);else cover(t);art.grain(.6);art.finish(t,paper);}
art.publish(render);
