#!/usr/bin/env python3
"""代码动画的本地预览、导出与核验。不会安装依赖或连接日常浏览器。"""
from __future__ import annotations

import argparse
import base64
import functools
import importlib.util
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
from fractions import Fraction
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlencode, urlsplit

SKILL_ROOT = Path(__file__).resolve().parent.parent


def fail(message):
    raise ValueError(message)


def run(command):
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(f'命令失败（{result.returncode}）：{result.stderr[-3000:]}')
    return result


def inside(root, relative):
    if not isinstance(relative, str) or Path(relative).is_absolute():
        fail('项目引用必须使用工程内的相对路径')
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        fail(f'项目引用必须位于工程内：{relative}')
    return path


def load_project(folder):
    root = Path(folder).resolve()
    config = json.loads((root / 'project.json').read_text(encoding='utf-8'))
    for key in ('width', 'height', 'fps'):
        value = config.get(key)
        if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            fail(f'{key} 必须为正整数')
    if config['width'] % 2 or config['height'] % 2:
        fail('H.264 yuv420p 输出要求宽和高均为偶数')
    duration = config.get('duration')
    if isinstance(duration, bool) or not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0:
        fail('duration 必须为有限正数')
    frames = duration * config['fps']
    if abs(frames - round(frames)) > 1e-6:
        fail('duration × fps 必须为整数帧，避免静默改变片长')
    entry = config.get('entry', 'index.html')
    if not inside(root, entry).is_file():
        fail(f'找不到动画入口：{entry}')
    config['entry'] = entry
    if config.get('audio'):
        audio = config['audio']
        if not isinstance(audio, dict) or not isinstance(audio.get('path'), str):
            fail('audio 应包含工程内相对路径 path')
        if not inside(root, audio['path']).is_file():
            fail('找不到配置的音轨；请先生成或提供音频，不会悄悄输出静音版')
        for key in ('gain_db', 'fade_out'):
            val = audio.get(key, 0)
            if isinstance(val, bool) or not isinstance(val, (int, float)) or not math.isfinite(val):
                fail(f'audio.{key} 必须为有限数值')
        if not 0 <= audio.get('fade_out', 0) <= duration:
            fail('音频淡出时长必须在 0 与片长之间')
    return root, config


def executable(name, explicit=None):
    candidate = explicit or os.environ.get(name.upper()) or shutil.which(name)
    if candidate:
        resolved = shutil.which(str(candidate)) or str(candidate)
        if Path(resolved).is_file():
            return resolved
    if name == 'ffprobe':
        ffmpeg = os.environ.get('FFMPEG') or shutil.which('ffmpeg')
        if ffmpeg:
            sibling = Path(ffmpeg).with_name('ffprobe.exe' if sys.platform == 'win32' else 'ffprobe')
            if sibling.is_file():
                return str(sibling)
    fail(f'找不到 {name}。请安装到 PATH，或设置 {name.upper()} 环境变量；本工具不会自动安装。')


def browser_path(explicit=None):
    selected = explicit or os.environ.get('BROWSER_PATH')
    if selected:
        path = shutil.which(selected) or selected
        if not Path(path).is_file():
            fail('指定的浏览器不存在，请检查 --browser 或 BROWSER_PATH')
        return str(path)
    candidates = []
    for name in ('google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge', 'chrome'):
        if shutil.which(name):
            candidates.append(shutil.which(name))
    if sys.platform == 'win32':
        for variable in ('PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'):
            base = os.environ.get(variable)
            if base:
                candidates.extend(str(Path(base) / name) for name in (
                    'Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe'))
    elif sys.platform == 'darwin':
        candidates += ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                       '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    return next((str(p) for p in candidates if Path(p).is_file()), None)


def doctor(_args):
    result = {'python': sys.version.split()[0], 'platform': sys.platform,
              'packages': {name: importlib.util.find_spec(name) is not None for name in ('playwright', 'PIL')},
              'browser': browser_path(_args.browser), 'tools': {}}
    for name in ('ffmpeg', 'ffprobe'):
        try:
            result['tools'][name] = executable(name)
        except ValueError:
            result['tools'][name] = None
    if not result['browser'] and result['packages']['playwright']:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as engine:
            bundled = Path(engine.chromium.executable_path)
            if bundled.is_file():
                result['browser'] = str(bundled)
    result['note'] = '仅检查系统浏览器或已安装的 Playwright Chromium；没有下载或启动浏览器。'
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['browser'] and all(result['packages'].values()) and all(result['tools'].values()) else 1


def init_project(args):
    target = Path(args.project).resolve()
    if target.exists():
        fail('目标目录已存在，不会覆盖。请使用新的工程目录。')
    config = {'title': args.title, 'width': args.width, 'height': args.height,
              'fps': args.fps, 'duration': args.duration, 'entry': 'index.html',
              'review_times': [args.duration * f for f in (.1, .5, .9)], 'transitions': []}
    # 在创建目录前校核基础参数；完整校核在文件复制后执行。
    if min(args.width, args.height, args.fps, args.duration) <= 0 or not math.isfinite(args.duration):
        fail('尺寸、帧率和片长须为有限正数')
    if args.width % 2 or args.height % 2 or abs(args.duration*args.fps-round(args.duration*args.fps)) > 1e-6:
        fail('宽高须为偶数，片长乘帧率须为整数')
    shutil.copytree(SKILL_ROOT / 'assets' / 'starter', target)
    (target / 'project.json').write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding='utf-8')
    load_project(target)
    print(f'已创建工具链样例：{target}\n没有音轨；这不是完成的主题影片，请根据分镜改写 film.mjs。')


class LocalHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def translate_path(self, path):
        resolved = Path(super().translate_path(path)).resolve()
        if not resolved.is_relative_to(Path(self.directory).resolve()):
            return str(Path(self.directory) / '__blocked_path__')
        return str(resolved)


class FilmBrowser:
    def __init__(self, root, config, width=None, browser=None):
        self.root, self.config = root, config
        self.width = width or config['width']
        self.height = round(self.width * config['height'] / config['width'])
        self.browser_override = browser
        self.errors = []
        self.server = self.browser = self.playwright = None

    def __enter__(self):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            fail('缺少 playwright。请先按 runtime.md 安装依赖。')
        try:
            self.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(LocalHandler, directory=str(self.root)))
            Thread(target=self.server.serve_forever, daemon=True).start()
            self.playwright = sync_playwright().start()
            path = browser_path(self.browser_override)
            options = {'headless': True}
            if path:
                options['executable_path'] = path
            if sys.platform == 'win32':
                options['args'] = ['--use-angle=d3d11']
            self.browser = self.playwright.chromium.launch(**options)
            context = self.browser.new_context(viewport={'width': self.width, 'height': self.height}, device_scale_factor=1)
            origin = f'http://127.0.0.1:{self.server.server_port}'
            def guard(route):
                parsed = urlsplit(route.request.url)
                if route.request.url.startswith(origin + '/') or parsed.scheme in ('data', 'blob'):
                    route.continue_()
                else:
                    self.errors.append(f'渲染阻止外部请求：{parsed.scheme}://{parsed.netloc}。请把获许可资源放入工程。')
                    route.abort()
            context.route('**/*', guard)
            self.page = context.new_page()
            self.page.on('pageerror', lambda error: self.errors.append(str(error)))
            self.page.on('console', lambda msg: self.errors.append(msg.text) if msg.type == 'error' else None)
            params = urlencode({'width': self.width, 'height': self.height})
            self.page.goto(f'{origin}/{self.config["entry"]}?{params}', wait_until='networkidle')
            self.page.wait_for_function('window.filmReady === true', timeout=60000)
            self.check_errors()
            info = self.page.evaluate('window.filmInfo')
            expected = {'width': self.width, 'height': self.height, 'fps': self.config['fps'], 'duration': self.config['duration']}
            if not isinstance(info, dict) or any(info.get(k) != value for k, value in expected.items()):
                fail(f'工程与画布规格不一致：期望 {expected}，实际 {info}')
            return self
        except BaseException:
            self.__exit__(*sys.exc_info())
            raise

    def check_errors(self):
        if self.errors:
            raise RuntimeError('\n'.join(self.errors[:5]))

    def frame(self, t):
        self.check_errors()
        encoded = self.page.evaluate('''async (t) => {
            await window.renderAt(t);
            const c = document.querySelector('canvas#film');
            if (!c) throw new Error('找不到 canvas#film');
            return c.toDataURL('image/jpeg', 0.96).split(',')[1];
        }''', t)
        self.check_errors()
        return base64.b64decode(encoded)

    def __exit__(self, *_args):
        try:
            if self.browser:
                self.browser.close()
        finally:
            try:
                if self.playwright:
                    self.playwright.stop()
            finally:
                if self.server:
                    self.server.shutdown()
                    self.server.server_close()


def review_times(config, selected=None, dense=None):
    duration, fps = config['duration'], config['fps']
    if dense:
        start, end, step = map(float, dense.split(':'))
        if not all(math.isfinite(v) for v in (start, end, step)) or step <= 0 or end < start:
            fail('--dense 使用 起点:终点:间隔，须为有限数值，间隔为正')
        count = math.floor((end-start)/step + 1e-8) + 1
        if count > 240:
            fail('一次密集预览最多 240 个时点，请缩小区间')
        times = [start+i*step for i in range(count)]
    elif selected:
        times = [float(t) for t in selected.split(',')]
    else:
        times = list(config.get('review_times') or [duration*f for f in (.1,.3,.5,.7,.9)])
        for cut in config.get('transitions', []):
            moment = cut['time'] if isinstance(cut, dict) else cut
            times.extend([moment-2/fps, moment, moment+2/fps])
    if any(not isinstance(t, (int,float)) or not math.isfinite(t) for t in times):
        fail('审阅时点须为有限数值')
    return sorted(set(round(max(0, min(duration-1/fps, t)), 6) for t in times))


def fresh_folder(folder):
    path = Path(folder).resolve()
    if path.exists():
        fail(f'检查目录已存在，不覆盖旧记录：{path}')
    path.mkdir(parents=True)
    return path


def preview(args):
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        fail('接触表需要 Pillow，请先按 runtime.md 安装依赖')
    root, config = load_project(args.project)
    times = review_times(config, args.times, args.dense)
    if not times:
        fail('没有可用预览时点')
    out = fresh_folder(args.out)
    files = []
    with FilmBrowser(root, config, args.width, args.browser) as film:
        for i,t in enumerate(times):
            path = out/f'{i:03d}-{t:08.3f}s.jpg'
            path.write_bytes(film.frame(t))
            files.append(path)
    thumb_w = 270
    thumb_h = round(thumb_w*config['height']/config['width'])
    for start in range(0, len(files), 24):
        subset = files[start:start+24]
        columns = min(6, len(subset))
        sheet = Image.new('RGB', (columns*thumb_w, math.ceil(len(subset)/columns)*(thumb_h+26)), '#10151b')
        draw = ImageDraw.Draw(sheet)
        for i,path in enumerate(subset):
            x,y = (i%columns)*thumb_w, (i//columns)*(thumb_h+26)
            with Image.open(path) as im:
                sheet.paste(im.convert('RGB').resize((thumb_w,thumb_h)), (x,y))
            draw.text((x+8,y+thumb_h+5), f'{times[start+i]:.3f}s', fill='#e8dfc9')
        sheet.save(out/f'contact-{start//24+1:02d}.jpg', quality=93)
    (out/'review.json').write_text(json.dumps({'times':times,'visual_review':'not_performed_by_script'}, indent=2), encoding='utf-8')
    print(f'预览已生成：{out}\n请实际打开接触表；导出成功不等于视觉审查通过。')


def render(args):
    root, config = load_project(args.project)
    ffmpeg = executable('ffmpeg')
    output = Path(args.out).resolve()
    if output.suffix.lower() != '.mp4':
        fail('导出文件应使用 .mp4 后缀')
    partial = output.with_name(output.stem+'.partial.mp4')
    for path in (output, partial):
        if path.exists():
            fail(f'文件已存在，不会覆盖：{path}。请使用新文件名或检查上次未完成文件。')
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [ffmpeg,'-hide_banner','-loglevel','warning','-n','-f','image2pipe','-vcodec','mjpeg',
               '-framerate',str(config['fps']),'-i','pipe:0']
    audio = config.get('audio')
    if audio:
        command += ['-i',str(inside(root,audio['path'])),'-map','0:v:0','-map','1:a:0',
                    '-c:a','aac','-b:a','192k','-ar','48000']
        filters = [f'volume={audio.get("gain_db",0)}dB', 'apad']
        fade = audio.get('fade_out',0)
        if fade:
            filters.append(f'afade=t=out:st={config["duration"]-fade}:d={fade}')
        command += ['-af',','.join(filters)]
    else:
        command += ['-an']
        print('注意：工程没有配置音轨，本次明确输出无声视频。', flush=True)
    command += ['-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',
                '-t',str(config['duration']),'-movflags','+faststart',str(partial)]
    count = round(config['duration']*config['fps'])
    # 浏览器就绪后才启动编码器，错误局限于本次输出。
    with FilmBrowser(root, config, browser=args.browser) as film:
        with output.with_suffix('.render.log').open('x',encoding='utf-8') as log:
            encoder = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=log)
            try:
                for i in range(count):
                    encoder.stdin.write(film.frame(i/config['fps']))
                    if i%60 == 0 or i == count-1:
                        print(f'frame {i+1}/{count}', flush=True)
                encoder.stdin.close()
                if encoder.wait(timeout=120):
                    raise RuntimeError(f'编码失败，请查看 {output.with_suffix(".render.log")}')
            except BaseException:
                if encoder.poll() is None:
                    encoder.terminate()
                    encoder.wait(timeout=20)
                raise
    # 不覆盖此前成片；失败中间文件保留为 .partial.mp4。
    if output.exists():
        fail('输出目标在渲染期间被创建，保留 partial 文件，不替换目标')
    partial.rename(output)
    print(f'已导出：{output}\n下一步执行 verify，并实际审片。')


def verify(args):
    _root, config = load_project(args.project)
    video = Path(args.video).resolve()
    if not video.is_file():
        fail('找不到待核验的视频')
    ffmpeg, ffprobe = executable('ffmpeg'), executable('ffprobe')
    data = json.loads(run([ffprobe,'-v','error','-show_streams','-show_format','-of','json',str(video)]).stdout)
    stream = next((s for s in data['streams'] if s['codec_type']=='video'), None)
    if not stream:
        fail('文件没有视频流')
    audio = next((s for s in data['streams'] if s['codec_type']=='audio'), None)
    issues = []
    if (stream['width'],stream['height']) != (config['width'],config['height']):
        issues.append('视频尺寸与工程不符')
    if Fraction(stream['avg_frame_rate']) != config['fps']:
        issues.append('帧率与工程不符')
    if abs(float(data['format']['duration'])-config['duration']) > max(.06, 1/config['fps']):
        issues.append('时长与工程不符')
    if stream.get('nb_frames') is not None and int(stream['nb_frames']) != round(config['duration']*config['fps']):
        issues.append('帧数与工程不符')
    if bool(audio) != bool(config.get('audio')):
        issues.append('音轨存在状态与工程不符')
    decoded = run([ffmpeg,'-hide_banner','-v','error','-i',str(video),'-f','null','-'])
    if decoded.stderr.strip():
        issues.append('全片解码产生错误信息')
    result = {'video':video.name,'technical':'passed' if not issues else 'failed',
              'issues':issues,'width':stream['width'],'height':stream['height'],
              'duration':float(data['format']['duration']),'fps':stream['avg_frame_rate'],
              'frames':stream.get('nb_frames'),'audio':bool(audio),
              'visual_review':'not_performed_by_script','subjective_listening':'not_performed_by_script'}
    if audio:
        measured = run([ffmpeg,'-hide_banner','-i',str(video),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-']).stderr
        start,end = measured.rfind('{'),measured.rfind('}')
        levels = json.loads(measured[start:end+1])
        result['audio_measurement'] = {key:levels[key] for key in ('input_i','input_tp','input_lra')}
        if float(levels['input_tp']) > -1:
            result['audio_warning'] = '真峰值高于 -1 dBTP，建议检查失真与编码余量；指标不替代试听。'
    encoded = json.dumps(result,ensure_ascii=False,indent=2)
    if args.out:
        path = Path(args.out).resolve()
        path.parent.mkdir(parents=True,exist_ok=True)
        with path.open('x',encoding='utf-8') as file:
            file.write(encoded+'\n')
    print(encoded)
    if issues:
        return 1
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command',required=True)
    p = sub.add_parser('doctor',help='只读检查依赖，不安装')
    p.add_argument('--browser'); p.set_defaults(func=doctor)
    p = sub.add_parser('init',help='创建新的最小画布工程，不覆盖已有目录')
    p.add_argument('project'); p.add_argument('--width',type=int,default=1280)
    p.add_argument('--height',type=int,default=720); p.add_argument('--fps',type=int,default=30)
    p.add_argument('--duration',type=float,default=6); p.add_argument('--title',default='代码动画工具链样例')
    p.set_defaults(func=init_project)
    p = sub.add_parser('preview',help='导出代表帧和接触表；仍需实际查看')
    p.add_argument('project'); p.add_argument('--out',required=True); p.add_argument('--width',type=int,default=540)
    modes = p.add_mutually_exclusive_group(); modes.add_argument('--times'); modes.add_argument('--dense')
    p.add_argument('--browser'); p.set_defaults(func=preview)
    p = sub.add_parser('render',help='导出 MP4，按 project.json 合入可选音轨')
    p.add_argument('project'); p.add_argument('--out',required=True); p.add_argument('--browser'); p.set_defaults(func=render)
    p = sub.add_parser('verify',help='检查文件规格、解码和客观音频指标，不做视觉打分')
    p.add_argument('project'); p.add_argument('video'); p.add_argument('--out'); p.set_defaults(func=verify)
    args = parser.parse_args(argv)
    if getattr(args,'width',1) <= 0:
        parser.error('width 必须为正数')
    try:
        return args.func(args) or 0
    except (ValueError, RuntimeError, OSError, KeyError, ImportError) as error:
        print(f'错误：{error}',file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
