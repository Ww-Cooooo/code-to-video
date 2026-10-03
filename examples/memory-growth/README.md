# 原创示例：记忆与自我进化

36 秒、1080×1440、30 fps，Canvas 2D / Three.js 混合画面与原创合成配乐。

本例展示：同一迷宫中的两次选择、纸面与蓝图风格、记忆核交接给生长树、三维光影与片尾。主体交接已改成“核先收缩消失，树再生长”，不是让树干穿过球体。

**它是一个完整案例，不是所有影片必须套用的视觉模板。** 时序和构图就是为此 36 秒、3:4 影片设计的；换主题、比例或片长需要重新创作，不能只改 project.json。

## 运行

先满足根目录 [运行环境](../../references/runtime.md)。以下命令在 Skill 根目录执行：

```bash
npm install --prefix examples/memory-growth
python -m pip install numpy
python examples/memory-growth/source/score.py
python scripts/video.py preview examples/memory-growth --out example-review
python scripts/video.py render examples/memory-growth --out output/memory-v1.mp4
python scripts/video.py verify examples/memory-growth output/memory-v1.mp4 --out output/memory-v1-check.json
```

安装步骤会联网，运行生成和渲染不需要外部服务。代理应在获准安装后执行；如果环境已有依赖，优先复用，不要重复安装。已有配乐则跳过 score.py。

检查交接：

```bash
python scripts/video.py preview examples/memory-growth --out example-handoff --dense 19.5:22:0.125
```

打开 contact 图片确认变化。`sceneState()` 仅暴露本例球体和树的可见状态，可用于先后关系回归检查，不是通用碰撞检测。

## 字体和素材

本例使用宿主已安装的 Noto Sans CJK SC、微软雅黑或苹方作为字体回退，不附带字体文件。Linux 等环境若没有中文字体，需要自行安装具有相应许可的字体或把获许可字体加入工程；检查实际画面是否缺字。不同系统的排版可能略有差异。

所有示例图形由代码绘制；配乐由 NumPy 合成，无第三方采样、原片音轨或人声。示例代码适用本仓库 MIT 许可证；Three.js 按其自身许可证提供。启发来源在 [SOURCES.md](../../SOURCES.md)，没有把参考媒体打包进来。
