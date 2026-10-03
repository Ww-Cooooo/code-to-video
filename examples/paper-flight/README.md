# 原创示例：折向远方

24 秒、1920×1080、30 fps，横屏。Three.js 纸张由共享顶点控制形变，从平面折成纸飞机，在柔和光照与地面阴影中起飞，配以钟琴感旋律和气流声。

这是概念短片，不是可照做的折纸操作教程或物理仿真。

![预览](preview.jpg)

## 运行

先满足根目录的 [运行环境](../../references/runtime.md)。以下命令在仓库根目录执行：

```bash
npm install --prefix examples/paper-flight
python -m pip install numpy
python examples/make_scores.py --example paper-flight
python scripts/video.py preview examples/paper-flight --out review-paper
python scripts/video.py render examples/paper-flight --out output/paper-v1.mp4
python scripts/video.py verify examples/paper-flight output/paper-v1.mp4 --out output/paper-v1-check.json
```

安装需联网及相应授权；已有依赖可跳过安装，已有音轨可跳过生成。依赖版本固定在 package.json，仓库不携带 node_modules。渲染和声音合成无需外部生成服务。

## 修改与检查

`film.mjs` 包含纸张顶点、折叠、飞行路径、镜头、灯光和字幕；`draw.mjs` 提供二维合成辅助。折叠面使用共享顶点，不分别平移为互不相连的面片。

```bash
python scripts/video.py preview examples/paper-flight --out review-paper-fold --dense 3.3:10:0.25
```

实际打开有序帧检查折叠、接地关系与 9.5 秒后的起飞，另检查片尾是否贴边。`window.inspectPaper()` 暴露世界坐标最低点、地面状态和屏幕坐标，便于本例回归；不是通用穿模检测器。

构图与时序针对本片规格设计。改变片长或比例要同步修改画面，不只修改 project.json。使用新输出名保留旧成片。

中文使用系统字体回退。原创代码与声音合成采用根目录 [MIT](../../LICENSE)，Three.js 使用其自身许可证；不附字体和参考媒体。已完成与未完成的检查见 [TESTING.md](../../TESTING.md)。
