# 花卷 GitHub 双层主页 V2 设计说明

日期：2026-08-28  
仓库：`wz20/wz20`  
目标分支：`codex/huajuan-profile-v2`

## 1. 背景与问题

当前 GitHub 个人主页已经有横幅、打字动画、技术栈、统计卡片、项目表格和贡献动画，信息完整，但视觉主要由多个第三方图片服务拼接而成，品牌识别仍停留在“通用深色科技风”。页面中真正代表花卷的内容——AI Agent、Vibe Coding、创意技术、花卷猫咪和正在构建的作品——没有形成连贯的参观路径。

GitHub Profile README 会过滤 JavaScript 和自定义页面样式，因此 GSAP 与 WeUI 不能直接运行在个人主页正文中。本次采用“双层主页”：README 负责快速建立身份与作品可信度，GitHub Pages 负责完整的品牌体验与交互展示。

## 2. 目标

1. 让访客在 5 秒内理解：花卷是谁、在做什么、最值得看的作品是什么。
2. 把“花卷 AI 实验室”做成可识别的个人品牌，而不是通用开发者模板。
3. 在独立 GitHub Pages 页面中充分使用 WeUI 交互结构与 GSAP 动效能力。
4. README 在 GitHub 深色、浅色主题下都清晰，关键内容不依赖脚本。
5. 页面在手机和桌面端都可用，并为 `prefers-reduced-motion` 提供完整静态体验。
6. 保持纯静态、无后台、无追踪脚本，降低维护和隐私成本。

## 3. 非目标

- 不修改其他项目仓库的代码、描述、Star 或 Release。
- 不自动调整 GitHub 的 Popular repositories / Pinned repositories 配置。
- 不添加登录、评论、数据库、表单提交或访问统计服务。
- 不用夸张的实时数据包装项目，不把第三方统计图片作为主叙事。
- 不把 WeUI 原样复制成“微信页面”；只继承其清晰、可靠的移动交互语言。

## 4. 总体方案

### 4.1 第一层：GitHub Profile README

README 是信息密度高、加载稳定的入口，按以下顺序组织：

1. **品牌首屏**：仓库内自有 SVG 横幅，包含花卷猫咪符号、`HUAJUAN AI LAB`、一句价值主张和明确的动态主页入口。
2. **当前身份**：用三行短句说明 Java / AI Agent / Creative Technology 三个核心方向，删除重复自我介绍。
3. **精选实验**：保留四个项目，但改成更简洁的两列作品卡；每张卡明确“做了什么”和“为什么值得看”。
4. **正在研究**：AI Agent、MCP、Vibe Coding、视频自动化等，用短标签而不是大面积技能图标墙。
5. **代码活动**：只保留一组稳定的数据卡和贡献图；第三方服务失败时不影响主内容。
6. **联系入口**：GitHub、抖音和动态实验室三个入口，避免重复按钮。

README 不运行 GSAP 或 WeUI。动态感来自自有 SVG 的构图、图形节奏以及对 GitHub 原生 Markdown / HTML 能力的克制使用。

### 4.2 第二层：GitHub Pages 动态实验室

目标地址：`https://wz20.github.io/wz20/`

页面是一条“进入实验室”的连续叙事：

1. **Boot / Hero**：花卷猫咪标志从线稿组装，标题和价值主张依次出现；主按钮进入精选实验，次按钮返回 GitHub。
2. **Lab Console**：用 WeUI Cell / Badge / Progress 组成实验室状态台，展示当前研究方向与工作状态。
3. **Selected Experiments**：WeUI Panel / Media Box 作为四个项目的内容骨架，桌面端重排为非对称 Bento 网格。
4. **How Ideas Ship**：`想法 → Agent → 工具 → 可见作品` 四段流程；桌面端由 ScrollTrigger 固定并随滚动推进，手机端变为自然纵向阅读。
5. **Toolkit**：技术能力按“构建、智能、表达”分组，而不是简单堆放 Logo。
6. **Contact / Footer**：WeUI ActionSheet 提供外部入口，复制账号时使用 Toast 反馈；无脚本时仍显示普通链接。

## 5. 视觉系统

### 5.1 概念

视觉主题为 **“深夜实验档案 × 花卷猫咪 × 可见的工作流”**。页面像一份正在运行的实验档案：深色墨黑背景、纸张白内容、青色运行信号、桃红实验标记、少量暖黄色提示。避免大面积紫色渐变和通用玻璃卡片堆叠。

### 5.2 色彩

- Ink：`#071011`，主背景。
- Paper：`#F3F0E8`，正文与高对比内容。
- Signal Cyan：`#24D8D2`，运行状态和主交互。
- Experiment Pink：`#FF5D8F`，重点标记和路径节点。
- Warm Note：`#F5C451`，提示与手写批注。
- Muted：`#8C9A98`，次要信息。

所有颜色通过 CSS 自定义属性集中管理；文本与交互控件满足 WCAG AA 对比度。

### 5.3 字体与图形

- 中文正文优先使用系统可用的现代黑体栈，确保加载稳定。
- 英文标题使用仓库内自托管的开源展示字体；失败时回退到等宽字体。
- 猫咪标志、流程节点和背景轨道使用自有 SVG，不使用不可控的远程插画。
- 背景只使用低密度网格、纸张噪点和轨道线，避免抢夺项目内容。

## 6. WeUI 使用方式

锁定 WeUI `v2.6.26`。WeUI 作为语义与交互骨架，视觉颜色和排版由品牌层覆盖。

- `weui-cell` / `weui-cells`：实验室状态、研究方向、联系条目。
- `weui-panel` / `weui-media-box`：项目列表和项目摘要。
- `weui-badge`：项目状态与领域标签。
- `weui-btn`：主次行动按钮。
- `weui-progress`：实验流程推进与滚动进度。
- `weui-half-screen-dialog`：手机端项目详情。
- `weui-actionsheet`：联系与外部平台入口。
- `weui-toast`：复制成功等即时反馈。
- `weui-tabbar`：手机端章节导航；桌面端转化为紧凑的侧边导航。

组件必须保留可聚焦状态、键盘操作和语义标签，不能只靠动画表达状态。

## 7. GSAP 动效系统

使用 GSAP `3.13.x`，核心动画由一个主时间线和按章节拆分的子时间线管理；使用 ScrollTrigger 和 MotionPathPlugin，所有插件在初始化时显式注册。

### 7.1 首屏时间线

1. 网格与轨道淡入。
2. 猫咪 SVG 线条分段出现。
3. `HUAJUAN AI LAB` 字标按行错落进入。
4. 价值主张、状态灯、主按钮依次出现。
5. 猫咪沿短轨道移动到静止状态，作为首屏记忆点。

### 7.2 滚动叙事

- 项目卡使用批次 stagger 进入，保持短时、明确、可预测。
- “想法到作品”流程在桌面端使用 ScrollTrigger `pin + scrub`，滚动时高亮当前阶段并推进 WeUI Progress。
- 手机端不固定长屏，仅在元素进入视口时播放一次，避免滚动劫持。
- 当前章节驱动 Tabbar / 侧边导航状态，不重复监听高频滚动事件。

### 7.3 微交互

- 桌面端项目卡使用 `quickTo()` 实现轻量指针视差和光斑跟随。
- 按钮 hover 只改变 `x/y/scale/opacity` 等合成层属性。
- 项目详情弹层与 ActionSheet 使用统一的进入/退出时间线。
- 离开视口或页面隐藏时暂停持续动画；销毁弹层时清理对应 timeline / trigger。

### 7.4 减少动画

通过 `gsap.matchMedia()` 识别 `prefers-reduced-motion: reduce`：

- 跳过首屏组装和轨道循环。
- 禁用 pin、scrub、指针跟随和视差。
- 直接显示最终状态，保留导航、弹层和复制功能。

## 8. 技术架构与文件结构

采用无框架静态站点，避免为了单页作品集引入构建系统。

```text
wz20/
├── README.md
├── assets/
│   ├── readme-hero-dark.svg
│   └── readme-hero-light.svg
├── site/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── data.js
│   ├── assets/
│   │   ├── huajuan-mark.svg
│   │   ├── lab-grid.svg
│   │   └── fonts/
│   └── vendor/
│       ├── weui.min.css
│       ├── gsap.min.js
│       ├── ScrollTrigger.min.js
│       ├── MotionPathPlugin.min.js
│       └── LICENSES.md
├── .github/workflows/pages.yml
└── docs/superpowers/specs/
    └── 2026-08-28-huajuan-profile-v2-design.md
```

运行时不依赖 CDN：WeUI、GSAP 和字体均以锁定版本存放在仓库中，并保留许可证与来源说明。GitHub Pages 工作流只上传 `site/` 静态目录。

## 9. 内容与数据流

`site/data.js` 是动态主页的唯一项目内容数据源，包含标题、说明、状态、技术标签和仓库链接。页面初始化后将数据渲染成 WeUI 项目面板；JavaScript 不可用时，`index.html` 中保留四个精选项目的完整静态内容作为降级展示。

README 的精选项目与 `data.js` 人工保持一致，不增加构建步骤。每次更新项目时按仓库内维护说明同时检查两处，避免隐藏的生成链路。

页面不请求 GitHub API，不存在限流、令牌泄漏或跨域依赖。所有外部跳转使用普通 HTTPS 链接。

## 10. 容错与安全

- JavaScript 加载失败：全部核心内容与链接仍可阅读、访问。
- 单个图像加载失败：保留文本标题和项目说明，不产生空白主屏。
- 字体加载失败：回退到本地系统字体，不引发布局不可用。
- Pages 尚未启用：README 的动态主页按钮仍明确标注目标，发布前不合并该入口。
- 所有外部链接使用 `rel="noopener noreferrer"`。
- 不嵌入密钥、邮箱、内部接口、访问统计或第三方跟踪代码。

## 11. 验证与验收标准

### 11.1 README

- 在 GitHub 深色和浅色主题下检查首屏、项目卡和链接。
- 所有自有图片使用仓库内稳定路径。
- 第三方统计服务失效时，身份、项目与联系入口仍完整。
- 桌面端和窄屏下无横向溢出。

### 11.2 动态主页

- 宽度 `390px`、`768px`、`1440px` 三档视觉检查。
- Chrome 中逐段检查首屏时间线、ScrollTrigger、项目详情、ActionSheet、Toast 和导航状态。
- 键盘可访问所有链接、按钮和弹层，焦点进入弹层后不会丢失。
- `prefers-reduced-motion` 模式下无持续位移、固定滚动或内容延迟显示。
- 禁用 JavaScript 后仍能看到身份说明、四个精选项目和联系方式。
- 页面无控制台错误、404 资源、混合内容或失效内部锚点。
- 正常网络下 Lighthouse Accessibility 不低于 95，Performance 不低于 90；若字体或动画影响指标，优先保证可访问性与首屏内容。

### 11.3 发布

- GitHub Actions 仅在 `main` 的站点相关文件变化时构建并部署。
- 部署成功后检查线上 Pages URL，再更新 README 主按钮指向。
- 通过 Pull Request 合并到 `main`，不直接覆盖现有主页。

## 12. 交付结果

1. 重构后的 GitHub Profile README。
2. 可直接部署的 WeUI + GSAP 静态动态主页。
3. 自有深浅主题 README SVG 与站点图形素材。
4. GitHub Pages 自动部署工作流。
5. 许可证、内容维护说明和完成后的验证记录。

## 13. 参考基线

- WeUI 官方仓库与 `v2.6.26` Release：<https://github.com/Tencent/weui>
- GSAP 安装与插件说明：<https://gsap.com/docs/v3/Installation/>
- GSAP ScrollTrigger：<https://gsap.com/docs/v3/Plugins/ScrollTrigger/>
- GitHub Pages Actions 部署：<https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
