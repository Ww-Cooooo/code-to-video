# 原创示例：噪声之外

20 秒、1080×1440、30 fps。纯 Canvas 2D：米白纸面、朱红与深墨色，杂乱符号经过筛选形成连续线索，再收束成印刷海报。表达的是“更多输入不等于更清楚”，图形不是实测数据。

![预览](preview.jpg)

## 运行

先满足根目录的 [运行环境](../../references/runtime.md)。本例画面不需要 Node.js 或 Three.js，配乐生成需要 NumPy。以下命令在仓库根目录执行：

```bash
python -m pip install numpy
python examples/make_scores.py --example signal
python scripts/video.py preview examples/signal --out review-signal
python scripts/video.py render examples/signal --out output/signal-v1.mp4
python scripts/video.py verify examples/signal output/signal-v1.mp4 --out output/signal-v1-check.json
```

安装需联网及相应授权；已有依赖可跳过安装，已有音轨可跳过生成。配乐脚本拒绝覆盖已有文件。渲染运行于本地，不调用外部音乐或视频模型。

## 修改与检查

- `film.mjs`：符号、过滤区域、波形与海报时序。
- `draw.mjs`：字体、布局与绘图辅助。
- `project.json`：输出规格、审阅时点和音量。
- [make_scores.py](../make_scores.py)：三种示例各自的配器，本例使用 `signal`。

检查 4、9、14 秒附近的状态交接，以及字幕阅读时间。更改主题、比例或片长时需要重新设计画面，不能只改配置数字。返修使用新输出名。

中文使用系统字体回退，需检查缺字和排版。原创代码与声音合成采用根目录 [MIT](../../LICENSE)；不附字体和参考媒体。技术检查与主观听音的边界见 [TESTING.md](../../TESTING.md)。
