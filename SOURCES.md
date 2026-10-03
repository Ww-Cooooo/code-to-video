# 来源与归属

本 Skill 来自一次真实的代码视频制作及返修：生成 36 秒动画，输出 MP4，随后根据反馈修复记忆核与树干的穿模。方法与运行脚本在此整理为独立版本，未携带原工作区、个人信息、参考媒体或浏览器登录态。

下列来源提供制作思路，不代表已经复现它们的全部结果，也不代表其作者参与本项目。

| 来源 | 阅读/观察范围 | 本项目采用的启发 |
| --- | --- | --- |
| [JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) | 仓库 README 中的 p5.js/p5.brush、Chrome 抓帧和 FFmpeg 工作流 | 网页程序可以成为可定位时间的影片工程，先生成画面再编码；未移植其动画源码 |
| [WinterArc21/Battle-of-Austerlitz-Film](https://github.com/WinterArc21/Battle-of-Austerlitz-Film) | 工程说明中的 WebGL、程序场景、声音和离线渲染 | 程序动画不只限于文字卡，也可以表达三维空间和镜头；未移植其着色器 |
| [Quantslant：Opus 与 Remotion 实测](https://quantslant.com/claude-opus-5-5-remotion-tutorial/) | 教程中的提示规格、编译和成片缺陷记录 | 明确规格；能渲染不等于没有画面问题。本 Skill 默认脚本不依赖 Remotion |
| [余弦：Opus 视频制作记录](https://blog.cosine.ren/post/opus-5-5-motion-video-resources/) | 作者的分镜、预览、渲染和审片记录 | 先看代表帧和样段，再制作全片；不是把复杂流水线整套照搬 |
| [joeseesun/opus-video-prompts](https://github.com/joeseesun/opus-video-prompts) | 提示词与技术路线索引 | 作为寻找原作者和多种制作路线的入口，不把整理页当成每个案例的一手实现 |
| [一起Vibe：BV1jyaA6QEoH](https://www.bilibili.com/video/BV1jyaA6QEoH/) | 42 秒视频的低清画面抽样，以及前段加密有序帧；未听原声 | 同一主体跨视觉风格，并从纸面/印刷转入立体光影。没有复制画面或音轨 |

## 代码、模型与工具的职责

示例的叙事、动画代码、声音合成代码和通用制作脚本由开发过程中编写，未从上述项目直接移植。通用算法和库的使用不代表从零发明了渲染技术。

- **Three.js**：示例使用的三维库，MIT，由 npm 安装；其许可证随依赖提供。
- **Playwright**：驱动独立浏览器，按其项目许可证提供。
- **Pillow**：接触表图像处理，按其项目许可证提供。
- **NumPy**：仅示例配乐使用，按其项目许可证提供。
- **FFmpeg**：用户自行提供的外部工具，不随包分发；具体许可证取决于所用构建。
- **字体**：本包不分发字体，用户系统字体及自行加入字体分别遵循相应许可。

本仓库自己的文档、脚本和原创示例采用 [MIT](LICENSE)。该许可不扩展到参考作品、用户素材或外部工具，也不保证所有输出在所有司法辖区的权利状态。

生成视频不需要每帧调用语言模型。模型编写程序之后，浏览器和 FFmpeg 在本机计算画面及编码；当前宿主模型本身可能在云端运行，因此不能把整个创作对话称为完全离线。
