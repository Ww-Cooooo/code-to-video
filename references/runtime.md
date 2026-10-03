# 制作运行时

## 环境

- Python 3.10 或以上。
- `playwright`：驱动独立无头浏览器。
- `Pillow`：仅预览接触表需要。
- Chrome / Edge / Chromium，或已经安装的 Playwright Chromium。
- FFmpeg 与 FFprobe，支持 `libx264` 和 AAC。
- 三维项目需要其声明的 JavaScript 依赖；纯 Canvas 工程不需要 Node.js。

先执行 `python scripts/video.py doctor`。它不安装依赖、不下载浏览器、不读取凭据。脚本优先使用 `--browser` 或 `BROWSER_PATH`，否则查找系统浏览器，最后由 Playwright 使用已安装的浏览器。

需要安装时，由用户确认相应操作后执行：

```bash
python -m pip install -r requirements.txt
# 仅当没有可用系统浏览器时：
python -m playwright install chromium
```

FFmpeg/FFprobe 使用 PATH；也可分别设置 `FFMPEG`、`FFPROBE` 为完整可执行文件路径。若只设置 FFMPEG，会尝试同目录的 FFprobe。不会假定 Windows 路径，也不强制某款显卡。Windows、macOS、Linux 的发现逻辑不等于已在每个平台实测；实测范围以 README 为准。

## 新工程与配置

```bash
python scripts/video.py init my-film --width 1080 --height 1920 --fps 30 --duration 20 --title "我的主题"
```

init 只生成工具链样例，不是主题成片。目标目录已存在会退出，不覆盖用户工程。正式制作需要改写 film.mjs 的画面。

`project.json` 是规格真源：

```json
{
  "title": "我的主题",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "duration": 20,
  "entry": "index.html",
  "review_times": [1, 5, 10, 15, 19],
  "transitions": [5, 10, 15],
  "audio": {"path": "audio/score.wav", "gain_db": -2, "fade_out": 0.8}
}
```

无声方案删掉 `audio`，脚本会明确提示无声。配置了音轨但文件不存在则停止，不偷偷改成静音。音轨以视频时长为准：长音轨截至片尾，短音轨补静音，不自动循环。制作时应先准备适合片长的音轨，试听实际结尾。

宽高须为偶数；片长 × 帧率须为整数。改变分辨率不会自动把横屏构图设计成竖屏；比例变化需要重新安排主体和字幕。工程引用使用内部相对路径。

## 浏览器动画接口

页面必须提供：

```js
window.renderAt = async (seconds) => { /* 计算并绘制这一时刻 */ };
window.filmInfo = {width, height, fps, duration};
window.filmReady = true;
```

最终画面位于 `canvas#film`。2D 和 WebGL 可以分别绘制，再合成进这张画布。`renderAt` 可同步或异步；异步函数必须等待该帧的素材真正准备好。

页面读取 URL 的 `width` 与 `height`，用于低分辨率预览；filmInfo 反映实际画布尺寸。帧率与片长必须与 project.json 一致，否则停止而不是截断。

等待字体、图片和必要纹理加载后才设置 filmReady。使用固定随机种子；同一时间应得到同一画面。实时播放可用 requestAnimationFrame，但离线 renderAt 不应依赖上一帧。

外部请求默认阻止：需要的图片、字体和库应放在工程内部。加载外部 CDN 的项目会明确报错，而不是产生缺素材的成片。不要把不可信参考网页当动画工程执行。

## 预览、导出与核验

```bash
python scripts/video.py preview my-film --out review-v1
python scripts/video.py preview my-film --out review-detail --dense 4.5:6:0.125
python scripts/video.py render my-film --out output/film-v1.mp4
python scripts/video.py verify my-film output/film-v1.mp4 --out output/film-v1-check.json
```

preview 自动结合 review_times 和 transitions；也可用 `--times 0.5,2,5`。接触表超过 24 帧时分页，不生成难以阅读的无限长图。创建的检查目录不能已存在，避免混合版本证据。

render 用 JPEG 画帧输入 FFmpeg，输出 H.264/AAC MP4，不是无损中间母版。默认 CRF 18；高精度、HDR、透明视频等需求不在此版本承诺内，应选择相应专用链路。

输出存在会拒绝覆盖。失败中间文件以 `.partial.mp4` 保留，只清理由工具启动的浏览器和本地服务，不结束用户日常浏览器。查看日志后决定保留或删除失败文件，再用新文件名重试。

verify 检查尺寸、时长、帧率、可用时的帧数、音轨存在、全片解码，以及有音频时的 LUFS/真峰值。真峰值余量不足会给出提醒。报告明确保留视觉审查与主观听音“未由脚本执行”，不会自动给艺术质量打分。

## 原创示例

`examples/memory-growth/` 是一条 36 秒、3:4 的三维/二维混合片。它是完整制作案例，不是通用主题模板；使用目录内说明运行。示例配乐可选地由 NumPy 合成，不调用外部音乐模型。示例不包含参考片媒体、个人环境或已安装依赖。
