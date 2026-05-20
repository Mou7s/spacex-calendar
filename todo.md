# SpaceX Calendar Todo List

这个 Todo 列表总结了当前项目在日历稳定性、系统健壮性、用户体验以及测试完备性方面的潜在问题与优化方向。

---

## 🚀 P0 - 核心日历与接口稳定性

### [x] 1. 修复 ICS 订阅中 `SEQUENCE` 和 `DTSTAMP` 的高频变动问题
- **描述**: 当前 `DTSTAMP`、`LAST-MODIFIED` 和 `SEQUENCE` 均绑定至 `data.refreshedAt`，导致每次 KV 缓存刷新（每 5 分钟）日历文件中的所有事件版本均发生改变。这会导致日历客户端（如 Apple Calendar）认为所有事件被修改，触发无意义的频繁同步。
- **改动范围**: `src/lib/spacex.js` 的 `buildCalendarFeed` 和 `buildCalendarEvent`
- **验收标准**:
  - `SEQUENCE` 仅在任务的核心属性（如发射时间 `launchAt`）发生实质改变时增加，或在无状态下基于关键时间/地点的 Hash 保持稳定。
  - `DTSTAMP` 和 `LAST-MODIFIED` 不随生成时间频繁变动，使用稳定的发射时间 `launchAt` 或任务的首发时间作为 fallback。
  - 运行 `npm test` 通过，且 ICS 输出保持稳定。

### [x] 2. 引入上游 API 的容灾与优雅降级机制
- **描述**: `Promise.all` 强耦合了 tiles 和 timings 两个上游数据源。一旦 Azure Edge CDN（timings）出现短暂波动，整个接口就会直接报错 502。
- **改动范围**: `src/lib/spacex.js` 中的 `loadLaunchData`
- **验收标准**:
  - 当 `TIMINGS_URL` 失败时，程序能够优雅降级，允许仅依赖 `CONTENT_URL` 里的粗略发射计划（或通过最近一次成功数据）渲染，而不直接报 502。
### [x] 3. 实现 KV 过期缓存灾备（Stale-While-Revalidate）
- **描述**: 当前 KV 缓存过期后，第一个请求会同步拉取上游接口。如果上游超时或不可用，该请求直接返回 502。
- **改动范围**: `src/index.js`
- **验收标准**:
  - 实施 "Stale-While-Revalidate" 策略，或者在 fetch 上游发生异常时，尝试读取 KV 中已过期的历史缓存数据作为降级返回，确保订阅服务不中断。

---

## 🎨 P1 - 用户体验与交互优化

### [x] 4. 实现 Mini Calendar（日历视图）与发射事件列表的点击联动
- **描述**: 目前在 Mini Calendar 中点击带有发射标记的日期没有任何交互反应，用户无法通过点击日历快速定位事件。
- **改动范围**: `public/app.js`, `public/styles.css`
- **验收标准**:
  - 点击日历上的日期时，右侧事件列表自动平滑滚动（scrollIntoView）到该日期的任务卡片。
  - 触发被定位卡片的短暂高亮视觉反馈（利用已有的 `highlightMissionCard` 方法）。

### [x] 5. 前端引入手动时区选择器 (Timezone Selector)
- **描述**: 网页端完全依赖浏览器本地时区，跨国关注发射的用户希望能自由切换 UTC 或发射场当地时间（东部时间 ET / 西部时间 PT）。
- **改动范围**: `public/index.html`, `public/app.js`, `public/styles.css`, `public/locales/*.json`
- **验收标准**:
  - 在页面合适位置增加轻量级的时区切换控件。
  - 切换时区仅改变前端网页的发射时间展示，不改变 `.ics` 日历文件中的 UTC 绝对时间。

---

## ⚙️ P2 - 国际化与测试完备性

### [ ] 6. 完善国际化 (i18n) 语言支持与回退逻辑
- **描述**: 当前 `locales` 目录下有多国语言包，但 `i18n.js` 中硬编码了 `defaultSupportedLocales = ["zh-CN", "en"]`。如果 `supported.json` 拉取失败，其他语言（德、法、日、韩、西）将无法被正常识别。
- **改动范围**: `public/i18n.js`, `public/app.js`
- **验收标准**:
  - 规范化支持 the supported 语言列表，即使接口或资源加载遇到异常，也能正确按预设规则安全回退到英文。

### [ ] 7. 补齐 Playwright 端到端 (E2E) 测试
- **描述**: 目前只有单元测试和 JSDOM 内存模拟测试，缺乏真实浏览器环境的端到端交互验证（如语言切换、日历翻页、时区切换等）。
- **改动范围**: 新增 `test/e2e` 测试套件，配置 `playwright`
- **验收标准**:
  - 本地和 CI 环境能够一键运行 E2E 测试，验证页面核心交互通路无回归风险。
