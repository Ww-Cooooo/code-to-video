# 原创示例：协作的形状

24 秒、1080×1440、30 fps。15 个陶质、铜色与青绿楔块，从分散位置沿各自径向收拢，由两端向中央装配成拱形；光点随后沿完整路径通过。配乐使用金属敲击感音色与低频节奏。

这是关于协作的概念表达，不是结构受力或建筑施工验证。

![预览](preview.jpg)

## 运行

先满足根目录的 [运行环境](../../references/runtime.md)。以下命令在仓库根目录执行：

```bash
npm install --prefix examples/together-arch
python -m pip install numpy
python examples/make_scores.py --example together-arch
python scripts/video.py preview examples/together-arch --out review-together
python scripts/video.py render examples/together-arch --out output/together-v1.mp4
python scripts/video.py verify examples/together-arch output/together-v1.mp4 --out output/together-v1-check.json
```

安装需联网及相应授权；已有依赖可跳过安装，已有音轨可跳过生成。脚本拒绝覆盖已有音轨。渲染与配乐生成不调用外部生成服务。

## 修改与检查

`film.mjs` 包含楔块形状、两端到中央的装配时序、材质、灯光与路径光点；`draw.mjs` 处理画面合成与排版。

```bash
python scripts/video.py preview examples/together-arch --out review-assembly --dense 4.5:12:0.25
```

检查块间接缝、是否到达目标位置、装配顺序、反光细节与镜头边缘。降低高光不能只依赖降低最终图像亮度，需同时检查曝光、灯光、材质与 Bloom。

本片不是任意主题模板；换主题、比例或片长需要重新设计画面。使用新输出名保留旧版。中文采用系统字体回退，需在自己的环境检查。

原创代码与声音合成采用根目录 [MIT](../../LICENSE)，Three.js 按其自身许可证提供；不附字体和参考媒体。技术核验、视觉抽样和主观听音的覆盖范围见 [TESTING.md](../../TESTING.md)。
