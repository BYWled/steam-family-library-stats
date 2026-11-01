<h1 align="center">steam-family-library-stats</h1>

<p align="center">
  Steam 家庭库（家庭共享）统计与成员计分油猴脚本。一键全自动遍历 Steam 家庭管理页，精准提取每款游戏的归属成员，并按「独占 3 分、共享人数越多分越低」的线性权重为每位成员评分，支持一键导出 CSV 明细。
</p>

<p align="center">
  <a href="https://greasyfork.org/zh-CN/scripts/603252"><img src="https://img.shields.io/greasyfork/v/603252?style=for-the-badge&logo=greasyfork&logoColor=white" alt="Greasy Fork Version" /></a>
  <a href="https://greasyfork.org/zh-CN/scripts/603252"><img src="https://img.shields.io/greasyfork/dt/603252?style=for-the-badge&logo=greasyfork&logoColor=white" alt="Greasy Fork Installs" /></a>
  <a href="https://github.com/BYWled/steam-family-library-stats"><img src="https://img.shields.io/github/stars/BYWled/steam-family-library-stats?style=for-the-badge&logo=github" alt="GitHub Stars" /></a>
  <a href="https://github.com/BYWled/steam-family-library-stats"><img src="https://img.shields.io/github/license/BYWled/steam-family-library-stats?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <a href="https://scriptcat.org/zh-CN/script-show-page/8842"><img src="https://img.shields.io/badge/ScriptCat-在线安装-2C9CFF?style=for-the-badge" alt="ScriptCat" /></a>
  <a href="https://gitee.com/BYWled/steam-family-library-stats"><img src="https://img.shields.io/badge/Gitee-代码镜像-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee Mirror" /></a>
  <a href="https://gitcode.com/BYWled/steam-family-library-stats"><img src="https://img.shields.io/badge/GitCode-代码镜像-2962FF?style=for-the-badge&logo=gitcode&logoColor=white" alt="GitCode Mirror" /></a>
</p>

<p align="center">
  <a href="https://github.com/BYWled/steam-family-library-stats">GitHub</a> ·
  <a href="https://greasyfork.org/zh-CN/scripts/603252">Greasy Fork</a> ·
  <a href="https://scriptcat.org/zh-CN/script-show-page/8842">ScriptCat</a> ·
  <a href="https://gitee.com/BYWled/steam-family-library-stats">Gitee</a> ·
  <a href="https://gitcode.com/BYWled/steam-family-library-stats">GitCode</a>
</p>

> 版本：**1.0.0**

## ✨ 特性

- **一键全自动扫描**：
  - 注入式悬浮统计面板，点击「全自动扫描」即可自动平滑遍历整个 Steam 家庭库页面，全程无需手动操作；
  - 智能嗅探真正的滚动容器（窗口 / 内部虚拟列表），自动判底并安全终止，绝不死循环或误判提前结束；
  - 扫描过程中实时高亮正在识别的游戏卡片，进度一目了然，随时可手动中止。
- **深度适配 Steam 全新前端架构**：
  - 针对 Steam 家庭管理页的 **React 虚拟列表** 专门设计，依靠唯一键去重，彻底解决 DOM 复用导致的漏扫、重扫；
  - 完全免疫 CSS-Module 类名混淆，通过 `data-key`、`role`、样式特征等多级兜底策略智能定位游戏卡片与悬浮详情浮层。
- **五类归属结构精准解析**：覆盖 Steam 家庭详情浮层的全部 5 种实际 DOM 结构——成员独有（单行文本）、我与他人共有、我独有（无归属信息）、多成员列表（`<ul><li>`）、以及「您及 xx 的库」复合句式，统一归一化为成员集合。
- **严谨计分系统**：
  - 线性权重公式：`权重 = 3.4 - 0.4 × 共有人数`（1 人独占 3 分，6 人共有 1 分，最低不低于 1 分）；
  - 自动区分「已包含的游戏 / 已排除的游戏 / 免费游戏」，已排除与免费游戏不参与计分，只做统计；
  - 实时输出每位成员的持有数、独占数、库占比与加权得分，并按得分自动排序。
- **多重防误判校验**：
  - 副本角标 × 归属人数交叉验证：角标显示多人时强制等待归属渲染完毕，绝不提前退出；
  - 浮层标题与目标卡片严格联动，杜绝读到上一张卡片的残留旧浮层；
  - 每张卡片识别后等待浮层彻底从 DOM 销毁再继续，杜绝串扰；
  - 超时兜底：多人游戏识别失败时自动补充占位成员，绝不产生虚假独占。
- **完整 Pointer + Mouse 真实事件链**：派发完整的 `pointerover → pointerenter → mouseover → mouseenter → pointermove → mousemove` 及对应的离场事件链，稳定触发 React 合成事件。
- **一键 CSV 导出**：导出全部游戏的 AppID、名称、分类状态、库存副本数与归属成员明细（带 BOM，Excel 直接打开不乱码）。

---

## 📦 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展（Violentmonkey / Greasemonkey / [脚本猫](https://docs.scriptcat.org/docs/use/use/) 亦可）；
2. 通过以下任一方式安装本脚本：
   - **Greasy Fork 在线安装**（推荐，自动更新）：[Steam 家庭库统计 - Greasy Fork](https://greasyfork.org/zh-CN/scripts/603252)；
   - **ScriptCat 在线安装**：[Steam 家庭库统计 - ScriptCat](https://scriptcat.org/zh-CN/script-show-page/8842)；
   - **GitHub 直装**：[steam-family-library-stats.user.js](https://github.com/BYWled/steam-family-library-stats/raw/main/steam-family-library-stats.user.js)；
   - **Gitee 镜像直装**：[steam-family-library-stats.user.js](https://gitee.com/BYWled/steam-family-library-stats/raw/main/steam-family-library-stats.user.js)（国内网络推荐）。

> 🔄 **自动同步机制**：仓库已配置 GitHub WebHook → Greasy Fork / ScriptCat 自动更新，推送到 GitHub 的脚本新版本将自动发布至两个脚本站；GitCode 仓库由 GitHub 自动镜像，Gitee 镜像随本地推送同步。

---

## 🎮 使用说明

1. 打开 Steam 家庭管理页：[账户详情 → 家庭管理](https://store.steampowered.com/account/familymanagement)（需已加入或创建 Steam 家庭）；
2. 页面右下角会出现「🎮 Steam 家庭库统计」悬浮面板；
3. 点击「🚀 全自动扫描」，脚本将自动滚动并逐个识别游戏归属；
   - ⚠️ 扫描期间请勿移动鼠标或切换标签页，以免干扰浮层识别；
4. 扫描完成后，面板将展示全部成员的持有数、独占数、占比与得分排行；
5. 点击「💾 导出 CSV」即可保存完整明细。

---

## 💡 计分规则

| 共有人数 | 1 | 2 | 3 | 4 | 5 | ≥6 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 单款权重 | 3.0 | 2.6 | 2.2 | 1.8 | 1.4 | 1.0 |

- **线性权重公式**：`权重 = 3.4 − 0.4 × 共有人数`，下限 1 分，四舍五入保留两位小数；
- **设计理念**：独占游戏贡献最大（3 分），共享人数越多单款权重越低（6 人共有 1 分），体现「稀缺性价值」；
- **不计分项**：「已排除的游戏」与「免费游戏」仅在面板中统计数量，不参与成员计分；
- **成员指标**：持有（该成员可玩的计分游戏数）、独占（仅该成员拥有的游戏数）、占比（持有数 / 计分库总数）、得分（全部可玩游戏权重之和）。

---

## ⚠️ 注意事项

- 脚本通过解析 Steam 页面**简体中文文案**（如「来自 xx 的库」「以下成员」「您」）进行归属识别，请确保 Steam 商店语言为简体中文；
- Steam 家庭管理页面的前端类名经过 CSS-Module 混淆且可能随版本更新变化，若 Steam 大改版导致脚本失效，欢迎提交 [Issue](https://github.com/BYWled/steam-family-library-stats/issues)；
- 扫描速度为识别稳定性做了保守设计，大型家庭库（上千款游戏）完整扫描约需数分钟；
- 本脚本仅在本地页面内运行，不发起任何网络请求、不上传任何数据。

---

## 📄 开源许可

本项目遵循 [GPL-3.0 License](LICENSE) 开源协议。
