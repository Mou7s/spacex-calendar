# AI 智能体开发守则 (AGENTS)

## 项目概述
本仓库包含一个基于 **Nuxt 4** + **Nuxt Hub** + **Cloudflare Pages** 构建的现代化全栈 Web 应用。它能够将 SpaceX 官网的实时发射数据转换为符合 RFC 5545 标准的 **ICS 订阅日历**，同时提供一个高颜值的多语言订阅落地页。

## 核心架构
项目已从早期的 Cloudflare Worker 单文件架构升级为现代化的 Nuxt 4 文件树结构：
- **前端应用层 (`app/`)**：处理客户端渲染、路由、多语言及交互。
  - `app/pages/index.vue`：日历订阅主落地页。
- **服务端接口层 (`server/`)**：基于 Nitro Engine 处理边缘计算路由与数据逻辑。
  - `server/routes/spacex.ics.js` 与 `calendar.ics.js`：生成 ICS 订阅数据源。
  - `server/api/launches.get.js`：获取即将发射任务的 JSON 接口。
  - `server/utils/spacex.js`：核心发射数据拉取、数据标准化与 ICS 序列化逻辑。
  - `server/utils/kv.js`：基于 Nuxt Hub KV 的 SWR（后台异步刷新缓存）及版本追踪逻辑。

## ⚠️ 工作红线与守则
- **保持 ICS 订阅源的极端稳定**：
  - **绝对禁止修改 `UID` 生成算法**（即 `UID:${mission.correlationId || mission.id}@spacexcalendar.local`），除非有非常明确且经过批准的迁移理由，否则这会导致已有用户的日历客户端中出现大量重复日程。
  - 必须保留 `/spacex.ics` 路由的 `text/calendar` 响应头行为。
- **保持轻量化与边缘计算友好**：
  - 除非绝对必要，否则尽量使用原生浏览器 API 和轻量依赖，避免随意引入臃肿的 npm 第三方依赖库。
- **数据源保护**：
  - 除非 SpaceX 官方变更了数据提供端点，否则请保留现有的双源数据拉取与优雅降级机制。
- **多语言开发**：
  - 凡是修改前端页面上的任何文案、词条或说明，**必须同时**更新中文（`zh-CN.json`）和英文（`en.json`）的翻译包。

## 🧪 验证与测试
在完成任何代码修改并交付前，必须在终端执行以下检查：

1. **运行系统单元测试**（测试覆盖了数据降级、ICS 文本转义、SWR 缓存等核心功能）：
   ```bash
   npm test
   ```

2. **验证核心服务端/路由逻辑的语法正确性**：
   ```bash
   node --check server/routes/spacex.ics.js
   node --check server/utils/spacex.js
   ```

## ☁️ 部署与域名说明
- 本地开发与调试：`npm run dev`
- 生产环境部署：`npm run build` 配合 `npx wrangler deploy`
- 线上正式绑定的自定义子域名为：`spacex-calendar.mou7s.com`
