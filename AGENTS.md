# AI 智能体开发守则 (AGENTS)

## 📌 项目概述
本仓库包含一个基于 **Nuxt 4** + **Nuxt Hub** + **Cloudflare Pages** 构建的现代化全栈 Web 应用。它能够将 SpaceX 官网的实时发射数据转换为符合 RFC 5545 标准的 **ICS 订阅日历**，同时提供一个具备极致视觉美感的多语言订阅落地页。

---

## 🏗️ 核心架构与文件树说明
项目已完全迁移至现代化的 Nuxt 4 文件树结构，采用前后端同构的边缘计算友好型架构：

### 1. 前端应用层 (`app/`)
处理客户端渲染、路由、多语言响应式界面与微交互。
- **`app/pages/index.vue`**：全站核心落地页。集成 i18n 多语言无前缀路由、SEO 元数据以及 JSON-LD 谷歌结构化数据（包含 `WebPage`、`FAQPage`、`Event` 复合 Schema 注入）。
- **`app/app.vue`**：页面级视图挂载主入口。
- **`app/app.config.ts`**：Nuxt UI 全局视觉主题配色配置文件（主色调调优为 `primary: 'blue'`）。
- **`app/components/`**：高度封装的交互式组件库：
  - `AppHeader.vue`：顶部磨砂玻璃导航栏与品牌展示。
  - `HeroSection.vue`：首屏高能背景图、实时发射倒计时及核心概念介绍。
  - `OverviewGrid.vue`：项目核心功能/优势的多维网格卡片展示。
  - `LaunchCalendar.vue`：核心日历交互组件。包含迷你日历网格、今日聚焦以及带微动画的发射事件时间轴。
  - `MissionDetail.vue`：任务深度详情卡片。支持高清发射图文图解预览、Lightbox 弹窗模态层及一键自适应比例/滚动双击缩放查看大图。
  - `SubscribePanel.vue`：快捷日历订阅面板，提供 `webcal://` 一键订阅及 ICS 链接复制功能。
  - `FaqSection.vue`：支持折叠展开的常见问题解答，深度适配 SEO 结构化数据锚点。

### 2. 服务端接口层 (`server/`)
基于 Nitro Engine 驱动的超轻量、无状态边缘计算路由逻辑。
- **`server/routes/spacex.ics.js`**：生成符合 RFC 5545 标准的 ICS 订阅数据源的主路由。
- **`server/routes/calendar.ics.js`**：日历订阅路由的备用别名路由。
- **`server/api/launches.get.js`**：聚合即将发射任务列表的 JSON API（对接 SWR 缓存）。
- **`server/api/history-launches.get.js`**：拉取并格式化历史已完成发射任务的 API（限制 50 条）。
- **`server/api/launches/[slug].get.js`**：动态路由接口，按 Slug 获取特定发射任务的超高清图解及深度内容详情。
- **`server/utils/spacex.js`**：核心后端数据处理库。包含双源 API 拉取（GraphQL Page Tiles + TIMING JSON）、格式标准化、历史发射适配、超高清图解数据解析及 ICS 标准格式序列化（处理安全换行与字符转义）。
- **`server/utils/kv.js`**：基于 **Nuxt Hub KV** (Cloudflare KV) 封装的 **SWR (Stale-While-Revalidate)** 后台异步刷新缓存控制器。支持分布式版本 Sequence 自增追踪与 `LAST-MODIFIED` 时间锁。

---

## ⚠️ 工作红线与开发守则

### 1. 保持 ICS 订阅源的绝对稳定
* **严禁修改 `UID` 生成算法**：唯一标识符生成逻辑必须严格锁定为 `UID:${mission.correlationId || mission.id}@spacexcalendar.local`。**绝对禁止擅自修改**，否则将导致所有订阅用户的日历客户端中瞬间涌现出大量重复的旧日程。
* **锁定 Content-Type 与响应头**：`/spacex.ics` 路由返回的数据必须带有 `text/calendar; charset=utf-8` 以及标准的 `Content-Disposition: inline; filename="spacex-launches.ics"` 响应头。
* **序列化安全过滤**：所有 ICS 输出字段（`SUMMARY`、`DESCRIPTION`、`LOCATION` 等）必须通过 `escapeIcsText` 过滤，严格执行 RFC 5545 换行与特定特殊字符的转义规则。

### 2. 直播任务保活逻辑（Live Missions Preservation）
* **当任务处于 live-streaming 直播进行状态时**（即 `mission.isLive === true`），即使其预定的发射时间 `launchAt` 已成为过去时，**必须**将其在 upcoming 列表和 `.ics` 日历数据源中予以保留（在 `isFutureMission` 函数中进行保活判断）。这能确保用户即使在任务发射开始后，仍能通过日历和落地页顺畅地跳转到官方直播间。

### 3. 多语言（i18n）同步规范
* 全站原生集成 `@nuxtjs/i18n`，支持 7 种语言（简体中文 `zh-CN`、英语 `en`、日语 `ja`、韩语 `ko`、西班牙语 `es`、法语 `fr`、德语 `de`）。
* **重要红线**：凡是修改或新增前端页面上的任何文案、词条或说明，**必须同时**更新中文（`zh-CN.json`）和英文（`en.json`）的翻译包，并推荐运行自动翻译脚本以同步其余语言：
  ```bash
  export OPENAI_API_KEY="your-key"
  npm run translate:locales -- --locales=ja,ko,es,fr,de
  ```

### 4. SEO、组件 ID 与无障碍规范
* **自动化测试组件锚点**：核心可交互的组件及主要区块，必须配备清晰且唯一的 `id` 属性，以提供给 E2E 浏览器自动化测试框架以及 SEO 路由锚点使用。
* **结构化数据**：严防破坏 index 页面顶部的 Google 结构化 JSON-LD Schema 生成逻辑。

### 5. 保持轻量与边缘友好
* 运行在 Cloudflare Workers/Pages 边缘环境，内存及包体积受限。**切勿随意引入臃肿的第三方 npm 依赖库**。渲染高性能图片时可引入 `@nuxt/image`，但需兼顾原生 HTML 图像加载机制。

---

## 🧪 验证与测试流程
在提代码更改并交付部署之前，**必须**依次运行并确认以下所有检查全部通过：

### 1. 运行完整单元测试
项目内置了 **18** 项全面的单元测试，覆盖了数据源合并、优雅降级、ICS 文本转义、SWR 异步刷新、直播保活以及特定动态路由 API 校验。
```bash
npm test
```

### 2. 服务端语法/静态分析预校验
利用 Node.js 静态分析引擎快速验证关键边缘逻辑文件的语法正确性：
```bash
node --check server/routes/spacex.ics.js
node --check server/utils/spacex.js
node --check server/utils/kv.js
```

---

## ☁️ 本地调试与部署说明
* **本地开发**：`npm run dev`（服务跑在 `http://localhost:3000`）。
* **生产打包**：`npm run build`
* **边缘部署**：结合 `npx wrangler deploy` 或通过 Nuxt Hub 平台绑定 GitHub 自动集成构建。
* **生产子域名**：线上主域名已稳定绑定为 `spacex-calendar.mou7s.com`。
