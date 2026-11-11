# AI 威胁情报站 · 微信小程序

复旦大学 JADE 团队「AI 安全观察」的微信小程序端，把 AI 安全事件、漏洞公告、攻击研究与原始来源整理成可离线浏览的情报列表、日报 / 周报和来源库。

本仓库是**小程序工程**；内容与构建的唯一来源是公开的主仓库 [28H2O2/ai-security-observer](https://github.com/28H2O2/ai-security-observer)。两个仓库平级摆放、各自独立，主仓库不因小程序改动而变化。本仓库为私有仓库。

## 与主仓库的关系

| | 主仓库 `ai-security-observer`（公开） | 本仓库 `ai-security-observer-miniprogram`（私有） |
|---|---|---|
| 定位 | 内容源 + 静态阅读站 | 小程序视图 + 打包数据 |
| 技术 | 无框架静态 SPA，Node 构建脚本 | 微信原生小程序（WXML / WXSS / `Page()`），无第三方依赖 |
| 内容 | `content/*.json` 人工整理、`dist/data/*.json` 构建产物 | `data/*.js`，从主仓库产物生成的 CommonJS 快照 |
| 更新 | 编辑 `content/` 后 `npm run build` | 同步快照、重新生成列表页，然后提交并发版 |

数据流向：

```
content/*.json                          （主仓库，人工维护）
  → npm run build                       （主仓库，生成 dist/data/*.json）
  → node scripts/sync-data.mjs          （本仓库，生成 data/*.js）
  → node scripts/build-pages.mjs        （本仓库，从模板生成列表页）
  → 小程序页面
```

小程序站点名与主仓库不同，`scripts/sync-data.mjs` 中的 `SITE_TITLE` 常量会在生成快照时覆盖 `meta.title`，因此同步数据不会把主仓库的旧站名带回来。

## 当前快照

- 数据版本 **0.4.1**，资料更新至 **2026-11-10**：103 条资料、27 个来源，ASO 评分 82 条已评分 / 10 条证据不足 / 11 条不适用。
- 日 / 周简报、评分覆盖表随快照一起打包；主包约 **0.56 MB**，远低于 2 MB 限制。
- **纯本地静态数据**：没有后端、登录或 `wx.request`；已读状态只存在本机 `wx.setStorageSync`。代际代价是内容更新必须重新同步数据并发新版，无法只更新数据。

内容口径、核验记录与 ASO 评分规则以主仓库为准： [主仓库 README](https://github.com/28H2O2/ai-security-observer#readme) · [ASO Risk Score 规范](https://github.com/28H2O2/ai-security-observer/blob/main/docs/aso-risk-score.md)。

## 目录结构

```
ai-security-observer-miniprogram/
├── app.json / app.js / app.wxss      全局配置、入口、调色板与语义规则
├── pages/                            8 个页面
│   ├── index / incidents / research   列表页（由脚本生成，勿直接编辑）
│   ├── briefings / sources            简报、来源库
│   └── item / risk-rules / about      详情、评分规则、来源与核验说明
├── templates/feed.wxml|wxss         三个列表页的唯一模板源
├── utils/                           纯逻辑：筛选、评分、简报、导出、卡片预计算
├── data/                            本地静态快照（CommonJS，必须随仓库提交）
├── assets/jade-logo.png
├── scripts/
│   ├── sync-data.mjs                 从主仓库 dist/data 生成 data/*.js
│   └── build-pages.mjs               把模板内联进三个列表页
└── project.config.json / sitemap.json
```

### 页面结构

- 底部 tabBar 只有 **3 个功能型入口**：情报 / 简报 / 来源。
- 「全部情报 / 真实事件 / 研究披露」是情报页顶部的页内文字切换，不跳页；`pages/incidents` 与 `pages/research` 仍注册为普通页，供分享和深链落地。
- 搜索与高级筛选收进品牌行右侧的放大镜图标，点开浮出卡片；主题标签保留在首屏。

## 常用命令

前提：Node.js 22+（脚本使用 ESM 与 `node:` 前缀）；两个仓库位于同一父目录下。本仓库**没有 `package.json`，无需 `npm install`**。

```bash
# 1. 主仓库内容有更新时，先重建数据
cd ../ai-security-observer && npm run build

# 2. 回到小程序仓库同步快照
cd ../ai-security-observer-miniprogram
node scripts/sync-data.mjs

# 3. 改过 templates/feed.* 或 utils/feed.js 后，重新生成三个列表页
node scripts/build-pages.mjs
```

`build-pages.mjs` 依赖 `data/items.js` 的元信息，所以顺序是 2 → 3。内容更新的完整流程为：改 `content/` → 主仓库 `npm run build` → `sync-data.mjs` → `build-pages.mjs` → 提交本仓库并发版。

> **列表页不要手改。** `pages/index`、`pages/incidents`、`pages/research` 的 `.wxml` / `.wxss` / `.js` 都由 `templates/feed.*` 内联生成，直接编辑会在下次运行脚本时被覆盖。

## 设计约定

- **8 色，仅一个有彩色**：纸色灰阶 + 朱红 `#a83d30`。朱红只表达「当前选中 / 真实发生的攻击事件 / 高风险 / 可点击操作」，其余类型与等级一律中性灰。调色板与语义规则写在 `app.wxss` 顶部注释，静态检查会拦截越界颜色（含 JSON 配置中的色值）。
- **页面必须自包含**：部分 H5 预览器不展开 WXML `<include>` 与 WXSS `@import`，会让页面整片空白，所以列表页由脚本内联生成，不使用模板引用。
- **WXML 只做简单变量绑定**：三元表达式、动态 class、状态文案一律由 `utils/feed.js` 预计算；`app.js` 与列表页 JS 带 try/catch 兜底，加载失败时显示可见错误态而不是白屏。
- 从网页项目迁移时做的适配：外部原文链接改为「复制链接」；`Blob` 下载改为复制到剪贴板；SVG 来源关系图改为分类列表；已读状态改为本地缓存。

改动后建议复核：严格 JSON、页面与 tabBar 注册、`require` / `include` / `@import` 引用、三个列表页与模板完全一致、调色板仅 8 色；再做三视图冒烟（103 / 30 / 73 条、搜索、浮层开关、重置、返回）。仓库目前没有封装测试命令。

## 预览与发布

- **本地调试**：用微信开发者工具导入本仓库根目录即可编译、模拟器与真机预览。`project.config.json` 里的 `appid` 目前是 `touristappid`，IDE 会拒绝打开，需要换成真实 AppID。
- **应用卡预览与发布**：在 WorkBuddy 中打开小程序应用卡预览；预览面板右上角「分享 / Share」可试用小程序或绑定已有账号，之后发布体验版、提交审核。不需要在开发者工具里手工上传。
- 微信侧的正式名称（需唯一）、小程序备案与服务类目由账号管理员在绑定时完成，代码里的 `navigationBarTitleText` 与首屏品牌名只影响显示。

## 已知限制

- 已通过静态检查、纯逻辑冒烟与 WorkBuddy 应用卡 H5 预览；**微信原生编译、模拟器与真机预览尚未执行**，预览正常不等于原生编译通过。
- 无实时采集：资料更新需要重新同步数据并发版。
- `data/*.js` 是运行必需，已明确不写入 `.gitignore`；`project.private.config.json`（可能含个人 AppID）与 `.workbuddy/` 元数据不纳入版本库。

## 维护

内容、评分与核验记录见[主仓库](https://github.com/28H2O2/ai-security-observer)，由复旦大学 JADE 团队维护。本仓库只负责小程序端的视图与打包流程。
