// 此画面只验证可定位时间、比例与输出链路。正式制作应按分镜替换。
const project = await fetch('./project.json').then(r => {
  if (!r.ok) throw new Error('无法载入 project.json');
  return r.json();
});
const params = new URLSearchParams(location.search);
const width = Number(params.get('width') || project.width);
const height = Number(params.get('height') || project.height);
const canvas = document.querySelector('#film');
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d', {alpha: false});
const font = '"Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", sans-serif';
await document.fonts.ready;

function renderAt(time) {
  const t = Math.min(project.duration, Math.max(0, time));
  const p = t / project.duration;
  ctx.fillStyle = '#101923';
  ctx.fillRect(0, 0, width, height);
  const unit = Math.min(width, height);
  const cx = width / 2, cy = height * .46;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, unit * (.10 + i * .024), t * .14 + i * .1, t * .14 + i * .1 + Math.PI * 1.7);
    ctx.lineWidth = unit * .002;
    ctx.strokeStyle = i === 3 ? '#eec990' : '#607782';
    ctx.stroke();
  }
  const a = p * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx + Math.cos(a) * unit * .17, cy + Math.sin(a) * unit * .17, unit * .025, 0, Math.PI * 2);
  ctx.fillStyle = '#eec990';
  ctx.fill();
  ctx.font = `500 ${unit * .034}px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9e4d8';
  ctx.fillText(project.title, cx, height * .8, width * .86);
  ctx.font = `${unit * .021}px sans-serif`;
  ctx.fillStyle = '#94a8b1';
  ctx.fillText('REPLACE THIS SCENE WITH YOUR STORY', cx, height * .86, width * .86);
}

window.renderAt = renderAt;
window.filmInfo = {width, height, duration: project.duration, fps: project.fps};
renderAt(0);
window.filmReady = true;
if (params.has('play')) {
  const begin = performance.now();
  const tick = now => {
    renderAt(((now - begin) / 1000) % project.duration);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
